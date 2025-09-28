import "dotenv/config";
import { query } from "./db";
import axios from "axios";
import { decryptToken } from "./crypto";
import {
  Commit,
  FilteredCommitSummary,
  Stage1Result,
  ChangelogJob,
} from "./types";
import { runStage1 } from "./stage1";
import { CommitWithSummary } from "./types";
import {
  extractCommitShas,
  appendJobLog,
  updateJobStatus,
  buildStage1JobLog,
  buildOutputData,
  fetchCommitDetails,
  buildStage2JobLog,
  saveOutputAndFinal,
  saveChangelogTitle,
} from "./stage-utils";
import { runStage2 } from "./stage2";
import { runStage3 } from "./stage3";
import { runStage4 } from "./stage4";

export const handler = async (
  event: any
): Promise<{ status: string; output_file?: string }> => {
  try {
    const eventData =
      typeof event === "string" ? JSON.parse(event) : event || {};
    const records = eventData.Records || [];

    if (records.length === 0) {
      throw new Error("No records found in event");
    }

    const firstRecord = records[0];
    const messageBody = firstRecord;
    const jobId =
      typeof messageBody?.body === "string"
        ? messageBody.body.trim()
        : undefined;

    console.log("Job ID:", jobId);
    console.log("Event Data:", eventData);
    console.log("Record Body:", messageBody?.body);

    if (!jobId) {
      throw new Error("No jobId provided in record body");
    }

    // let jobId = "77bbf518-1d94-4c62-8421-19ef2f59e631";

    console.log(`Processing changelog job: ${jobId}`);

    const jobResult = await query("SELECT * FROM changelog_job WHERE id = $1", [
      jobId,
    ]);

    if (jobResult.rows.length === 0) {
      throw new Error(`Job with ID ${jobId} not found`);
    }

    const job: ChangelogJob = jobResult.rows[0];
    console.log(`Fetched job: ${job.repo_full_name}`);

    const encryptedToken = job.github_token;
    const selectedCommits: Commit[] = job.selected_commits || [];

    if (!encryptedToken) {
      throw new Error("No GitHub token found for this job");
    }

    let githubToken: string;
    try {
      githubToken = decryptToken(encryptedToken);
      console.log("Token decrypted successfully");
    } catch (error) {
      console.error("Failed to decrypt token:", error);
      throw new Error("Failed to decrypt GitHub token");
    }

    const { valid: commitShas, invalid } = extractCommitShas(selectedCommits);
    if (commitShas.length === 0) {
      throw new Error("No valid commit SHAs provided for Stage1 processing");
    }

    if (invalid.length) {
      console.warn(`Skipping invalid commit entries: ${invalid.join(", ")}`);
      await appendJobLog(jobId, {
        stage: "stage0",
        event: "invalid_commit_shas_filtered",
        timestamp: new Date().toISOString(),
        invalid,
      });
    }

    await updateJobStatus(jobId, "processing");

    let stage1Result: Stage1Result;
    try {
      stage1Result = await runStage1({
        owner: job.repo_owner,
        repo: job.repo_name,
        token: githubToken,
        commitShas,
      });
    } catch (error) {
      await appendJobLog(jobId, {
        stage: "stage1",
        event: "failed",
        timestamp: new Date().toISOString(),
        message: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }

    await appendJobLog(jobId, buildStage1JobLog(stage1Result));

    const stage1Summaries = new Map<string, FilteredCommitSummary>(
      stage1Result.commitsForProcessing.map((commit) => [commit.sha, commit])
    );

    const commitsToProcess = stage1Result.commitsForProcessing.map(
      (commit) => commit.sha
    );

    if (commitsToProcess.length === 0) {
      console.log(
        "Stage1 filtered out all commits. No further processing needed."
      );

      const outputData = buildOutputData(job, stage1Result, commitShas.length);
      console.log("Changelog data:", JSON.stringify(outputData, null, 2));

      await updateJobStatus(jobId, "completed");
      return { status: "completed" };
    }

    console.log(
      `Stage1 retained ${commitsToProcess.length} commits (from ${commitShas.length}). Proceeding with commit detail fetch.`
    );

    const allCommitData: CommitWithSummary[] = [];
    const batchSize = 5;

    for (let i = 0; i < commitsToProcess.length; i += batchSize) {
      const batch = commitsToProcess.slice(i, i + batchSize);
      console.log(
        `Processing batch ${Math.floor(i / batchSize) + 1} with ${batch.length} commits`
      );

      const batchPromises = batch.map(async (commitSha) => {
        if (!commitSha) {
          console.warn("Skipping commit without SHA");
          return null;
        }

        try {
          const commitDetails = await fetchCommitDetails(
            job.repo_owner,
            job.repo_name,
            commitSha,
            githubToken
          );
          const summary = stage1Summaries.get(commitSha);
          if (!summary) {
            console.warn(
              `Summary not found for commit ${commitSha}, skipping.`
            );
            return null;
          }
          return { summary, details: commitDetails };
        } catch (error) {
          console.error(`Error fetching commit ${commitSha}:`, error);
          await appendJobLog(jobId, {
            stage: "stage2",
            event: "commit_fetch_failed",
            timestamp: new Date().toISOString(),
            sha: commitSha,
            message: error instanceof Error ? error.message : String(error),
          });
          return null;
        }
      });

      const batchResults = await Promise.all(batchPromises);
      const validResults = batchResults.filter(
        (result): result is CommitWithSummary => result !== null
      );

      allCommitData.push(...validResults);

      if (i + batchSize < commitsToProcess.length) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }

    // Stage 2: Parallel commit processing focusing on user-facing impact
    let stage2Result;
    try {
      stage2Result = await runStage2({ commits: allCommitData });
      await appendJobLog(jobId, buildStage2JobLog(stage2Result));
    } catch (error) {
      await appendJobLog(jobId, {
        stage: "stage2",
        event: "failed",
        timestamp: new Date().toISOString(),
        message: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }

    // (defer stage_result persistence until the end)

    // Stage 3: Smart summarization into categories + executive summary
    let stage3Result;
    try {
      stage3Result = await runStage3({ commits: stage2Result.commitResults });
      await appendJobLog(jobId, {
        stage: "stage3",
        event: "completed",
        timestamp: new Date().toISOString(),
        metrics: stage3Result.metrics,
      });
    } catch (error) {
      await appendJobLog(jobId, {
        stage: "stage3",
        event: "failed",
        timestamp: new Date().toISOString(),
        message: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }

    // (defer stage_result persistence until the end)

    // Stage 4: Final changelog assembly (markdown)
    let stage4Result;
    try {
      const contributors: string[] = Array.from(
        new Set(
          allCommitData
            .map((c) => c.summary.authorLogin || c.details.commit.author.name)
            .filter(Boolean)
        )
      ) as string[];
      stage4Result = await runStage4({
        stage3: stage3Result,
        metadata: {
          version: undefined,
          totalCommits: stage1Result.metrics.totalRetained,
          contributors,
          dateRange: {
            from: job.date_range_start,
            to: job.date_range_end,
          },
        },
      });
      await appendJobLog(jobId, {
        stage: "stage4",
        event: "completed",
        timestamp: new Date().toISOString(),
        length: stage4Result.markdown.length,
      });
    } catch (error) {
      await appendJobLog(jobId, {
        stage: "stage4",
        event: "failed",
        timestamp: new Date().toISOString(),
        message: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }

    // Persist both outputs in a single SQL UPDATE
    try {
      const outputData = buildOutputData(
        job,
        stage1Result,
        commitShas.length,
        stage2Result,
        stage3Result,
        stage4Result
      );
      await saveOutputAndFinal(jobId, outputData, stage4Result);
      // Save changelog title separately
      await saveChangelogTitle(jobId, stage4Result.changelogTitle);
    } catch (error) {
      console.warn("Failed to persist output/final results", error);
    }

    console.log("Changelog data saved");

    await updateJobStatus(jobId, "completed");

    return { status: "completed" };
  } catch (error) {
    console.error("Watcher Lambda Error:", error);

    if (error && typeof error === "object" && "jobId" in error) {
      try {
        await query(
          "UPDATE changelog_job SET status = 'failed', logs = array_append(logs, $2), updated_at = NOW() WHERE id = $1",
          [(error as any).jobId, (error as any).message || String(error)]
        );
      } catch (updateError) {
        console.error("Error updating job status:", updateError);
      }
    }

    throw error;
  }
};

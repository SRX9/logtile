import axios from "axios";
import { Stage1Result } from "./types";
import { Stage2Result } from "./types";
import { Stage3Result, Stage4Result } from "./types";
import { query } from "./db";
import { ChangelogJob } from "./types";
import { CommitWithSummary } from "./types";
import { CommitDetails } from "./types";

export function buildStage1JobLog(stage1Result: Stage1Result) {
  const timestamp = new Date().toISOString();
  return {
    stage: "stage1",
    event: "completed",
    timestamp,
    metrics: stage1Result.metrics,
    skippedCount: stage1Result.skippedCommits.length,
    retainedCount: stage1Result.commitsForProcessing.length,
    logTail: stage1Result.logs.slice(-5),
    skippedSample: stage1Result.skippedCommits.slice(0, 5),
  };
}

export function buildOutputData(
  job: ChangelogJob,
  stage1Result: Stage1Result,
  totalSelected: number,
  stage2Result?: Stage2Result,
  stage3Result?: Stage3Result,
  stage4Result?: Stage4Result
) {
  return {
    job: {
      id: job.id,
      repository: job.repo_full_name,
      user_id: job.user_id,
      status: job.status,
      created_at: job.created_at,
    },
    stage1: {
      metrics: stage1Result.metrics,
      logs: stage1Result.logs,
      groupedCommits: stage1Result.groupedCommits,
      skippedCommits: stage1Result.skippedCommits,
    },
    stage2: stage2Result
      ? {
          strategy: stage2Result.strategy,
          metrics: stage2Result.metrics,
          commitResults: stage2Result.commitResults,
        }
      : undefined,
    stage3: stage3Result
      ? {
          metrics: stage3Result.metrics,
          categories: stage3Result.categories,
          executiveSummary: stage3Result.executiveSummary,
        }
      : undefined,
    stage4: stage4Result
      ? {
          markdown: stage4Result.markdown,
          metrics: stage4Result.metrics,
        }
      : undefined,
    totals: {
      total_commits_processed: stage1Result.commitsForProcessing.length,
      total_commits_selected: totalSelected,
      total_commits_after_stage1: stage1Result.commitsForProcessing.length,
      total_skipped_stage1: stage1Result.skippedCommits.length,
    },
    generated_at: new Date().toISOString(),
  };
}

export function buildStage2JobLog(stage2: Stage2Result) {
  const timestamp = new Date().toISOString();
  return {
    stage: "stage2",
    event: "completed",
    timestamp,
    strategy: stage2.strategy,
    metrics: stage2.metrics,
    resultCount: stage2.commitResults.length,
    logTail: stage2.logs.slice(-5),
  };
}

export function buildStage3JobLog(stage3: Stage3Result) {
  const timestamp = new Date().toISOString();
  return {
    stage: "stage3",
    event: "completed",
    timestamp,
    metrics: stage3.metrics,
    categories: Object.keys(stage3.categories),
    bullets: Object.values(stage3.categories).reduce((a, b) => a + b.length, 0),
  };
}

export function buildStage4JobLog(stage4: Stage4Result) {
  const timestamp = new Date().toISOString();
  return {
    stage: "stage4",
    event: "completed",
    timestamp,
    metrics: stage4.metrics,
    length: stage4.markdown.length,
  };
}

export async function updateJobStatus(jobId: string, status: string) {
  await query(
    "UPDATE changelog_job SET status = $2, updated_at = NOW() WHERE id = $1",
    [jobId, status]
  );
}

export async function appendJobLog(jobId: string, entry: unknown) {
  await query(
    "UPDATE changelog_job SET logs = logs || $2::jsonb, updated_at = NOW() WHERE id = $1",
    [jobId, JSON.stringify([entry])]
  );
}

export async function saveStageResult(jobId: string, result: unknown) {
  await query(
    "UPDATE changelog_job SET stage_result = $2::jsonb, updated_at = NOW() WHERE id = $1",
    [jobId, JSON.stringify(result)]
  );
}

export async function saveFinalChangelogResult(jobId: string, result: unknown) {
  await query(
    "UPDATE changelog_job SET final_changelog_result = $2::jsonb, updated_at = NOW() WHERE id = $1",
    [jobId, JSON.stringify(result)]
  );
}

export async function saveOutputAndFinal(
  jobId: string,
  outputData: unknown,
  finalResult: unknown
) {
  await query(
    "UPDATE changelog_job SET stage_result = $2::jsonb, final_changelog_result = $3::jsonb, updated_at = NOW() WHERE id = $1",
    [jobId, JSON.stringify(outputData), JSON.stringify(finalResult)]
  );
}

export function extractCommitShas(commits: any[]): {
  valid: string[];
  invalid: string[];
} {
  const valid = new Set<string>();
  const invalid: string[] = [];

  commits.forEach((commit) => {
    const sha = normalizeCommitSha(commit);
    if (sha && /^[a-f0-9]{40}$/i.test(sha)) {
      valid.add(sha.toLowerCase());
    } else if (sha) {
      invalid.push(sha);
    }
  });

  return { valid: Array.from(valid), invalid };
}

export function normalizeCommitSha(commit: any): string | null {
  if (!commit) {
    return null;
  }

  if (typeof commit === "string") {
    return commit;
  }

  if (typeof commit === "object") {
    if (typeof commit.sha === "string") {
      return commit.sha;
    }
    if (typeof commit.commit?.sha === "string") {
      return commit.commit.sha;
    }
  }

  return null;
}

export async function fetchCommitDetails(
  owner: string,
  repo: string,
  sha: string,
  token: string
): Promise<CommitDetails> {
  const url = `https://api.github.com/repos/${owner}/${repo}/commits/${sha}`;

  const response = await axios.get(url, {
    headers: {
      Authorization: `token ${token}`,
      Accept: "application/vnd.github.v3+json",
      "User-Agent": "ChangelogAI-Lambda/1.0",
    },
    timeout: 30000,
  });

  return response.data;
}

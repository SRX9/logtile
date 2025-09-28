import { useMemo } from "react";

import type { JobLogEntry } from "../types";

function formatStageLog(log: any) {
  const { stage, event, message, details, ...otherDetails } = log;
  const logDetails = details || otherDetails;
  const logMessage = message || `${stage}_${event}`;

  switch (logMessage) {
    case "stage1_started":
      return `Filtering Commits: Started processing ${
        logDetails.totalCommits || ""
      } selected commits.`;
    case "fetch_batch_started":
      return `Fetching Details: Getting more information for ${
        logDetails.batchSize || ""
      } commits.`;
    case "fetch_batch_completed":
      return `Fetching Details: Successfully retrieved information for ${
        logDetails.commitsFetched || ""
      } commits.`;
    case "stage1_metrics": {
      if (!logDetails.metrics) return "Filtering Commits: Analysis complete.";
      const { totalRetained, totalSkipped, reductionPercent } =
        logDetails.metrics;
      return `Filtering Commits: Analysis complete. Kept ${totalRetained} relevant commits and skipped ${totalSkipped} (${
        reductionPercent || 0
      }% reduction).`;
    }
    case "stage1_completed":
      return `Filtering Commits: Finished after ${Math.round(
        (logDetails.durationMs || 0) / 1000
      )}s.`;
    case "stage2_started":
      return `Analyzing Impact: Looking for user-facing changes in ${
        logDetails.totalCommits || ""
      } commits.`;
    case "stage2_completed":
      return `Analyzing Impact: Completed analysis of ${
        logDetails.analyzed || ""
      } commits in ${Math.round((logDetails.durationMs || 0) / 1000)}s.`;
    case "stage3_completed":
      return "Summarizing Changes: Generating summaries for each category.";
    case "stage4_completed":
      return "Assembling Changelog: The final changelog is ready.";
    case "failed":
      return `Error in ${stage}: ${logDetails.message}`;
    default:
      if (logMessage.includes("undefined")) return `Processing...`;
      return `Update: ${logMessage}`;
  }
}

export function LogMessage({ log }: { log: JobLogEntry }) {
  const content = useMemo(() => {
    try {
      const parsed = JSON.parse(log.message);
      if (Array.isArray(parsed)) {
        return parsed
          .map((item, index) => <div key={index}>{formatStageLog(item)}</div>)
          .reverse();
      }
      // Handle cases where the message is a stringified object
      if (typeof parsed === "object" && parsed !== null) {
        return formatStageLog(parsed);
      }
      return log.message;
    } catch (e) {
      if (log.message === "completed") {
        return "Changelog generation has successfully completed.";
      }
      return log.message;
    }
  }, [log.message]);

  return <>{content}</>;
}

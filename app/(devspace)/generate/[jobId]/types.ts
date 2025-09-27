export type JobStatus = "pending" | "processing" | "completed" | "failed";

export type CommitMetadata = {
  sha: string;
  message: string | null;
  committedAt: string | null;
  authorName: string | null;
  authorEmail: string | null;
  htmlUrl: string | null;
};

export type JobLogEntry = {
  timestamp: string;
  level: "info" | "error" | "warning";
  message: string;
};

export type FinalChangelogLogEntry = {
  level: "info" | "error" | "warning";
  message: string;
  timestamp: string;
  details?: Record<string, unknown> | null;
};

export type FinalChangelogMetrics = Record<string, number | null | undefined>;

export type FinalChangelogResult = {
  markdown?: string | null;
  logs?: FinalChangelogLogEntry[] | null;
  metrics?: FinalChangelogMetrics | null;
} | null;

export type JobDetails = {
  id: string;
  status: JobStatus;
  repo_name: string;
  repo_owner: string;
  repo_full_name: string;
  selected_commits: CommitMetadata[];
  logs: string[];
  date_range_start: string | null;
  date_range_end: string | null;
  created_at: string;
  updated_at: string;
  final_changelog_result?: FinalChangelogResult | string;
};

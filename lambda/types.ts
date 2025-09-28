export interface Commit {
  sha: string;
  node_id: string;
  commit: CommitMetadata;
  url: string;
  html_url: string;
  comments_url: string;
  author: GitUser;
  committer: GitUser;
  parents: ParentCommit[];
  stats: CommitStats;
  files: ChangedFile[];
}

export interface CommitMetadata {
  author: CommitPerson;
  committer: CommitPerson;
  message: string;
  tree: TreeRef;
  url: string;
  comment_count: number;
  verification: Verification;
}

export interface CommitPerson {
  name: string;
  email: string;
  date: string;
}

export interface TreeRef {
  sha: string;
  url: string;
}

export interface Verification {
  verified: boolean;
  reason: string;
  signature: string;
  payload: string;
  verified_at: string;
}

export interface GitUser {
  login: string;
  id: number;
  node_id: string;
  avatar_url: string;
  gravatar_id: string;
  url: string;
  html_url: string;
  followers_url: string;
  following_url: string;
  gists_url: string;
  starred_url: string;
  subscriptions_url: string;
  organizations_url: string;
  repos_url: string;
  events_url: string;
  received_events_url: string;
  type: string;
  user_view_type: string;
  site_admin: boolean;
}

export interface ParentCommit {
  sha: string;
  url: string;
  html_url: string;
}

export interface CommitStats {
  total: number;
  additions: number;
  deletions: number;
}

export interface ChangedFile {
  sha: string;
  filename: string;
  status: string;
  additions: number;
  deletions: number;
  changes: number;
  blob_url: string;
  raw_url: string;
  contents_url: string;
  patch: string;
}

export type CommitCategory =
  | "features"
  | "fixes"
  | "breaking"
  | "performance"
  | "security"
  | "other";

export interface BasicCommitSummary {
  sha: string;
  message: string;
  headline: string;
  authorName?: string;
  authorEmail?: string;
  authorLogin?: string;
  authorIsBot: boolean;
  committerName?: string;
  committerEmail?: string;
  committerLogin?: string;
  committedDate: string;
  authoredDate: string;
  additions: number;
  deletions: number;
  totalChanges: number;
  filesChanged: number;
  parentCount: number;
}

export interface FilteredCommitSummary extends BasicCommitSummary {
  category: CommitCategory;
  importanceScore: number;
}

export interface Stage1SkippedCommit {
  sha: string;
  reasons: string[];
  message?: string;
  authorLogin?: string;
  committedDate?: string;
}

export interface Stage1Metrics {
  totalInput: number;
  totalRetained: number;
  totalSkipped: number;
  reductionPercent: number;
  groupingBreakdown: Record<CommitCategory, number>;
}

export interface Stage1Result {
  rawCommits: BasicCommitSummary[];
  commitsForProcessing: FilteredCommitSummary[];
  groupedCommits: Record<CommitCategory, FilteredCommitSummary[]>;
  skippedCommits: Stage1SkippedCommit[];
  metrics: Stage1Metrics;
  logs: Stage1AuditLogEntry[];
}

export interface Stage1Input {
  owner: string;
  repo: string;
  token: string;
  commitShas: string[];
  since?: string;
  until?: string;
  maxBatchSize?: number;
}

export interface Stage1AuditLogEntry {
  timestamp: string;
  level: "info" | "warn" | "error";
  message: string;
  details?: Record<string, unknown>;
}

export interface ChangelogJob {
  id: string;
  user_id: string;
  repository_id: string;
  repo_id: string;
  repo_name: string;
  repo_owner: string;
  repo_full_name: string;
  github_token: string;
  selected_commits: any[];
  status: string;
  logs: any[];
  date_range_start?: string;
  date_range_end?: string;
  created_at: string;
  updated_at: string;
}

export interface CommitDetails {
  sha: string;
  commit: {
    message: string;
    author: {
      name: string;
      email: string;
      date: string;
    };
    committer: {
      name: string;
      email: string;
      date: string;
    };
  };
  files?: Array<{
    filename: string;
    status: string;
    additions: number;
    deletions: number;
    changes: number;
    patch?: string;
  }>;
}

export interface CommitWithSummary {
  summary: FilteredCommitSummary;
  details: CommitDetails;
}

// -------------------------
// Stage 2 Types (Parallel Commit Processing)
// -------------------------

export type Stage2Strategy = "batch" | "tiered";

export type Stage2Tier = 1 | 2 | 3;

export interface UserFacingChange {
  type:
    | "feature"
    | "fix"
    | "breaking"
    | "performance"
    | "security"
    | "docs"
    | "other";
  scope?: string;
  description: string;
  impact: "high" | "medium" | "low";
  audiences?: Array<"end_user" | "developer" | "admin" | "api_client">;
  components?: string[];
  breaking?: boolean;
  deprecation?: boolean;
  technicalDetail?: string;
  migrationRequired?: boolean;
}

export interface Stage2CommitResult {
  sha: string;
  title: string;
  importanceScore: number;
  category: CommitCategory;
  tier: Stage2Tier;
  filesConsidered: string[];
  skippedFiles: string[];
  truncatedDiffLines?: number;
  analysisSummary?: string;
  userFacingChanges: UserFacingChange[];
  releaseNoteLine?: string;
  impact?: "high" | "medium" | "low";
  migrationRequired?: boolean;
}

export interface Stage2Metrics {
  totalCommits: number;
  tier1: number;
  tier2: number;
  tier3: number;
  llmCalls: number;
  batchedCalls: number;
  individualCalls: number;
  analyzedCommits: number;
  skippedNoLLM: number;
}

export interface Stage2AuditLogEntry {
  timestamp: string;
  level: "info" | "warn" | "error";
  message: string;
  details?: Record<string, unknown>;
}

export interface Stage2Result {
  strategy: Stage2Strategy;
  commitResults: Stage2CommitResult[];
  metrics: Stage2Metrics;
  logs: Stage2AuditLogEntry[];
}

export interface Stage2Input {
  commits: CommitWithSummary[];
}

// -------------------------
// Stage 3 Types (Smart Summarization)
// -------------------------

export interface Stage3Input {
  commits: Stage2CommitResult[];
}

export interface Stage3Metrics {
  totalCommits: number;
  categoriesPresent: Record<CommitCategory, number>;
  llmCalls: number;
  totalBullets: number;
}

export interface Stage3AuditLogEntry {
  timestamp: string;
  level: "info" | "warn" | "error";
  message: string;
  details?: Record<string, unknown>;
}

export interface Stage3Result {
  categories: Record<CommitCategory, string[]>; // bullet points per category
  executiveSummary: string[]; // 2-3 highlight sentences
  metrics: Stage3Metrics;
  logs: Stage3AuditLogEntry[];
}

// -------------------------
// Stage 4 Types (Final Assembly)
// -------------------------

export interface Stage4Metadata {
  version?: string;
  totalCommits: number;
  contributors: string[];
  dateRange?: { from?: string; to?: string };
}

export interface Stage4Input {
  stage3: Stage3Result;
  metadata: Stage4Metadata;
}

export interface Stage4AuditLogEntry {
  timestamp: string;
  level: "info" | "warn" | "error";
  message: string;
  details?: Record<string, unknown>;
}

export interface ChangelogTitle {
  title: string;
  version_number?: string;
  date: string;
}

export interface Stage4Result {
  markdown: string;
  changelogTitle: ChangelogTitle;
  metrics: { llmCalls: number };
  logs: Stage4AuditLogEntry[];
}

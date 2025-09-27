import axios from "axios";
import pRetry from "p-retry";
import {
  BasicCommitSummary,
  CommitCategory,
  FilteredCommitSummary,
  Stage1AuditLogEntry,
  Stage1Input,
  Stage1Metrics,
  Stage1Result,
  Stage1SkippedCommit,
} from "./types";

const GRAPHQL_URL = "https://api.github.com/graphql";
const DEFAULT_BATCH_SIZE = 20;
const MAX_BATCH_SIZE = 50;
const STAGE1_USER_AGENT = "ChangelogAI-Lambda/Stage1";

interface FetchResult {
  commits: BasicCommitSummary[];
  skipped: Stage1SkippedCommit[];
}

export async function runStage1(input: Stage1Input): Promise<Stage1Result> {
  if (!input.commitShas.length) {
    throw new Error("Stage1 requires at least one commit SHA");
  }

  const logs: Stage1AuditLogEntry[] = [];
  const startedAt = Date.now();

  pushLog(logs, "info", "stage1_started", {
    owner: input.owner,
    repo: input.repo,
    totalCommits: input.commitShas.length,
    batchSize: input.maxBatchSize ?? DEFAULT_BATCH_SIZE,
  });

  const fetchResult = await fetchBasicCommitSummaries(input, logs);

  const grouped: Record<CommitCategory, FilteredCommitSummary[]> = {
    features: [],
    fixes: [],
    breaking: [],
    performance: [],
    security: [],
    other: [],
  };
  const skipped: Stage1SkippedCommit[] = [...fetchResult.skipped];
  const filtered: FilteredCommitSummary[] = [];

  for (const commit of fetchResult.commits) {
    const evaluation = evaluateCommit(commit);

    if (!evaluation.include) {
      skipped.push({
        sha: commit.sha,
        reasons: evaluation.reasons,
        message: commit.message,
        authorLogin: commit.authorLogin,
        committedDate: commit.committedDate,
      });
      continue;
    }

    const enriched: FilteredCommitSummary = {
      ...commit,
      category: evaluation.category,
      importanceScore: evaluation.score,
    };

    grouped[evaluation.category].push(enriched);
    filtered.push(enriched);
  }

  const metrics = buildMetrics(
    fetchResult.commits.length,
    filtered,
    skipped,
    grouped
  );

  filtered.sort(sortByImportanceThenDate);
  (Object.keys(grouped) as CommitCategory[]).forEach((key) => {
    grouped[key].sort(sortByImportanceThenDate);
  });

  pushLog(logs, "info", "stage1_metrics", {
    metrics,
  });

  pushLog(logs, "info", "stage1_completed", {
    durationMs: Date.now() - startedAt,
    totalRetained: metrics.totalRetained,
    totalSkipped: metrics.totalSkipped,
  });

  return {
    rawCommits: fetchResult.commits,
    commitsForProcessing: filtered,
    groupedCommits: grouped,
    skippedCommits: skipped,
    metrics,
    logs,
  };
}

function sortByImportanceThenDate(
  a: FilteredCommitSummary,
  b: FilteredCommitSummary
): number {
  if (b.importanceScore !== a.importanceScore) {
    return b.importanceScore - a.importanceScore;
  }

  return (
    new Date(b.committedDate).getTime() - new Date(a.committedDate).getTime()
  );
}

async function fetchBasicCommitSummaries(
  input: Stage1Input,
  logs: Stage1AuditLogEntry[]
): Promise<FetchResult> {
  const batchSize = Math.max(
    1,
    Math.min(input.maxBatchSize ?? DEFAULT_BATCH_SIZE, MAX_BATCH_SIZE)
  );
  const commits: BasicCommitSummary[] = [];
  const skipped: Stage1SkippedCommit[] = [];

  for (let i = 0; i < input.commitShas.length; i += batchSize) {
    const batch = input.commitShas.slice(i, i + batchSize);
    const query = buildCommitBatchQuery(batch.length);
    const variables = buildVariables(input.owner, input.repo, batch);

    pushLog(logs, "info", "fetch_batch_started", {
      batchStart: i,
      batchSize: batch.length,
    });

    const response = await pRetry(
      () =>
        axios.post(
          GRAPHQL_URL,
          {
            query,
            variables,
          },
          {
            headers: {
              Authorization: `Bearer ${input.token}`,
              "Content-Type": "application/json",
              "User-Agent": STAGE1_USER_AGENT,
            },
            timeout: 25000,
          }
        ),
      {
        retries: 3,
        factor: 2,
        minTimeout: 500,
        maxTimeout: 4000,
        onFailedAttempt: (error) => {
          const errorMessage =
            error instanceof Error && typeof error.message === "string"
              ? error.message
              : "";
          pushLog(logs, "warn", "fetch_batch_retry", {
            attempt: error.attemptNumber,
            retriesLeft: error.retriesLeft,
            message: errorMessage,
          });
        },
      }
    );

    const { data, errors } = response.data as {
      data?: { repository?: Record<string, CommitGraphQlNode | null> };
      errors?: Array<{ message: string }>;
    };

    if (errors?.length) {
      pushLog(logs, "error", "fetch_batch_graphql_error", {
        messages: errors.map((err) => err.message),
      });
      throw new Error(
        `GitHub GraphQL errors: ${errors.map((err) => err.message).join(" | ")}`
      );
    }

    const repository = data?.repository;

    if (!repository) {
      pushLog(logs, "error", "fetch_batch_repository_missing", {
        owner: input.owner,
        repo: input.repo,
        batchStart: i,
      });
      throw new Error("Repository not found or access denied in Stage1 fetch");
    }

    batch.forEach((sha, index) => {
      const alias = buildCommitAlias(index);
      const node = repository[alias];

      if (!node) {
        skipped.push({ sha, reasons: ["commit_not_found"] });
        pushLog(logs, "warn", "commit_skipped_missing", {
          sha,
        });
        return;
      }

      if (node.__typename !== "Commit") {
        skipped.push({
          sha,
          reasons: ["not_a_commit"],
          message: node.messageHeadline ?? undefined,
        });
        pushLog(logs, "warn", "commit_skipped_not_commit", {
          sha,
          typename: node.__typename,
        });
        return;
      }

      const basic = mapToBasicSummary(node);

      if (!basic) {
        skipped.push({ sha, reasons: ["commit_parsing_failed"] });
        pushLog(logs, "warn", "commit_skipped_mapping_failed", {
          sha,
        });
        return;
      }

      commits.push(basic);
    });

    pushLog(logs, "info", "fetch_batch_completed", {
      batchStart: i,
      batchSize: batch.length,
      commitsFetched: commits.length,
      skippedCommits: skipped.length,
    });
  }

  return { commits, skipped };
}

function buildCommitBatchQuery(count: number): string {
  const variableDefinitions = Array.from(
    { length: count },
    (_, index) => `$oid${index}: GitObjectID!`
  ).join(", ");
  const commitSelections = Array.from({ length: count }, (_, index) => {
    const alias = buildCommitAlias(index);
    const variable = `$oid${index}`;
    return `${alias}: object(oid: ${variable}) {
      __typename
      ...CommitFields
    }`;
  }).join("\n");

  return `query($owner: String!, $name: String!, ${variableDefinitions}) {
    repository(owner: $owner, name: $name) {
      ${commitSelections}
    }
  }
  fragment CommitFields on Commit {
    oid
    message
    messageHeadline
    committedDate
    authoredDate
    additions
    deletions
    changedFiles
    author {
      name
      email
      date
      user {
        __typename
        login
      }
    }
    committer {
      name
      email
      date
      user {
        __typename
        login
      }
    }
    parents(first: 10) {
      totalCount
    }
  }`;
}

function buildVariables(
  owner: string,
  repo: string,
  batch: string[]
): Record<string, string> {
  return batch.reduce(
    (vars, sha, index) => ({
      ...vars,
      owner,
      name: repo,
      [`oid${index}`]: sha,
    }),
    {} as Record<string, string>
  );
}

function mapToBasicSummary(node: CommitGraphQlNode): BasicCommitSummary | null {
  if (!node || node.__typename !== "Commit") {
    return null;
  }

  let parentsTotal = 0;
  const parentsField = node.parents;
  if (parentsField && !Array.isArray(parentsField)) {
    if (typeof parentsField.totalCount === "number") {
      parentsTotal = parentsField.totalCount;
    }
  } else if (Array.isArray(parentsField)) {
    parentsTotal = parentsField.length;
  }

  const authorLogin = node.author?.user?.login ?? undefined;
  const committerLogin = node.committer?.user?.login ?? undefined;

  const authorName = node.author?.name ?? undefined;
  const committerName = node.committer?.name ?? undefined;
  const authorEmail = node.author?.email ?? undefined;
  const committerEmail = node.committer?.email ?? undefined;

  const authorIsBot = detectBot(authorLogin, authorName, authorEmail);

  const committedDate =
    node.committedDate ??
    node.committer?.date ??
    node.author?.date ??
    new Date().toISOString();
  const authoredDate =
    node.authoredDate ??
    node.author?.date ??
    node.committedDate ??
    new Date().toISOString();

  return {
    sha: node.oid,
    message: node.message ?? "",
    headline: node.messageHeadline ?? "",
    authorName,
    authorEmail,
    authorLogin,
    authorIsBot,
    committerName,
    committerEmail,
    committerLogin,
    committedDate,
    authoredDate,
    additions: node.additions ?? 0,
    deletions: node.deletions ?? 0,
    totalChanges: (node.additions ?? 0) + (node.deletions ?? 0),
    filesChanged: node.changedFiles ?? 0,
    parentCount: parentsTotal,
  };
}

function detectBot(login?: string, name?: string, email?: string): boolean {
  const combined = [login, name, email].filter(Boolean).join(" ").toLowerCase();

  if (!combined) {
    return false;
  }

  return (
    combined.includes("[bot]") ||
    combined.includes("bot@") ||
    combined.includes("actions@github.com") ||
    combined.includes("github-actions") ||
    combined.includes("dependabot") ||
    combined.includes("renovate") ||
    combined.includes("automation") ||
    /\bbot\b/.test(combined)
  );
}

interface EvaluationResult {
  include: boolean;
  reasons: string[];
  category: CommitCategory;
  score: number;
}

function evaluateCommit(commit: BasicCommitSummary): EvaluationResult {
  const reasons: string[] = [];
  const normalizedMessage = commit.headline.toLowerCase();

  if (commit.parentCount > 1 && !isMeaningfulMerge(commit)) {
    reasons.push("merge_commit");
  }

  if (commit.authorIsBot || isLikelyBotLogin(commit.authorLogin)) {
    reasons.push("bot_author");
  }

  const patternReason = matchFilterPatterns(normalizedMessage);
  if (patternReason) {
    reasons.push(patternReason);
  }

  if (reasons.length) {
    return {
      include: false,
      reasons,
      category: "other",
      score: 0,
    };
  }

  const category = categorizeCommit(
    normalizedMessage,
    commit.message.toLowerCase()
  );
  const score = deriveImportanceScore(category, normalizedMessage);

  return {
    include: true,
    reasons,
    category,
    score,
  };
}

function isMeaningfulMerge(commit: BasicCommitSummary): boolean {
  const message = commit.headline.toLowerCase();
  return (
    message.includes("release") ||
    message.includes("hotfix") ||
    message.includes("security") ||
    message.includes("deploy") ||
    message.includes("backport")
  );
}

function isLikelyBotLogin(login?: string): boolean {
  if (!login) {
    return false;
  }
  const normalized = login.toLowerCase();
  return (
    normalized.endsWith("[bot]") ||
    normalized.includes("[bot]") ||
    normalized.startsWith("bot-") ||
    normalized.includes("dependabot") ||
    normalized.includes("renovate") ||
    normalized.includes("github-actions")
  );
}

function matchFilterPatterns(message: string): string | null {
  if (/^merge /.test(message)) {
    return "merge_auto";
  }

  if (
    /^chore(\(|:)/.test(message) ||
    message.includes("dependency") ||
    message.includes("deps")
  ) {
    return "chore_dependency";
  }

  if (/^docs?(\(|:)/.test(message)) {
    if (!/(api|sdk|public|external|breaking)/.test(message)) {
      return "docs_minor";
    }
  }

  if (/^test(s)?(\(|:)/.test(message)) {
    if (!/(new|coverage|integration|e2e|end-to-end)/.test(message)) {
      return "tests_minor";
    }
  }

  if (/^style(\(|:)/.test(message) || /\bformat(ting)?\b/.test(message)) {
    return "style_formatting";
  }

  if (/^ci(\(|:)/.test(message) || /^build(\(|:)/.test(message)) {
    return "ci_cd";
  }

  return null;
}

function categorizeCommit(
  message: string,
  fullMessage: string
): CommitCategory {
  if (
    message.includes("breaking change") ||
    fullMessage.includes("breaking change") ||
    /^.*!/.test(message)
  ) {
    return "breaking";
  }

  if (
    message.includes("security") ||
    message.includes("vuln") ||
    message.includes("cve")
  ) {
    return "security";
  }

  if (
    message.startsWith("feat") ||
    message.includes("feature") ||
    fullMessage.includes("feature")
  ) {
    return "features";
  }

  if (
    message.startsWith("fix") ||
    message.includes("bugfix") ||
    message.includes("patch") ||
    message.includes("hotfix")
  ) {
    return "fixes";
  }

  if (
    message.startsWith("perf") ||
    message.includes("performance") ||
    message.includes("optimiz")
  ) {
    return "performance";
  }

  return "other";
}

function deriveImportanceScore(
  category: CommitCategory,
  message: string
): number {
  switch (category) {
    case "breaking":
      return 10;
    case "security":
      return 9;
    case "features":
      return 8;
    case "fixes":
      return 7;
    case "performance":
      return 6;
    case "other":
    default:
      if (message.includes("refactor")) {
        return 4;
      }
      if (message.includes("doc")) {
        return 3;
      }
      if (message.includes("style") || message.includes("format")) {
        return 1;
      }
      return 5;
  }
}

function buildMetrics(
  totalInput: number,
  retained: FilteredCommitSummary[],
  skipped: Stage1SkippedCommit[],
  grouped: Record<CommitCategory, FilteredCommitSummary[]>
): Stage1Metrics {
  const totalRetained = retained.length;
  const totalSkipped = skipped.length;
  const reductionPercent = totalInput
    ? Math.round(((totalInput - totalRetained) / totalInput) * 100)
    : 0;

  const groupingBreakdown = (Object.keys(grouped) as CommitCategory[]).reduce(
    (acc, key) => ({
      ...acc,
      [key]: grouped[key].length,
    }),
    {
      features: 0,
      fixes: 0,
      breaking: 0,
      performance: 0,
      security: 0,
      other: 0,
    } as Record<CommitCategory, number>
  );

  return {
    totalInput,
    totalRetained,
    totalSkipped,
    reductionPercent,
    groupingBreakdown,
  };
}

function pushLog(
  logs: Stage1AuditLogEntry[],
  level: Stage1AuditLogEntry["level"],
  message: string,
  details?: Record<string, unknown>
): void {
  logs.push({
    timestamp: new Date().toISOString(),
    level,
    message,
    details,
  });
}

function buildCommitAlias(index: number): string {
  return `commit_${index}`;
}

interface CommitGraphQlNode {
  __typename: string;
  oid: string;
  message?: string | null;
  messageHeadline?: string | null;
  committedDate?: string | null;
  authoredDate?: string | null;
  additions?: number | null;
  deletions?: number | null;
  changedFiles?: number | null;
  parents?:
    | {
        totalCount?: number | null;
      }
    | Array<Record<string, unknown>>
    | null;
  author?: {
    name?: string | null;
    email?: string | null;
    date?: string | null;
    user?: {
      login?: string | null;
    } | null;
  } | null;
  committer?: {
    name?: string | null;
    email?: string | null;
    date?: string | null;
    user?: {
      login?: string | null;
    } | null;
  } | null;
}

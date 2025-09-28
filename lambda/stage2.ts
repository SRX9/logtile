import { jsonrepair } from "jsonrepair";

import {
  CommitCategory,
  CommitWithSummary,
  Stage2AuditLogEntry,
  Stage2CommitResult,
  Stage2Input,
  Stage2Metrics,
  Stage2Result,
  Stage2Strategy,
  Stage2Tier,
  UserFacingChange,
} from "./types";
import { llmInferenceAzure } from "./llminference";

const MAX_DIFF_LINES_PER_COMMIT = 500;

export async function runStage2(input: Stage2Input): Promise<Stage2Result> {
  const logs: Stage2AuditLogEntry[] = [];
  const startedAt = Date.now();

  const total = input.commits.length;
  const strategy: Stage2Strategy = total <= 50 ? "batch" : "tiered";

  pushLog(logs, "info", "stage2_started", { totalCommits: total, strategy });

  const metrics: Stage2Metrics = {
    totalCommits: total,
    tier1: 0,
    tier2: 0,
    tier3: 0,
    llmCalls: 0,
    batchedCalls: 0,
    individualCalls: 0,
    analyzedCommits: 0,
    skippedNoLLM: 0,
  };

  const results: Stage2CommitResult[] = [];

  if (strategy === "batch") {
    const batchSize = 4;

    for (let i = 0; i < input.commits.length; i += batchSize) {
      const batch = input.commits.slice(i, i + batchSize);
      const prepared = batch.map((c) => prepareCommitForAnalysis(c));

      prepared.forEach((p) => {
        if (p.tier === 1) metrics.tier1 += 1;
        else if (p.tier === 2) metrics.tier2 += 1;
        else metrics.tier3 += 1;
      });

      const analysis = await analyzeCommits(prepared);

      metrics.llmCalls += 1;
      metrics.batchedCalls += 1;

      const written = await writeReleaseLines(analysis);

      metrics.llmCalls += 1;
      metrics.batchedCalls += 1;

      const merged = mergeAnalysisAndWriting(prepared, analysis, written);

      results.push(...merged);
      metrics.analyzedCommits += merged.length;
    }
  } else {
    const tier1 = input.commits
      .filter((c) => determineTier(c.summary.importanceScore) === 1)
      .map(prepareCommitForAnalysis);
    const tier2 = input.commits
      .filter((c) => determineTier(c.summary.importanceScore) === 2)
      .map(prepareCommitForQuickAnalysis);
    const tier3 = input.commits
      .filter((c) => determineTier(c.summary.importanceScore) === 3)
      .map(prepareCommitForAnalysis); // reuse for counters

    metrics.tier1 = tier1.length;
    metrics.tier2 = tier2.length;
    metrics.tier3 = tier3.length;

    // Tier 1: individual, full diff
    for (const commit of tier1) {
      const analysis = await analyzeCommits([commit]);

      metrics.llmCalls += 1;
      metrics.individualCalls += 1;
      const writing = await writeReleaseLines(analysis);

      metrics.llmCalls += 1;
      metrics.individualCalls += 1;
      const merged = mergeAnalysisAndWriting([commit], analysis, writing);

      results.push(...merged);
      metrics.analyzedCommits += 1;
    }

    // Tier 2: quick, message + filenames only, batch in groups of 15
    const quickBatchSize = 15;

    for (let i = 0; i < tier2.length; i += quickBatchSize) {
      const batch = tier2.slice(i, i + quickBatchSize);
      const analysis = await analyzeCommits(batch, { quick: true });

      metrics.llmCalls += 1;
      metrics.batchedCalls += 1;
      const writing = await writeReleaseLines(analysis);

      metrics.llmCalls += 1;
      metrics.batchedCalls += 1;
      const merged = mergeAnalysisAndWriting(batch, analysis, writing);

      results.push(...merged);
      metrics.analyzedCommits += merged.length;
    }

    // Tier 3: count only, no LLM
    for (const c of tier3) {
      results.push({
        sha: c.sha,
        title: c.title,
        importanceScore: c.importanceScore,
        category: c.category as CommitCategory,
        tier: 3,
        filesConsidered: c.filesConsidered,
        skippedFiles: c.skippedFiles,
        truncatedDiffLines: c.truncatedLines,
        analysisSummary:
          "Low-importance change; no user-facing impact processed.",
        userFacingChanges: [],
      });
      metrics.skippedNoLLM += 1;
    }
  }

  pushLog(logs, "info", "stage2_completed", {
    durationMs: Date.now() - startedAt,
    analyzed: metrics.analyzedCommits,
    strategy,
  });

  return {
    strategy,
    commitResults: results,
    metrics,
    logs,
  };
}

// -------------------------
// Internal helpers
// -------------------------

interface PreparedCommitInput {
  sha: string;
  title: string;
  importanceScore: number;
  category: string;
  tier: Stage2Tier;
  filesConsidered: string[];
  skippedFiles: string[];
  truncatedLines: number;
  diff?: string; // present unless quick
  message?: string;
}

function determineTier(score: number): Stage2Tier {
  if (score >= 7) return 1;
  if (score >= 4) return 2;

  return 3;
}

function isTestFile(filename: string): boolean {
  const lower = filename.toLowerCase();

  return (
    /\btest\b|\bspec\b/.test(lower) ||
    lower.includes("/__tests__/") ||
    lower.includes("/tests/") ||
    lower.endsWith(".spec.ts") ||
    lower.endsWith(".spec.tsx") ||
    lower.endsWith(".test.ts") ||
    lower.endsWith(".test.tsx") ||
    lower.includes("cypress") ||
    lower.includes("playwright") ||
    lower.includes("jest.config")
  );
}

function prepareCommitForAnalysis(
  commit: CommitWithSummary,
): PreparedCommitInput {
  const tier = determineTier(commit.summary.importanceScore);
  const { diff, filesConsidered, skippedFiles, truncatedLines } = buildDiff(
    commit,
    MAX_DIFF_LINES_PER_COMMIT,
  );

  return {
    sha: commit.summary.sha,
    title:
      commit.summary.headline ||
      commit.details.commit.message.split("\n")[0] ||
      "",
    importanceScore: commit.summary.importanceScore,
    category: commit.summary.category,
    tier,
    filesConsidered,
    skippedFiles,
    truncatedLines,
    diff,
    message: commit.details.commit.message,
  };
}

function prepareCommitForQuickAnalysis(
  commit: CommitWithSummary,
): PreparedCommitInput {
  const tier = determineTier(commit.summary.importanceScore);
  const filesConsidered: string[] = [];
  const skippedFiles: string[] = [];
  const fileList = commit.details.files || [];

  for (const f of fileList) {
    if (!f || !f.filename) continue;
    const name = f.filename;

    if (isTestFile(name)) {
      skippedFiles.push(name);
    } else {
      filesConsidered.push(name);
    }
  }

  return {
    sha: commit.summary.sha,
    title:
      commit.summary.headline ||
      commit.details.commit.message.split("\n")[0] ||
      "",
    importanceScore: commit.summary.importanceScore,
    category: commit.summary.category,
    tier,
    filesConsidered,
    skippedFiles,
    truncatedLines: 0,
    message: commit.details.commit.message,
  };
}

function buildDiff(
  commit: CommitWithSummary,
  maxLines: number,
): {
  diff: string;
  filesConsidered: string[];
  skippedFiles: string[];
  truncatedLines: number;
} {
  const files = commit.details.files || [];
  let linesLeft = Math.max(0, maxLines);
  const parts: string[] = [];
  const filesConsidered: string[] = [];
  const skippedFiles: string[] = [];
  let truncated = 0;

  for (const file of files) {
    if (!file || !file.filename) continue;
    const name = file.filename;

    if (isTestFile(name)) {
      skippedFiles.push(name);
      continue;
    }
    filesConsidered.push(name);
    if (!file.patch) continue;
    const patchLines = file.patch.split(/\r?\n/);

    if (patchLines.length > linesLeft) {
      parts.push(
        `--- ${name} (truncated)\n` + patchLines.slice(0, linesLeft).join("\n"),
      );
      truncated += patchLines.length - linesLeft;
      linesLeft = 0;
      break;
    } else {
      parts.push(`--- ${name}\n` + patchLines.join("\n"));
      linesLeft -= patchLines.length;
    }
  }

  return {
    diff: parts.join("\n\n"),
    filesConsidered,
    skippedFiles,
    truncatedLines: truncated,
  };
}

async function analyzeCommits(
  commits: PreparedCommitInput[],
  options?: { quick?: boolean },
): Promise<
  Array<{
    sha: string;
    analysis_summary?: string;
    user_facing_changes: UserFacingChange[];
  }>
> {
  const systemPrompt = buildAnalysisSystemPrompt();
  const userPrompt = buildAnalysisUserPrompt(commits, !!options?.quick);
  const raw = await llmInferenceAzure(userPrompt, systemPrompt);
  const parsed = safeParseJson(raw, { commits: [] });
  // Primary schema
  let items: Array<{
    sha: string;
    analysis_summary?: string;
    user_facing_changes: UserFacingChange[];
  }> = Array.isArray(parsed?.commits) ? parsed.commits : [];

  // Fallback: simplified schema as per hint
  if (!items.length && parsed && Array.isArray(parsed.commits)) {
    items = parsed.commits
      .filter(
        (c: any) =>
          c &&
          typeof c.sha === "string" &&
          typeof c.user_facing_change === "string",
      )
      .map((c: any) => ({
        sha: c.sha,
        analysis_summary: c.technical_detail,
        user_facing_changes: [
          {
            type: (c.category || "other") as any,
            description: c.user_facing_change,
            impact: (c.impact || "medium") as any,
            audiences: undefined,
            components: undefined,
            breaking:
              c.category === "breaking" || c.migration_required === true,
            deprecation: c.migration_required === true,
            technicalDetail: c.technical_detail,
          },
        ],
      }));
  }

  return items;
}

async function writeReleaseLines(
  analysis: Array<{
    sha: string;
    analysis_summary?: string;
    user_facing_changes: UserFacingChange[];
  }>,
): Promise<Array<{ sha: string; release_note_line?: string }>> {
  const systemPrompt = buildWriterSystemPrompt();
  const userPrompt = buildWriterUserPrompt(analysis);
  const raw = await llmInferenceAzure(userPrompt, systemPrompt);
  const json = safeParseJson(raw, { commits: [] });
  const items: Array<{ sha: string; release_note_line?: string }> =
    Array.isArray(json?.commits) ? json.commits : [];

  return items;
}

function mergeAnalysisAndWriting(
  prepared: PreparedCommitInput[],
  analysis: Array<{
    sha: string;
    analysis_summary?: string;
    user_facing_changes: UserFacingChange[];
  }>,
  writing: Array<{ sha: string; release_note_line?: string }>,
): Stage2CommitResult[] {
  const byShaAnalysis = new Map(analysis.map((a) => [a.sha, a]));
  const byShaWriting = new Map(writing.map((w) => [w.sha, w]));

  return prepared.map((p) => {
    const a = byShaAnalysis.get(p.sha);
    const w = byShaWriting.get(p.sha);

    return {
      sha: p.sha,
      title: p.title,
      importanceScore: p.importanceScore,
      category: p.category as any,
      tier: p.tier,
      filesConsidered: p.filesConsidered,
      skippedFiles: p.skippedFiles,
      truncatedDiffLines: p.truncatedLines,
      analysisSummary: a?.analysis_summary,
      userFacingChanges: a?.user_facing_changes ?? [],
      releaseNoteLine: w?.release_note_line,
    } as Stage2CommitResult;
  });
}

function buildAnalysisSystemPrompt(): string {
  return [
    "You are a senior release-notes analyst.",
    "Your job: infer USER-FACING impact. Ignore internal refactors, renames, formatting, CI, tests, build, and code style only changes.",
    "Focus on: new features, bug fixes, breaking changes, security, performance, and public API or UI changes.",
    "If unsure, be conservative and exclude it.",
    "Output STRICT JSON only. No prose.",
    "If input includes multiple commits, return an array under commits.",
    "Preferred schema includes user_facing_changes array; acceptable fallback schema uses a single user_facing_change string per commit.",
  ].join(" \n");
}

function buildAnalysisUserPrompt(
  commits: PreparedCommitInput[],
  quick: boolean,
): string {
  const schema = {
    commits: [
      {
        sha: "string",
        analysis_summary: "short string",
        user_facing_changes: [
          {
            type: "feature|fix|breaking|performance|security|docs|other",
            scope: "optional string",
            description: "plain English, concise",
            impact: "high|medium|low",
            audiences: ["end_user|developer|admin|api_client"],
            components: ["string"],
            breaking: "boolean",
            deprecation: "boolean",
          },
        ],
      },
    ],
  };

  const compact = commits.map((c) => {
    const base = {
      sha: c.sha,
      title: c.title,
      importance_score: c.importanceScore,
      category: c.category,
      tier: c.tier,
      files_considered: c.filesConsidered,
      skipped_files: c.skippedFiles,
    } as Record<string, unknown>;

    if (!quick) {
      base["diff"] = c.diff ?? "";
      base["message"] = c.message ?? "";
    } else {
      base["message"] = c.message ?? "";
    }

    return base;
  });

  return [
    "Analyze the following commits and extract ONLY user-facing impact.",
    "- Ignore internal refactoring, variable renames, comments, code style, tests (unless new test category), CI/build scripts.",
    "- Prioritize public API changes and UI/behavior changes.",
    "- Assume patches may be truncated.",
    "Return JSON with this schema:",
    JSON.stringify(schema),
    "Fallback schema also accepted if simpler:",
    JSON.stringify({
      commits: [
        {
          sha: "string",
          impact: "high|medium|low",
          category: "feature|fix|breaking|performance|security|docs|other",
          user_facing_change: "Clear, concise description",
          technical_detail: "Optional context",
          migration_required: false,
        },
      ],
    }),
    "Commits:",
    JSON.stringify({ commits: compact }),
  ].join("\n\n");
}

function buildWriterSystemPrompt(): string {
  return [
    "You are a technical writer for release notes.",
    "Write crisp, user-facing one-liners in active voice.",
    "Avoid code terms; use product language.",
    "No punctuation at the end. No mentions of PR/commit numbers.",
    "Output STRICT JSON only.",
    "If multiple changes exist, choose the most impactful for the line.",
  ].join(" \n");
}

function buildWriterUserPrompt(
  analysis: Array<{
    sha: string;
    user_facing_changes: UserFacingChange[];
  }>,
): string {
  const schema = {
    commits: [{ sha: "string", release_note_line: "string, one sentence" }],
  };

  return [
    "Create a single release-note line per commit based on the extracted user-facing changes.",
    "Prefer the most important change if multiple exist. Keep it under 16 words.",
    "Return JSON with this schema:",
    JSON.stringify(schema),
    JSON.stringify({ commits: analysis }),
  ].join("\n\n");
}

function safeParseJson<T>(raw: any, fallback: T): T {
  if (!raw || typeof raw !== "string") return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    try {
      const repaired = jsonrepair(raw);

      return JSON.parse(repaired) as T;
    } catch {
      return fallback;
    }
  }
}

function pushLog(
  logs: Stage2AuditLogEntry[],
  level: Stage2AuditLogEntry["level"],
  message: string,
  details?: Record<string, unknown>,
): void {
  logs.push({
    timestamp: new Date().toISOString(),
    level,
    message,
    details,
  });
}

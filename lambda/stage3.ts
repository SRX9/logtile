import {
  CommitCategory,
  Stage2CommitResult,
  Stage3AuditLogEntry,
  Stage3Input,
  Stage3Metrics,
  Stage3Result,
} from "./types";
import { llmInferenceAzure } from "./llminference";
import { jsonrepair } from "jsonrepair";

const CATEGORY_ORDER: CommitCategory[] = [
  "features",
  "fixes",
  "breaking",
  "performance",
  "security",
  "other",
];

export async function runStage3(input: Stage3Input): Promise<Stage3Result> {
  const logs: Stage3AuditLogEntry[] = [];
  const startedAt = Date.now();

  pushLog(logs, "info", "stage3_started", {
    totalCommits: input.commits.length,
  });

  const initialByCategory = buildInitialChangeLines(input.commits);

  const categoriesPresent: Record<CommitCategory, number> = {
    features: initialByCategory.features.length,
    fixes: initialByCategory.fixes.length,
    breaking: initialByCategory.breaking.length,
    performance: initialByCategory.performance.length,
    security: initialByCategory.security.length,
    other: initialByCategory.other.length,
  };

  const categories: Record<CommitCategory, string[]> = {
    features: [],
    fixes: [],
    breaking: [],
    performance: [],
    security: [],
    other: [],
  };

  let llmCalls = 0;
  for (const category of CATEGORY_ORDER) {
    const lines = initialByCategory[category];
    if (!lines.length) continue;
    const summary = await summarizeCategory(category, lines);
    llmCalls += 1;
    categories[category] = summary;
  }

  const executiveSummary = await writeExecutiveSummary(categories);
  llmCalls += 1;

  const totalBullets = (Object.values(categories) as string[][]).reduce(
    (acc, arr) => acc + arr.length,
    0
  );

  pushLog(logs, "info", "stage3_completed", {
    durationMs: Date.now() - startedAt,
    llmCalls,
    categoriesPresent,
    totalBullets,
  });

  const metrics: Stage3Metrics = {
    totalCommits: input.commits.length,
    categoriesPresent,
    llmCalls,
    totalBullets,
  };

  return { categories, executiveSummary, metrics, logs };
}

function buildInitialChangeLines(
  commits: Stage2CommitResult[]
): Record<CommitCategory, string[]> {
  const byCategory: Record<CommitCategory, string[]> = {
    features: [],
    fixes: [],
    breaking: [],
    performance: [],
    security: [],
    other: [],
  };

  for (const c of commits) {
    const cat = (c.category || "other") as CommitCategory;
    const lines: string[] = [];
    if (c.releaseNoteLine) {
      lines.push(c.releaseNoteLine);
    }
    if (c.userFacingChanges && c.userFacingChanges.length) {
      for (const u of c.userFacingChanges) {
        if (!u || !u.description) continue;
        const prefix =
          u.scope || (u.components && u.components[0]) || undefined;
        if (prefix) {
          lines.push(`${prefix}: ${u.description}`);
        } else {
          lines.push(u.description);
        }
      }
    }
    if (!lines.length && c.title) {
      lines.push(c.title);
    }
    byCategory[cat].push(...dedupe(lines));
  }

  // Normalize to unique lines per category
  (Object.keys(byCategory) as CommitCategory[]).forEach((k) => {
    byCategory[k] = dedupe(byCategory[k]);
  });

  return byCategory;
}

async function summarizeCategory(
  category: CommitCategory,
  changes: string[]
): Promise<string[]> {
  if (!changes.length) return [];
  const systemPrompt = buildCategorySystemPrompt();
  const userPrompt = buildCategoryUserPrompt(category, changes);
  const raw = await llmInferenceAzure(userPrompt, systemPrompt);
  const parsed = safeParseJson(raw, { bullets: [] as string[] });

  let bullets: string[] = [];
  if (Array.isArray((parsed as any).bullets)) {
    bullets = ((parsed as any).bullets as unknown[])
      .map((b) => (typeof b === "string" ? b : ""))
      .filter(Boolean);
  } else {
    bullets = fallbackExtractBullets(raw || "");
  }
  return bullets.slice(0, 10);
}

async function writeExecutiveSummary(
  categories: Record<CommitCategory, string[]>
): Promise<string[]> {
  const systemPrompt =
    "You are a release manager. Craft a short executive summary (2-3 sentences) highlighting the most important changes for developers.";
  const userPrompt = [
    "Here are categorized changelog bullet points.",
    JSON.stringify(categories),
    'Return STRICT JSON: { executive_summary: ["sentence", ...] }',
  ].join("\n\n");
  const raw = await llmInferenceAzure(userPrompt, systemPrompt);
  const parsed = safeParseJson(raw, { executive_summary: [] as string[] });
  const arr: string[] = Array.isArray((parsed as any).executive_summary)
    ? ((parsed as any).executive_summary as string[])
    : fallbackExtractBullets(raw || "");
  return arr.slice(0, 3);
}

function buildCategorySystemPrompt(): string {
  return [
    "You are a technical writer creating a changelog for developers.",
    "Summarize related changes into clear, actionable bullet points.",
    "Use active voice and present tense. Start with impact, then context.",
    "Include specific names (APIs, components) when relevant.",
    "Return STRICT JSON only as: { bullets: string[] }.",
  ].join(" \n");
}

function buildCategoryUserPrompt(
  category: CommitCategory,
  changes: string[]
): string {
  return [
    `CATEGORY: ${category}`,
    "CHANGES:",
    ...changes.map((c) => `- ${c}`),
    "RULES:",
    "1. Combine similar changes into single points",
    "2. Use active voice and present tense",
    "3. Start with the impact, then provide context",
    "4. Include specific names (APIs, components, functions) when relevant",
    "5. Max 10 bullet points",
    "OUTPUT: JSON { bullets: string[] }",
  ].join("\n");
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

function fallbackExtractBullets(text: string): string[] {
  if (!text) return [];
  return text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => /^[-*•]/.test(l))
    .map((l) => l.replace(/^[-*•]\s?/, ""));
}

function dedupe(items: string[]): string[] {
  const set = new Set<string>();
  for (const i of items) {
    const key = i.trim().toLowerCase();
    if (!set.has(key)) set.add(key);
  }
  // Return original-cased first occurrence order
  const seen = new Set<string>();
  const out: string[] = [];
  for (const i of items) {
    const key = i.trim().toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      out.push(i.trim());
    }
  }
  return out;
}

function pushLog(
  logs: Stage3AuditLogEntry[],
  level: Stage3AuditLogEntry["level"],
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

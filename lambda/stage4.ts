import {
  Stage3Result,
  Stage4AuditLogEntry,
  Stage4Input,
  Stage4Result,
} from "./types";
import { llmInferenceAzure } from "./llminference";
import { jsonrepair } from "jsonrepair";

export async function runStage4(input: Stage4Input): Promise<Stage4Result> {
  const logs: Stage4AuditLogEntry[] = [];
  const startedAt = Date.now();
  pushLog(logs, "info", "stage4_started");

  const systemPrompt = buildSystemPrompt();
  const userPrompt = buildUserPrompt(input.stage3, input.metadata);
  const raw = await llmInferenceAzure(userPrompt, systemPrompt);

  const markdown = extractMarkdown(raw || "");

  pushLog(logs, "info", "stage4_completed", {
    durationMs: Date.now() - startedAt,
    length: markdown.length,
  });

  return { markdown, metrics: { llmCalls: 1 }, logs };
}

function buildSystemPrompt(): string {
  return [
    "You are a product-focused technical writer creating a public changelog for end users and developers who use this software.",
    "Focus on user-facing impact and value; never describe internal implementation details.",
    "Follow the critical rules provided in the user prompt exactly.",
    "Return the final changelog as Markdown only, no extra commentary.",
  ].join(" \n");
}

function buildUserPrompt(
  stage3: Stage3Result,
  meta: Stage4Input["metadata"]
): string {
  return [
    "TASK: Create a public changelog that tells users what changed from their perspective. Don't try to be too detailed. Keep it pretty high level and professional.",
    "ROLE: You are a product-focused technical writer creating a public changelog for end users and developers who use this software. You care about user experience and value, not implementation details.",
    "CRITICAL RULES - NEVER VIOLATE THESE:",
    "1. NEVER mention internal file names, class names, or function names",
    "2. NEVER describe how something was implemented",
    "3. NEVER reveal database structures, API internals, or system design",
    "4. NEVER use phrases like 'refactored', 'migrated', 'restructured'",
    "5. NEVER mention specific technologies used internally",
    "6. FOCUS ONLY on what users can see, touch, or experience differently",
    "INPUT (JSON):",
    JSON.stringify(
      {
        features: stage3.categories.features,
        fixes: stage3.categories.fixes,
        improvements: stage3.categories.other,
        breaking_changes: stage3.categories.breaking,
        performance: stage3.categories.performance,
        security: stage3.categories.security,
        executive_summary: stage3.executiveSummary,
        metadata: meta,
      },
      null,
      2
    ),
    "CHANGELOG STRUCTURE:",
    [
      "# [Version Number] - [Date]",
      "",
      "## ✨ What's New",
      "[2-3 sentences highlighting the most impactful changes from a user's perspective]",
      "",
      "## New Features",
      "[Focus on capabilities users gain, not how they were built]",
      "",
      "## Fixed Issues",
      "[Describe problems users experienced that are now resolved]",
      "",
      "##  Performance Improvements",
      "[Only mention improvements users will notice]",
      "",
      "## Important Changes",
      "[Cover breaking changes, security updates, or required follow-up actions]",
      "",
      "## Platform-Specific Updates",
      "[Include only if there are platform-specific notes such as Web, iOS, Android] with platform name in the heading and then paragraph",
    ].join("\n"),
    "WRITING GUIDANCE:",
    "- Properly format the Markdown using headings, bullet lists, subheadings, paragraphs, etc.",
    "- Use the provided summaries only; do not invent new changes.",
    "- Write in second person, focusing on user benefits and outcomes.",
    "- Be specific about value but avoid implementation details or internal terminology.",
    "- If a section has no content, omit the header entirely.",
    "- Use metadata.version when available; otherwise render the version as 'Unreleased'.",
    "- Use metadata.dateRange (prefer the 'to' date, fallback to 'from') or today's date if none is provided. Format as YYYY-MM-DD.",
    "- Integrate executive summary lines into the 'What's New' section, adapting wording as needed for clarity.",
    "- Keep bullets concise, user-focused, and free of prohibited terminology.",
    "- Ensure the Markdown is clean and well-structured with headings, bullet lists, and tables rendered properly without placeholders or artifacts.",
    "- Replace any placeholder text (e.g., values wrapped in brackets) with actual data or omit the row if data is missing.",
  ].join("\n\n");
}

function extractMarkdown(raw: string): string {
  if (!raw) return "";
  // If the model returned JSON with a markdown key, extract it
  try {
    const parsed = JSON.parse(raw);
    if (typeof parsed?.markdown === "string") return parsed.markdown;
  } catch {
    // not JSON
  }
  // Attempt to repair then parse JSON
  try {
    const repaired = jsonrepair(raw);
    const parsed = JSON.parse(repaired);
    if (typeof parsed?.markdown === "string") return parsed.markdown;
  } catch {
    // fall through
  }
  return raw.trim();
}

function pushLog(
  logs: Stage4AuditLogEntry[],
  level: Stage4AuditLogEntry["level"],
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

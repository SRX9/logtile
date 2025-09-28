import {
  Stage3Result,
  Stage4AuditLogEntry,
  Stage4Input,
  Stage4Result,
  ChangelogTitle,
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

  const { markdown, changelogTitle } = extractMarkdownAndTitle(
    raw || "",
    input.metadata
  );

  pushLog(logs, "info", "stage4_completed", {
    durationMs: Date.now() - startedAt,
    markdownLength: markdown.length,
    titleLength: changelogTitle.title.length,
  });

  return { markdown, changelogTitle, metrics: { llmCalls: 1 }, logs };
}

function buildSystemPrompt(): string {
  return [
    "You are a product-focused technical writer creating a public changelog for end users and developers who use this software.",
    "Focus on user-facing impact and value; never describe internal implementation details.",
    "Follow the critical rules provided in the user prompt exactly.",
    "Return your response as a JSON object with 'markdown' and 'title' fields only.",
    "Do not include any title or release header in the 'markdown'. The title is returned separately and must not appear in the markdown body.",
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
    "7. Do NOT include any top-level document title or release header in the markdown.",
    "8. Do NOT include version numbers or dates anywhere in the markdown.",
    "",
    "IMPORTANT: Return your response as a JSON object with two fields:",
    "- 'markdown': The complete changelog in Markdown format",
    "- 'title': A concise title for this changelog as a string",
    "",
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
      "Start directly with the sections below. Do NOT include any top-level document title, release heading, version, or date in the markdown.",
      "### What's New",
      "[2-3 sentences highlighting the most impactful changes from a user's perspective]",
      "",
      "### New Features",
      "[Focus on capabilities users gain, not how they were built]",
      "",
      "### Fixed Issues",
      "[Describe problems users experienced that are now resolved]",
      "",
      "### Performance Improvements",
      "[Only mention improvements users will notice]",
      "",
      "### Important Changes",
      "[Cover breaking changes, security updates, or required follow-up actions]",
      "",
      "### Platform-Specific Updates",
      "[Include only if there are platform-specific notes such as Web, iOS, Android] with platform name in the heading and then paragraph",
    ].join("\n"),
    "WRITING GUIDANCE:",
    "- Properly format the Markdown using headings, bullet lists, subheadings, paragraphs, etc.",
    "- Use the provided summaries only; do not invent new changes.",
    "- Write in second person, focusing on user benefits and outcomes.",
    "- Be specific about value but avoid implementation details or internal terminology.",
    "- If a section has no content, omit the header entirely.",
    "- Do NOT include any top-level title, release name, version number, or date in the markdown body; those are handled separately.",
    "- Begin the markdown with the first section heading (e.g., '### What's New') rather than a document title.",
    "- Integrate executive summary lines into the 'What's New' section, adapting wording as needed for clarity.",
    "- Keep bullets concise, user-focused, and free of prohibited terminology.",
    "- Ensure the Markdown is clean and well-structured with headings, bullet lists, and tables rendered properly without placeholders or artifacts.",
    "- Replace any placeholder text (e.g., values wrapped in brackets) with actual data or omit the row if data is missing.",
    "",
    "TITLE REQUIREMENTS:",
    "- The title should be concise (5-10 words maximum)",
    "- It should capture the main theme of changes in this release",
    "- Focus on the most impactful changes from a user perspective",
    "- Do not repeat the title inside the 'markdown' content.",
    "- Make it professional and user-focused",
  ].join("\n\n");
}

function extractMarkdownAndTitle(
  raw: string,
  meta: Stage4Input["metadata"]
): { markdown: string; changelogTitle: ChangelogTitle } {
  if (!raw) {
    // Fallback if LLM fails
    const version = meta.version || "Unreleased";
    const date = meta.dateRange?.to
      ? new Date(meta.dateRange.to).toISOString().split("T")[0]
      : new Date().toISOString().split("T")[0];

    return {
      markdown: "",
      changelogTitle: {
        title: "Release Summary",
        version_number: version,
        date,
      },
    };
  }

  // Try to parse as JSON first
  try {
    const parsed = JSON.parse(raw);
    if (
      parsed &&
      typeof parsed.markdown === "string" &&
      typeof parsed.title === "string"
    ) {
      return {
        markdown: parsed.markdown,
        changelogTitle: {
          title: parsed.title,
          version_number: parsed.version_number || meta.version,
          date:
            parsed.date ||
            (meta.dateRange?.to
              ? new Date(meta.dateRange.to).toISOString().split("T")[0]
              : new Date().toISOString().split("T")[0]),
        },
      };
    }
  } catch {
    // not JSON
  }

  // Try to repair JSON
  try {
    const repaired = jsonrepair(raw);
    const parsed = JSON.parse(repaired);
    if (
      parsed &&
      typeof parsed.markdown === "string" &&
      typeof parsed.title === "string"
    ) {
      return {
        markdown: parsed.markdown,
        changelogTitle: {
          title: parsed.title,
          version_number: parsed.version_number || meta.version,
          date:
            parsed.date ||
            (meta.dateRange?.to
              ? new Date(meta.dateRange.to).toISOString().split("T")[0]
              : new Date().toISOString().split("T")[0]),
        },
      };
    }
  } catch {
    // fall through
  }

  // Fallback if JSON parsing fails - assume raw text is markdown only
  const version = meta.version || "Unreleased";
  const date = meta.dateRange?.to
    ? new Date(meta.dateRange.to).toISOString().split("T")[0]
    : new Date().toISOString().split("T")[0];

  return {
    markdown: raw.trim(),
    changelogTitle: {
      title: raw.trim().substring(0, 50) + (raw.length > 50 ? "..." : ""), // Use first part of raw text as title
      version_number: version,
      date,
    },
  };
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

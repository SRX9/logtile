import { NextRequest, NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import pool from "@/lib/pg";

const selectChangelogQuery = `
  select
    id,
    user_id,
    status,
    final_changelog_result,
    changelog_title
  from changelog_job
  where id = $1
  limit 1
`;

type ChangelogRow = {
  id: string;
  user_id: string;
  status: "pending" | "processing" | "completed" | "failed";
  final_changelog_result: unknown;
  changelog_title: unknown;
};

async function getSessionUser(req: NextRequest) {
  const session = await auth.api.getSession({ headers: req.headers });

  return session?.user;
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ jobId?: string }> },
) {
  try {
    const { jobId } = await params;

    if (!jobId) {
      return NextResponse.json(
        { error: "Job ID is required" },
        { status: 400 },
      );
    }

    const user = await getSessionUser(req);

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const result = await pool.query<ChangelogRow>(selectChangelogQuery, [jobId]);
    const job = result.rows[0];

    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    if (job.user_id !== user.id) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    // Parse final_changelog_result if it's a string
    let finalResult: any = null;
    const source = job.final_changelog_result as any;

    if (typeof source === "string") {
      try {
        finalResult = JSON.parse(source);
      } catch {
        finalResult = null;
      }
    } else {
      finalResult = source ?? null;
    }

    const response = {
      status: job.status,
      markdown: finalResult?.markdown ?? null,
      metrics: finalResult?.metrics ?? null,
      title:
        finalResult?.changelog_title ??
        finalResult?.changelogTitle ??
        job.changelog_title ??
        null,
    } as const;

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    console.error("Failed to fetch changelog data", error);

    return NextResponse.json(
      { error: "Failed to fetch changelog" },
      { status: 500 },
    );
  }
}

const updateChangelogMarkdownQuery = `
  update changelog_job
  set final_changelog_result = $2::jsonb,
      updated_at = now()
  where id = $1
    and user_id = $3
  returning final_changelog_result, status, changelog_title
`;

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ jobId?: string }> },
) {
  try {
    const { jobId } = await params;

    if (!jobId) {
      return NextResponse.json(
        { error: "Job ID is required" },
        { status: 400 },
      );
    }

    const user = await getSessionUser(req);

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let body: unknown = null;

    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid request body" },
        { status: 400 },
      );
    }

    const markdownValue = (body as Record<string, unknown>)?.markdown;

    if (typeof markdownValue !== "string") {
      return NextResponse.json(
        { error: "Markdown must be a string" },
        { status: 400 },
      );
    }

    const markdown = markdownValue;

    if (!markdown.trim().length) {
      return NextResponse.json(
        { error: "Markdown cannot be empty" },
        { status: 400 },
      );
    }

    const result = await pool.query<ChangelogRow>(selectChangelogQuery, [
      jobId,
    ]);
    const job = result.rows[0];

    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    if (job.user_id !== user.id) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    if (job.status !== "completed") {
      return NextResponse.json(
        { error: "Changelog can only be edited after completion" },
        { status: 400 },
      );
    }

    let finalResult: Record<string, unknown> | null = null;
    const source = job.final_changelog_result as any;

    if (typeof source === "string") {
      try {
        finalResult = JSON.parse(source ?? "null") as
          | Record<string, unknown>
          | null;
      } catch {
        finalResult = null;
      }
    } else if (source && typeof source === "object") {
      finalResult = source as Record<string, unknown>;
    }

    if (!finalResult || typeof finalResult !== "object") {
      finalResult = {};
    }

    finalResult.markdown = markdown;

    const updated = await pool.query<{
      final_changelog_result: unknown;
      status: "pending" | "processing" | "completed" | "failed";
      changelog_title: unknown;
    }>(updateChangelogMarkdownQuery, [jobId, JSON.stringify(finalResult), user.id]);

    const updatedRow = updated.rows[0];

    const normalizedFinalResult =
      typeof updatedRow?.final_changelog_result === "string"
        ? (() => {
            try {
              return JSON.parse(updatedRow.final_changelog_result as string);
            } catch {
              return { markdown };
            }
          })()
        : updatedRow?.final_changelog_result ?? finalResult;

    const response = {
      status: updatedRow?.status ?? job.status,
      markdown,
      metrics: normalizedFinalResult?.metrics ?? null,
      title:
        normalizedFinalResult?.changelog_title ??
        normalizedFinalResult?.changelogTitle ??
        updatedRow?.changelog_title ??
        null,
    } as const;

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    console.error("Failed to update changelog markdown", error);

    return NextResponse.json({ error: "Failed to update changelog" }, { status: 500 });
  }
}
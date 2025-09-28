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

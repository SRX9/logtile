import { NextRequest, NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import pool from "@/lib/pg";

const selectOverviewQuery = `
  select
    id,
    user_id,
    status,
    repo_full_name,
    date_range_start,
    date_range_end,
    selected_commits,
    created_at,
    updated_at
  from changelog_job
  where id = $1
  limit 1
`;

type OverviewRow = {
  id: string;
  user_id: string;
  status: "pending" | "processing" | "completed" | "failed";
  repo_full_name: string;
  date_range_start: string | null;
  date_range_end: string | null;
  selected_commits: unknown;
  created_at: string;
  updated_at: string;
};

async function getSessionUser(req: NextRequest) {
  const session = await auth.api.getSession({ headers: req.headers });
  return session?.user;
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ jobId?: string }> }
) {
  try {
    const { jobId } = await params;

    if (!jobId) {
      return NextResponse.json(
        { error: "Job ID is required" },
        { status: 400 }
      );
    }

    const user = await getSessionUser(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const result = await pool.query<OverviewRow>(selectOverviewQuery, [jobId]);
    const job = result.rows[0];

    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    if (job.user_id !== user.id) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    const response = {
      repo_full_name: job.repo_full_name,
      status: job.status,
      date_range_start: job.date_range_start,
      date_range_end: job.date_range_end,
      selected_commits: Array.isArray(job.selected_commits)
        ? job.selected_commits
        : ((job.selected_commits as any) ?? []),
      created_at: job.created_at,
      updated_at: job.updated_at,
    } as const;

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    console.error("Failed to fetch overview data", error);
    return NextResponse.json(
      { error: "Failed to fetch overview" },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import pool from "@/lib/pg";

const selectLogsQuery = `
  select
    id,
    user_id,
    repo_full_name,
    status,
    logs
  from changelog_job
  where id = $1
  limit 1
`;

type LogsRow = {
  id: string;
  user_id: string;
  repo_full_name: string;
  status: "pending" | "processing" | "completed" | "failed";
  logs: string[];
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

    const result = await pool.query<LogsRow>(selectLogsQuery, [jobId]);
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
      logs: job.logs ?? [],
    } as const;

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    console.error("Failed to fetch logs data", error);

    return NextResponse.json(
      { error: "Failed to fetch logs" },
      { status: 500 },
    );
  }
}

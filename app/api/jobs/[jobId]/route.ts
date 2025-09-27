import { NextRequest, NextResponse } from "next/server";

import { auth, decryptToken } from "@/lib/auth";
import pool from "@/lib/pg";

const selectJobQuery = `
  select
    id,
    user_id,
    repository_id,
    repo_id,
    repo_name,
    repo_owner,
    repo_full_name,
    github_token,
    selected_commits,
    status,
    logs,
    date_range_start,
    date_range_end,
    created_at,
    updated_at,
    final_changelog_result
  from changelog_job
  where id = $1
  limit 1
`;

type CommitMetadata = {
  sha: string;
  message: string | null;
  committedAt: string | null;
  authorName: string | null;
  authorEmail: string | null;
  htmlUrl: string | null;
};

type JobDetails = {
  id: string;
  user_id: string;
  repository_id: string;
  repo_id: string;
  repo_name: string;
  repo_owner: string;
  repo_full_name: string;
  github_token: string | null;
  selected_commits: CommitMetadata[];
  status: "pending" | "processing" | "completed" | "failed";
  logs: string[];
  date_range_start: string | null;
  date_range_end: string | null;
  created_at: string;
  updated_at: string;
  final_changelog_result: unknown;
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

    const result = await pool.query<JobDetails>(selectJobQuery, [jobId]);

    const job = result.rows[0];

    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    // Check if the job belongs to the current user
    if (job.user_id !== user.id) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    // Decrypt the GitHub token for the response
    let decryptedToken = null;
    if (job.github_token) {
      try {
        decryptedToken = decryptToken(job.github_token);
      } catch (error) {
        console.error("Failed to decrypt GitHub token:", error);
        // Continue without the token rather than failing the request
      }
    }

    // Return job with decrypted token
    const responseJob = {
      ...job,
      github_token: decryptedToken, // Include decrypted token for lambda use
    };

    return NextResponse.json(responseJob, { status: 200 });
  } catch (error) {
    console.error("Failed to fetch job details", error);
    return NextResponse.json(
      { error: "Failed to fetch job details" },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";

import { auth, encryptToken } from "@/lib/auth";
import pool from "@/lib/pg";
import { getGithubAccessTokenForUser } from "@/lib/github";
import { pushToChangelogJobQueue } from "./queue";

const PROVIDER = "github";

const selectRepositoryQuery = `
  select
    id,
    user_id,
    provider,
    repo_id,
    name,
    owner,
    full_name,
    description,
    html_url,
    default_branch,
    visibility,
    connected_at,
    updated_at
  from user_repository
  where user_id = $1 and provider = $2 and repo_id = $3
  limit 1
`;

type DbRepository = {
  id: string;
  user_id: string;
  provider: string;
  repo_id: string;
  name: string;
  owner: string;
  full_name: string;
  description: string | null;
  html_url: string;
  default_branch: string | null;
  visibility: string | null;
  connected_at: string;
  updated_at: string;
};

type CommitMetadata = {
  sha: string;
  message: string | null;
  committedAt: string | null;
  authorName: string | null;
  authorEmail: string | null;
  htmlUrl: string | null;
};

type CreateJobRequest = {
  selectedCommits: CommitMetadata[];
  dateRangeStart?: string | null;
  dateRangeEnd?: string | null;
  githubToken?: string; // Optional token override for lambda processing
};

async function getSessionUser(req: NextRequest) {
  const session = await auth.api.getSession({ headers: req.headers });
  return session?.user;
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ repoId?: string }> }
) {
  try {
    const { repoId } = await params;

    if (!repoId) {
      return NextResponse.json(
        { error: "Repository id is required" },
        { status: 400 }
      );
    }

    const user = await getSessionUser(req);

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const result = await pool.query<DbRepository>(selectRepositoryQuery, [
      user.id,
      PROVIDER,
      repoId,
    ]);

    const repository = result.rows[0];

    if (!repository) {
      return NextResponse.json(
        { error: "Repository not found" },
        { status: 404 }
      );
    }

    const body = (await req.json()) as CreateJobRequest;

    if (!body.selectedCommits || !Array.isArray(body.selectedCommits)) {
      return NextResponse.json(
        { error: "selectedCommits is required and must be an array" },
        { status: 400 }
      );
    }

    // Get the user's GitHub token for the lambda
    const userToken = await getGithubAccessTokenForUser(user.id);

    // Encrypt the token before storing
    const encryptedToken = userToken ? encryptToken(userToken) : null;

    // Insert the job record
    const insertJobQuery = `
      insert into changelog_job (
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
        date_range_end
      ) values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      returning id
    `;

    const jobResult = await pool.query(insertJobQuery, [
      user.id,
      repository.id,
      repository.repo_id,
      repository.name,
      repository.owner,
      repository.full_name,
      encryptedToken, // Store the encrypted token for lambda access
      JSON.stringify(body.selectedCommits),
      "pending",
      JSON.stringify([]),
      body.dateRangeStart || null,
      body.dateRangeEnd || null,
    ]);

    const jobId = jobResult.rows[0]?.id;

    await pushToChangelogJobQueue(jobId);

    if (!jobId) {
      throw new Error("Failed to create job record");
    }

    return NextResponse.json(
      {
        success: true,
        jobId,
        message: "Job created successfully",
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Failed to create changelog job", error);
    return NextResponse.json(
      { error: "Failed to create changelog job" },
      { status: 500 }
    );
  }
}

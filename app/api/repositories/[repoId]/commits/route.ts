import { NextRequest, NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import {
  fetchGithubRepositoryCommits,
  getGithubAccessTokenForUser,
  GithubCommit,
} from "@/lib/github";
import pool from "@/lib/pg";

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

type CommitSummary = {
  sha: string;
  message: string | null;
  committedAt: string | null;
  authorName: string | null;
  authorEmail: string | null;
  htmlUrl: string | null;
};

function getCommitIso(commit: GithubCommit | null | undefined) {
  return (
    commit?.commit?.author?.date ?? commit?.commit?.committer?.date ?? null
  );
}

function normalizeCommit(commit: GithubCommit): CommitSummary {
  const message = commit.commit?.message?.split("\n")[0] ?? null;
  const committedAt = getCommitIso(commit);
  const authorName =
    commit.author?.login ??
    commit.commit?.author?.name ??
    commit.commit?.committer?.name ??
    null;
  const authorEmail =
    commit.commit?.author?.email ?? commit.commit?.committer?.email ?? null;

  return {
    sha: commit.sha,
    message,
    committedAt,
    authorName,
    authorEmail,
    htmlUrl: commit.html_url ?? null,
  };
}

async function getSessionUser(req: NextRequest) {
  const session = await auth.api.getSession({ headers: req.headers });
  return session?.user ?? null;
}

export async function GET(
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

    const searchParams = req.nextUrl.searchParams;
    const since = searchParams.get("since");
    const until = searchParams.get("until");
    const branch = searchParams.get("branch");

    if (!since || !until) {
      return NextResponse.json(
        { error: "Date range is required" },
        { status: 400 }
      );
    }

    const sinceDate = new Date(since);
    const untilDate = new Date(until);

    if (
      Number.isNaN(sinceDate.getTime()) ||
      Number.isNaN(untilDate.getTime())
    ) {
      return NextResponse.json(
        { error: "Invalid date range provided" },
        { status: 400 }
      );
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

    const token = await getGithubAccessTokenForUser(user.id);

    if (!token) {
      return NextResponse.json(
        { error: "GitHub access token unavailable" },
        { status: 403 }
      );
    }

    const commits = await fetchGithubRepositoryCommits(
      token,
      repository.owner,
      repository.name,
      {
        branch: branch ?? repository.default_branch ?? undefined,
        since: sinceDate.toISOString(),
        until: untilDate.toISOString(),
        perPage: 100,
      }
    );

    const normalized = commits.map(normalizeCommit);

    return NextResponse.json({ commits: normalized });
  } catch (error) {
    console.error("Failed to fetch repository commits", error);
    return NextResponse.json(
      { error: "Failed to fetch repository commits" },
      { status: 500 }
    );
  }
}

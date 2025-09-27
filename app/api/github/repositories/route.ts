import { NextRequest, NextResponse } from "next/server";

import { getUserFromHeaders } from "@/lib/session";
import {
  fetchGithubUserRepositories,
  getGithubAccessTokenForUser,
  GithubRepo,
} from "@/lib/github";
import pool from "@/lib/pg";

const PROVIDER = "github";

type RepoPayload = {
  id: number;
  name: string;
  owner: string;
  fullName: string;
  description: string | null;
  htmlUrl: string;
  defaultBranch?: string | null;
  visibility?: string | null;
};

const upsertRepositoryQuery = `
  insert into user_repository (
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
  ) values (
    $1,
    $2,
    $3,
    $4,
    $5,
    $6,
    $7,
    $8,
    $9,
    $10,
    now(),
    now()
  )
  on conflict (user_id, provider, repo_id) do update set
    name = excluded.name,
    owner = excluded.owner,
    full_name = excluded.full_name,
    description = excluded.description,
    html_url = excluded.html_url,
    default_branch = excluded.default_branch,
    visibility = excluded.visibility,
    updated_at = now()
`;

const selectUserReposQuery = `
  select repo_id from user_repository where user_id = $1 and provider = $2
`;

export async function GET(req: NextRequest) {
  try {
    const user = await getUserFromHeaders(req.headers);

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = await getGithubAccessTokenForUser(user.id);

    if (!token) {
      return NextResponse.json(
        { error: "GitHub access token not found" },
        { status: 400 }
      );
    }

    const repos = await fetchGithubUserRepositories(token);

    const formatted = repos.map(
      (repo: GithubRepo): RepoPayload => ({
        id: repo.id,
        name: repo.name,
        owner: repo.owner.login,
        fullName: repo.full_name,
        description: repo.description,
        htmlUrl: repo.html_url,
        defaultBranch: repo.default_branch ?? null,
        visibility: repo.visibility ?? (repo.private ? "private" : "public"),
      })
    );

    const existing = await pool.query<{ repo_id: string }>(
      selectUserReposQuery,
      [user.id, PROVIDER]
    );

    const existingRepoIds = existing.rows.map((row) => row.repo_id);

    return NextResponse.json({
      repositories: formatted,
      connectedRepoIds: existingRepoIds,
    });
  } catch (error) {
    console.error("Failed to fetch GitHub repositories", error);
    return NextResponse.json(
      { error: "Failed to fetch GitHub repositories" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getUserFromHeaders(req.headers);

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = await getGithubAccessTokenForUser(user.id);

    if (!token) {
      return NextResponse.json(
        { error: "GitHub access token not found" },
        { status: 400 }
      );
    }

    const body = await req.json();
    const repo = body?.repository as RepoPayload | undefined;

    if (!repo) {
      return NextResponse.json(
        { error: "Repository payload missing" },
        { status: 400 }
      );
    }

    const values = [
      user.id,
      PROVIDER,
      String(repo.id),
      repo.name,
      repo.owner,
      repo.fullName,
      repo.description ?? null,
      repo.htmlUrl,
      repo.defaultBranch ?? null,
      repo.visibility ?? null,
    ];

    await pool.query(upsertRepositoryQuery, values);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to save GitHub repository", error);
    return NextResponse.json(
      { error: "Failed to save GitHub repository" },
      { status: 500 }
    );
  }
}

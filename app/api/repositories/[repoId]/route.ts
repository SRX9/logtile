import { NextRequest, NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import {
  fetchGithubRepositoryDetails,
  getGithubAccessTokenForUser,
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

async function getSessionUser(req: NextRequest) {
  const session = await auth.api.getSession({ headers: req.headers });

  return session?.user;
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ repoId?: string }> },
) {
  try {
    const { repoId } = await params;

    if (!repoId) {
      return NextResponse.json(
        { error: "Repository id is required" },
        { status: 400 },
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
        { status: 404 },
      );
    }

    const token = await getGithubAccessTokenForUser(user.id);

    if (!token) {
      return NextResponse.json(
        {
          repository,
          details: null,
          changelogs: [],
          warning:
            "GitHub access token unavailable; live repository data not loaded.",
        },
        { status: 200 },
      );
    }

    const githubDetails = await fetchGithubRepositoryDetails(
      token,
      repository.owner,
      repository.name,
    );

    return NextResponse.json({
      repository,
      details: githubDetails,
      changelogs: [],
    });
  } catch (error) {
    console.error("Failed to fetch repository details", error);

    return NextResponse.json(
      { error: "Failed to fetch repository details" },
      { status: 500 },
    );
  }
}

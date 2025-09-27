import { NextRequest, NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import pool from "@/lib/pg";

const PROVIDER = "github";

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

const selectRepositoriesQuery = `
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
  where user_id = $1 and provider = $2
  order by connected_at desc
`;

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
  returning *
`;

async function getSessionUser(req: NextRequest) {
  const session = await auth.api.getSession({ headers: req.headers });
  return session?.user;
}

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser(req);

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const result = await pool.query<DbRepository>(selectRepositoriesQuery, [
      user.id,
      PROVIDER,
    ]);

    return NextResponse.json({ repositories: result.rows });
  } catch (error) {
    console.error("Failed to fetch connected repositories", error);
    return NextResponse.json(
      { error: "Failed to fetch connected repositories" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser(req);

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();

    const {
      repoId,
      name,
      owner,
      fullName,
      description,
      htmlUrl,
      defaultBranch,
      visibility,
    } = body ?? {};

    if (!repoId || !name || !owner || !htmlUrl) {
      return NextResponse.json(
        { error: "Missing required repository fields" },
        { status: 400 }
      );
    }

    const finalFullName = fullName ?? `${owner}/${name}`;

    const values = [
      user.id,
      PROVIDER,
      String(repoId),
      name,
      owner,
      finalFullName,
      description ?? null,
      htmlUrl,
      defaultBranch ?? null,
      visibility ?? null,
    ];

    const result = await pool.query<DbRepository>(
      upsertRepositoryQuery,
      values
    );

    return NextResponse.json({ repository: result.rows[0] }, { status: 201 });
  } catch (error) {
    console.error("Failed to connect repository", error);
    return NextResponse.json(
      { error: "Failed to connect repository" },
      { status: 500 }
    );
  }
}

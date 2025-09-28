import { NextRequest, NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import pool from "@/lib/pg";

const PROVIDER = "github";
const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 10;

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

type DbChangelogRow = {
  id: string;
  status: "pending" | "processing" | "completed" | "failed";
  date_range_start: string | null;
  date_range_end: string | null;
  created_at: string | Date;
  updated_at: string | Date;
  commit_count: number | null;
  changelog_title: any; // JSONB column
};

type CursorPayload = {
  created_at: string;
  id: string;
};

async function getSessionUser(req: NextRequest) {
  const session = await auth.api.getSession({ headers: req.headers });

  return session?.user;
}

function encodeCursor(row: DbChangelogRow): string {
  const payload: CursorPayload = {
    created_at:
      row.created_at instanceof Date
        ? row.created_at.toISOString()
        : row.created_at,
    id: row.id,
  };

  return Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
}

function decodeCursor(cursor: string): CursorPayload | null {
  try {
    const decoded = Buffer.from(cursor, "base64url").toString("utf8");
    const parsed = JSON.parse(decoded) as CursorPayload;

    if (
      typeof parsed?.id !== "string" ||
      typeof parsed?.created_at !== "string"
    ) {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
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

    const repoResult = await pool.query<DbRepository>(selectRepositoryQuery, [
      user.id,
      PROVIDER,
      repoId,
    ]);

    const repository = repoResult.rows[0];

    if (!repository) {
      return NextResponse.json(
        { error: "Repository not found" },
        { status: 404 },
      );
    }

    const url = new URL(req.url);
    const limitParam = Number.parseInt(url.searchParams.get("limit") ?? "", 10);
    const limit =
      Number.isFinite(limitParam) && limitParam > 0
        ? Math.min(limitParam, MAX_LIMIT)
        : DEFAULT_LIMIT;

    const cursorParam = url.searchParams.get("cursor");
    const cursor = cursorParam ? decodeCursor(cursorParam) : null;

    if (cursorParam && !cursor) {
      return NextResponse.json({ error: "Invalid cursor" }, { status: 400 });
    }

    const values: Array<string | number> = [user.id, repository.id];
    let cursorClause = "";

    if (cursor) {
      values.push(cursor.created_at, cursor.id);
      cursorClause = "and (created_at, id) < ($3::timestamptz, $4::uuid)";
    }

    const limitParamIndex = values.length + 1;

    values.push(limit + 1);

    const query = `
      select
        id,
        status,
        date_range_start,
        date_range_end,
        created_at,
        updated_at,
        changelog_title,
        coalesce(jsonb_array_length(selected_commits), 0) as commit_count
      from changelog_job
      where user_id = $1
        and repository_id = $2
        ${cursorClause}
      order by created_at desc, id desc
      limit $${limitParamIndex}
    `;

    const result = await pool.query<DbChangelogRow>(query, values);

    const rows = result.rows;
    const hasMore = rows.length > limit;
    const items = hasMore ? rows.slice(0, -1) : rows;

    const changelogs = items.map((row) => ({
      id: row.id,
      status: row.status,
      date_range_start: row.date_range_start,
      date_range_end: row.date_range_end,
      created_at:
        row.created_at instanceof Date
          ? row.created_at.toISOString()
          : row.created_at,
      updated_at:
        row.updated_at instanceof Date
          ? row.updated_at.toISOString()
          : row.updated_at,
      commit_count: row.commit_count ?? 0,
      changelog_title: row.changelog_title,
    }));

    const lastReturnedRow = items[items.length - 1];
    const nextCursor =
      hasMore && lastReturnedRow ? encodeCursor(lastReturnedRow) : null;

    return NextResponse.json({
      changelogs,
      pagination: {
        limit,
        nextCursor,
        hasMore,
      },
    });
  } catch (error) {
    console.error("Failed to fetch repository changelogs", error);

    return NextResponse.json(
      { error: "Failed to fetch repository changelogs" },
      { status: 500 },
    );
  }
}

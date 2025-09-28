import { NextRequest, NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import db from "@/lib/pg";

export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");

    // Fetch changelog jobs for the authenticated user
    const { rows } = await db.query(
      `SELECT
        id,
        repo_name,
        repo_owner,
        repo_full_name,
        status,
        created_at,
        updated_at,
        changelog_title,
        COALESCE(jsonb_array_length(selected_commits), 0) as commit_count
      FROM changelog_job
      WHERE user_id = $1
      ORDER BY created_at DESC
      LIMIT $2 OFFSET $3`,
      [session.user?.id, limit, offset],
    );

    return NextResponse.json({
      jobs: rows,
      pagination: {
        limit,
        offset,
        hasMore: rows.length === limit,
      },
    });
  } catch (error) {
    console.error("Error fetching changelog jobs:", error);

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

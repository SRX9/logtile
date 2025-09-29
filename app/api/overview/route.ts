import { NextRequest, NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import db from "@/lib/pg";

type OverviewResponse = {
  totalChangelogs: number;
  totalRepositories: number;
  lastGeneratedAt: string | null;
};

export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;

    const [changelogResult, repositoryResult, lastGeneratedResult] =
      await Promise.all([
        db.query<{ total: string }>(
          `select count(*) as total from changelog_job where user_id = $1`,
          [userId]
        ),
        db.query<{ total: string }>(
          `select count(*) as total from user_repository where user_id = $1`,
          [userId]
        ),
        db.query<{ last_generated_at: string | null }>(
          `select max(updated_at) as last_generated_at from changelog_job where user_id = $1 and status = 'completed'`,
          [userId]
        ),
      ]);

    const response: OverviewResponse = {
      totalChangelogs: Number(changelogResult.rows[0]?.total ?? 0),
      totalRepositories: Number(repositoryResult.rows[0]?.total ?? 0),
      lastGeneratedAt: lastGeneratedResult.rows[0]?.last_generated_at ?? null,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Failed to load overview stats", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

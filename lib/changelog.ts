import pool from "@/lib/pg";

type ChangelogRow = {
  id: string;
  status: "pending" | "processing" | "completed" | "failed";
  final_changelog_result: unknown;
  changelog_title: unknown;
  created_at: string | Date;
  updated_at: string | Date;
};

const selectChangelogQuery = `
  select
    id,
    status,
    final_changelog_result,
    changelog_title,
    created_at,
    updated_at
  from changelog_job
  where id = $1
  limit 1
`;

type PublicChangelog = {
  title: string | null;
  subtitle?: string | null;
  version?: string | null;
  date?: string | null;
  scope?: string | null;
  markdown: string | null;
  createdAt: string;
  updatedAt: string;
};

function parseChangelog(row: ChangelogRow): PublicChangelog | null {
  const source = row.final_changelog_result;
  let parsed: any = null;

  if (typeof source === "string") {
    try {
      parsed = JSON.parse(source);
    } catch {
      parsed = null;
    }
  } else if (source && typeof source === "object") {
    parsed = source;
  }

  const titleData =
    parsed?.changelog_title ??
    parsed?.changelogTitle ??
    row.changelog_title ??
    null;

  const markdown = parsed?.markdown ?? null;

  return {
    title: titleData?.title ?? null,
    subtitle: titleData?.subtitle ?? null,
    version: titleData?.version_number ?? titleData?.version ?? null,
    date: titleData?.date ?? null,
    scope: titleData?.scope ?? null,
    markdown,
    createdAt:
      row.created_at instanceof Date
        ? row.created_at.toISOString()
        : row.created_at,
    updatedAt:
      row.updated_at instanceof Date
        ? row.updated_at.toISOString()
        : row.updated_at,
  };
}

export async function getPublicChangelog(
  jobId: string
): Promise<PublicChangelog> {
  const result = await pool.query<ChangelogRow>(selectChangelogQuery, [jobId]);
  const row = result.rows[0];

  if (!row || row.status !== "completed") {
    throw new Error("Changelog not ready");
  }

  const parsed = parseChangelog(row);

  if (!parsed || !parsed.markdown) {
    throw new Error("Changelog not available");
  }

  return parsed;
}

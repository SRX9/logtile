import { NextRequest, NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import {
  fetchGithubCommitComparison,
  fetchGithubRepositoryCommits,
  fetchGithubRepositoryDetails,
  fetchGithubRepositoryLatestCommit,
  fetchGithubRepositoryTags,
  getGithubAccessTokenForUser,
  GithubCommit,
  GithubTag,
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

type HeadCommitSummary = {
  sha: string;
  message: string | null;
  committedAt: string | null;
};

type TagSummary = {
  name: string;
  sha: string;
  commitUrl: string | null;
};

type ComparisonSummary = {
  baseRef: string;
  headRef: string;
  totalCommits: number;
  uniqueContributors: number;
  htmlUrl: string | null;
};

type SuggestedDateRange = {
  from: string | null;
  to: string | null;
};

type GenerateOptionsResponse = {
  repository: {
    repo_id: string;
    name: string;
    owner: string;
    full_name: string;
  };
  defaultBranch: string | null;
  headCommit: HeadCommitSummary | null;
  tags: TagSummary[];
  suggestedDateRange: SuggestedDateRange | null;
  comparison?: ComparisonSummary | null;
  warning?: string;
  commitsPreview?: GithubCommit[];
};

async function getSessionUser(req: NextRequest) {
  const session = await auth.api.getSession({ headers: req.headers });
  return session?.user ?? null;
}

function getCommitIso(commit: GithubCommit | null | undefined) {
  return (
    commit?.commit?.author?.date ?? commit?.commit?.committer?.date ?? null
  );
}

function subtractDaysFromIso(iso: string, days: number) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return iso;
  }

  date.setUTCDate(date.getUTCDate() - days);
  return date.toISOString();
}

function countUniqueContributors(commits: GithubCommit[]) {
  const seen = new Set<string>();

  commits.forEach((commit) => {
    const identifier =
      commit.author?.login?.toLowerCase() ??
      commit.commit?.author?.email?.toLowerCase() ??
      commit.commit?.author?.name?.toLowerCase() ??
      commit.commit?.committer?.email?.toLowerCase() ??
      commit.commit?.committer?.name?.toLowerCase() ??
      commit.sha;

    if (identifier) {
      seen.add(identifier);
    }
  });

  return seen.size;
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
      const payload: GenerateOptionsResponse = {
        repository: {
          repo_id: repository.repo_id,
          name: repository.name,
          owner: repository.owner,
          full_name: repository.full_name,
        },
        defaultBranch: repository.default_branch,
        headCommit: null,
        tags: [],
        suggestedDateRange: null,
        comparison: null,
        warning:
          "GitHub access token unavailable; commit range options could not be loaded.",
      };

      return NextResponse.json(payload, { status: 200 });
    }

    let warningMessages: string[] = [];

    let defaultBranch = repository.default_branch;

    try {
      const details = await fetchGithubRepositoryDetails(
        token,
        repository.owner,
        repository.name
      );
      defaultBranch = details.default_branch ?? defaultBranch;
    } catch (error) {
      console.error("Failed to fetch GitHub repository details", error);
      warningMessages.push("Unable to confirm default branch from GitHub.");
    }

    if (!defaultBranch) {
      defaultBranch = "main";
      warningMessages.push(
        "Default branch not set; assuming 'main' for commit comparisons."
      );
    }

    let headCommit: GithubCommit | null = null;

    try {
      headCommit = await fetchGithubRepositoryLatestCommit(
        token,
        repository.owner,
        repository.name,
        defaultBranch
      );
    } catch (error) {
      console.error("Failed to fetch latest commit for repository", error);
      warningMessages.push(
        "Unable to load the latest commit for the repository."
      );
    }

    const headCommitSummary: HeadCommitSummary | null = headCommit
      ? {
          sha: headCommit.sha,
          message: headCommit.commit?.message?.split("\n")[0] ?? null,
          committedAt: getCommitIso(headCommit),
        }
      : null;

    let tags: GithubTag[] = [];

    try {
      tags = await fetchGithubRepositoryTags(
        token,
        repository.owner,
        repository.name
      );
    } catch (error) {
      console.error("Failed to fetch repository tags", error);
      warningMessages.push("Unable to load repository tags from GitHub.");
    }

    const normalizedTags: TagSummary[] = tags.map((tag) => ({
      name: tag.name,
      sha: tag.commit.sha,
      commitUrl: tag.commit.url ?? null,
    }));

    let comparison: ComparisonSummary | null = null;
    let earliestCompareTimestamp: number | null = null;

    const baseRef = normalizedTags[0]?.name ?? null;
    const headRef = defaultBranch;

    if (baseRef && headRef) {
      try {
        const compare = await fetchGithubCommitComparison(
          token,
          repository.owner,
          repository.name,
          baseRef,
          headRef
        );

        comparison = {
          baseRef,
          headRef,
          totalCommits: compare.total_commits,
          uniqueContributors: countUniqueContributors(compare.commits),
          htmlUrl: compare.html_url ?? null,
        };

        compare.commits.forEach((commit) => {
          const iso = getCommitIso(commit);
          if (!iso) {
            return;
          }
          const timestamp = new Date(iso).getTime();
          if (Number.isNaN(timestamp)) {
            return;
          }
          if (
            earliestCompareTimestamp === null ||
            timestamp < earliestCompareTimestamp
          ) {
            earliestCompareTimestamp = timestamp;
          }
        });
      } catch (error) {
        console.error("Failed to fetch commit comparison", error);
        warningMessages.push(
          "Unable to compute commit preview between the selected references."
        );
      }
    } else if (!normalizedTags.length) {
      warningMessages.push("No tags found for this repository.");
    }

    const headCommitIso = headCommitSummary?.committedAt ?? null;

    let suggestedFrom: string | null = null;
    let suggestedTo: string | null = null;

    if (earliestCompareTimestamp !== null) {
      suggestedFrom = new Date(earliestCompareTimestamp).toISOString();
    } else if (headCommitIso) {
      suggestedFrom = subtractDaysFromIso(headCommitIso, 7);
    }

    if (headCommitIso) {
      suggestedTo = headCommitIso;
    }

    let commitsPreview: GithubCommit[] | undefined;

    if (suggestedFrom || suggestedTo) {
      try {
        const commits = await fetchGithubRepositoryCommits(
          token,
          repository.owner,
          repository.name,
          {
            branch: defaultBranch,
            since: suggestedFrom,
            until: suggestedTo,
            perPage: 100,
          }
        );
        commitsPreview = commits;
      } catch (error) {
        console.error("Failed to fetch commits preview", error);
        warningMessages.push(
          "Unable to load commits in the suggested date range."
        );
      }
    }

    const payload: GenerateOptionsResponse = {
      repository: {
        repo_id: repository.repo_id,
        name: repository.name,
        owner: repository.owner,
        full_name: repository.full_name,
      },
      defaultBranch,
      headCommit: headCommitSummary,
      tags: normalizedTags,
      suggestedDateRange:
        suggestedFrom || suggestedTo
          ? {
              from: suggestedFrom,
              to: suggestedTo,
            }
          : null,
      comparison,
      commitsPreview,
    };

    if (warningMessages.length) {
      payload.warning = warningMessages.join(" ");
    }

    return NextResponse.json(payload, { status: 200 });
  } catch (error) {
    console.error("Failed to load changelog generation options", error);
    return NextResponse.json(
      { error: "Failed to load changelog generation options" },
      { status: 500 }
    );
  }
}

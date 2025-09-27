import pool from "./pg";

const GITHUB_API_BASE = "https://api.github.com";

type GithubRequestInit = RequestInit & {
  cache?: RequestCache;
};

async function fetchFromGithub<T>(
  token: string,
  input: string,
  init: GithubRequestInit = {}
): Promise<T> {
  const response = await fetch(input, {
    ...init,
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "X-GitHub-Api-Version": "2022-11-28",
      ...(init.headers ?? {}),
    },
    cache: "no-store",
  });

  if (!response.ok) {
    const errorBody = await response.text().catch(() => "");
    throw new Error(
      `GitHub API responded with status ${response.status}: ${errorBody}`
    );
  }

  return (await response.json()) as T;
}

export type GithubRepo = {
  id: number;
  name: string;
  full_name: string;
  description: string | null;
  html_url: string;
  default_branch?: string;
  visibility?: string;
  private: boolean;
  owner: {
    login: string;
  };
};

export type GithubRepoDetails = GithubRepo & {
  stargazers_count: number;
  forks_count: number;
  watchers_count: number;
  subscribers_count: number;
  open_issues_count: number;
  topics: string[];
  language: string | null;
  license: { name: string } | null;
  archived: boolean;
  disabled: boolean;
  created_at: string;
  updated_at: string;
  pushed_at: string;
  owner: GithubRepo["owner"] & {
    avatar_url?: string;
    html_url?: string;
  };
};

export async function getGithubAccessTokenForUser(
  userId: string
): Promise<string | null> {
  const query = `
    select "accessToken"
    from account
    where "userId" = $1 and "providerId" = 'github'
    order by "createdAt" desc
    limit 1
  `;

  const result = await pool.query<{ accessToken: string | null }>(query, [
    userId,
  ]);

  const token = result.rows[0]?.accessToken;
  return token ?? null;
}

export async function fetchGithubUserRepositories(token: string) {
  const repos = await fetchFromGithub<GithubRepo[]>(
    token,
    `${GITHUB_API_BASE}/user/repos?per_page=100`
  );
  return repos;
}

export async function fetchGithubRepositoryDetails(
  token: string,
  owner: string,
  repo: string
) {
  const details = await fetchFromGithub<GithubRepoDetails>(
    token,
    `${GITHUB_API_BASE}/repos/${owner}/${repo}`
  );
  return details;
}

export type GithubTag = {
  name: string;
  commit: {
    sha: string;
    url: string;
  };
};

export const fetchGithubRepositoryTags = async (
  token: string,
  owner: string,
  repo: string,
  perPage = 50
) => {
  const tags = await fetchFromGithub<GithubTag[]>(
    token,
    `${GITHUB_API_BASE}/repos/${owner}/${repo}/tags?per_page=${perPage}`
  );
  return tags;
};

export type GithubCommit = {
  sha: string;
  commit: {
    author?: {
      name?: string;
      email?: string;
      date?: string;
    };
    committer?: {
      name?: string;
      email?: string;
      date?: string;
    };
    message?: string;
  };
  author?: {
    login?: string;
    avatar_url?: string;
    html_url?: string;
  };
  committer?: {
    login?: string;
    avatar_url?: string;
    html_url?: string;
  };
  html_url?: string;
};

export const fetchGithubRepositoryLatestCommit = async (
  token: string,
  owner: string,
  repo: string,
  branch: string
) => {
  const commits = await fetchFromGithub<GithubCommit[]>(
    token,
    `${GITHUB_API_BASE}/repos/${owner}/${repo}/commits?sha=${encodeURIComponent(
      branch
    )}&per_page=1`
  );

  return commits[0] ?? null;
};

export type GithubCompareResponse = {
  status: string;
  ahead_by: number;
  behind_by: number;
  total_commits: number;
  commits: GithubCommit[];
  html_url?: string;
};

export const fetchGithubCommitComparison = async (
  token: string,
  owner: string,
  repo: string,
  base: string,
  head: string
) => {
  const compare = await fetchFromGithub<GithubCompareResponse>(
    token,
    `${GITHUB_API_BASE}/repos/${owner}/${repo}/compare/${encodeURIComponent(
      base
    )}...${encodeURIComponent(head)}`
  );

  return compare;
};

export type FetchGithubRepositoryCommitsOptions = {
  branch?: string | null;
  since?: string | null;
  until?: string | null;
  perPage?: number;
};

export const fetchGithubRepositoryCommits = async (
  token: string,
  owner: string,
  repo: string,
  options: FetchGithubRepositoryCommitsOptions = {}
) => {
  const url = new URL(`${GITHUB_API_BASE}/repos/${owner}/${repo}/commits`);

  if (options.branch) {
    url.searchParams.set("sha", options.branch);
  }

  if (options.since) {
    url.searchParams.set("since", options.since);
  }

  if (options.until) {
    url.searchParams.set("until", options.until);
  }

  url.searchParams.set("per_page", String(options.perPage ?? 100));

  const commits = await fetchFromGithub<GithubCommit[]>(token, url.toString());
  return commits;
};

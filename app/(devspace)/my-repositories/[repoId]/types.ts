import { ChangelogTitle } from "@/lambda/types";

export type Repository = {
  id: string;
  repo_id: string;
  name: string;
  owner: string;
  full_name: string;
  description: string | null;
  html_url: string;
  default_branch: string | null;
  visibility: string | null;
  connected_at: string;
};

export type GithubDetails = {
  full_name: string;
  description: string | null;
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
  default_branch?: string;
  owner: {
    login: string;
    avatar_url?: string;
    html_url?: string;
  };
};

export type ChangelogMetadata = {
  id: string;
  status: "pending" | "processing" | "completed" | "failed";
  date_range_start: string | null;
  date_range_end: string | null;
  created_at: string;
  updated_at: string;
  commit_count: number;
  changelog_title: ChangelogTitle | null;
};

export type RepositoryChangelogResponse = {
  changelogs: ChangelogMetadata[];
  pagination: {
    limit: number;
    nextCursor: string | null;
    hasMore: boolean;
  };
};

export type ApiResponse = {
  repository: Repository;
  details: GithubDetails | null;
  changelogs: unknown[];
  warning?: string;
  error?: string;
};

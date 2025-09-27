import { SVGProps } from "react";

export type IconSvgProps = SVGProps<SVGSVGElement> & {
  size?: number;
};

export type ChangelogJobStatus =
  | "pending"
  | "processing"
  | "completed"
  | "failed";

export type ChangelogJob = {
  id: string;
  user_id: string;
  repository_id: string;
  repo_id: string;
  repo_name: string;
  repo_owner: string;
  repo_full_name: string;
  status: ChangelogJobStatus;
  selected_commits: any[];
  logs: any[];
  date_range_start: string | null;
  date_range_end: string | null;
  created_at: string;
  updated_at: string;
  stage_result?: any;
  final_changelog_result?: any;
};

export type ChangelogJobSummary = {
  id: string;
  repo_name: string;
  repo_owner: string;
  repo_full_name: string;
  status: ChangelogJobStatus;
  created_at: string;
  updated_at: string;
  commit_count: number;
};

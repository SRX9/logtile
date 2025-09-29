"use client";

import type { JobDetails } from "../types";

import { Badge } from "@heroui/badge";

import { getStatusBadgeVariant, getStatusColor } from "../utils";
import { fontHeading } from "@/config/fonts";

type JobHeaderProps = {
  jobId: string;
  job: Pick<JobDetails, "status" | "repo_full_name">;
};

export function JobHeader({ jobId, job }: JobHeaderProps) {
  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
      <div className="space-y-2">
        <h1
          className={`${fontHeading.className} text-2xl font-semibold text-slate-900 dark:text-slate-100`}
        >
          Changelog Generation
        </h1>
        <div className="flex flex-wrap items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
          <span className="font-medium text-slate-700 dark:text-slate-300">
            Job ID:
          </span>
          <span className="font-mono text-xs md:text-sm break-all">
            {jobId}
          </span>
        </div>
        <div className="text-sm text-slate-600 dark:text-slate-400">
          Repository:
          <span className="ml-2 font-medium text-slate-900 dark:text-slate-100">
            {job.repo_full_name}
          </span>
        </div>
      </div>

      <Badge
        className="self-start"
        color={getStatusColor(job.status)}
        size="lg"
        variant={getStatusBadgeVariant(job.status)}
      >
        {job.status.toUpperCase()}
      </Badge>
    </div>
  );
}

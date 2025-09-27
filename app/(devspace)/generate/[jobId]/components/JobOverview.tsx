"use client";

import { Card, CardBody, CardHeader } from "@heroui/card";
import { Divider } from "@heroui/divider";

import { formatDateRange, formatDateTime } from "../utils";
import type { JobDetails } from "../types";

type JobOverviewProps = {
  job: JobDetails;
};

export function JobOverview({ job }: JobOverviewProps) {
  return (
    <Card>
      <CardHeader>
        <h2 className="text-lg font-semibold">Job Overview</h2>
      </CardHeader>
      <CardBody className="space-y-4 text-sm">
        <OverviewRow label="Repository" value={job.repo_full_name} />

        <Divider />

        <OverviewRow
          label="Date Range"
          value={formatDateRange(job.date_range_start, job.date_range_end)}
        />

        <Divider />

        <OverviewRow
          label="Commits Selected"
          value={`${job.selected_commits.length} commits`}
        />

        <Divider />

        <OverviewRow
          label="Created At"
          value={formatDateTime(job.created_at)}
        />

        <Divider />

        <OverviewRow
          label="Last Updated"
          value={formatDateTime(job.updated_at)}
        />
      </CardBody>
    </Card>
  );
}

type OverviewRowProps = {
  label: string;
  value: string;
};

function OverviewRow({ label, value }: OverviewRowProps) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
        {label}
      </p>
      <p className="mt-1 text-sm text-slate-900 dark:text-slate-100">{value}</p>
    </div>
  );
}

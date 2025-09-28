import { formatDateRange, formatDateTime } from "../utils";
import type { JobDetails } from "../types";
import { Card, CardBody } from "@heroui/card";

type JobOverviewProps = {
  job: JobDetails;
};

export function JobOverview({ job }: JobOverviewProps) {
  return (
    <Card shadow="sm" className="p-4">
      <CardBody>
        <header className="mb-4">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
            Job Overview
          </h2>
        </header>

        <dl className="space-y-4">
          <OverviewRow label="Repository" value={job.repo_full_name} />
          <OverviewRow
            label="Date Range"
            value={formatDateRange(job.date_range_start, job.date_range_end)}
          />
          <OverviewRow
            label="Commits Selected"
            value={`${job.selected_commits.length} commits`}
          />
          <OverviewRow label="Created" value={formatDateTime(job.created_at)} />
          <OverviewRow label="Updated" value={formatDateTime(job.updated_at)} />
        </dl>
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
    <div className="flex items-center justify-between text-sm">
      <dt className="text-slate-500 dark:text-slate-400">{label}</dt>
      <dd className="font-medium text-slate-900 dark:text-slate-100">
        {value}
      </dd>
    </div>
  );
}

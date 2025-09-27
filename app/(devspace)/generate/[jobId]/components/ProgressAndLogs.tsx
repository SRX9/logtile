"use client";

import { useMemo } from "react";

import { Badge } from "@heroui/badge";
import { Button } from "@heroui/button";
import { Card, CardBody, CardHeader } from "@heroui/card";
import { Divider } from "@heroui/divider";
import { Progress } from "@heroui/progress";
import { Spinner } from "@heroui/spinner";

import { formatDateTime } from "../utils";
import type { JobDetails, JobLogEntry } from "../types";

type ProgressAndLogsProps = {
  job: JobDetails;
  logs: JobLogEntry[];
  onRefresh?: () => void;
  isRefreshing?: boolean;
};

export function ProgressAndLogs({
  job,
  logs,
  onRefresh,
  isRefreshing,
}: ProgressAndLogsProps) {
  const statusHint = useMemo(() => buildStatusHint(job.status), [job.status]);

  return (
    <Card>
      <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-lg font-semibold">Progress & Logs</h2>
          {statusHint && (
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {statusHint}
            </p>
          )}
        </div>
        {onRefresh && (
          <Button
            variant="flat"
            color="default"
            onPress={onRefresh}
            isLoading={isRefreshing}
          >
            Refresh
          </Button>
        )}
      </CardHeader>
      <CardBody className="space-y-6">
        <StatusState status={job.status} />

        <Divider />

        <LogsList logs={logs} />
      </CardBody>
    </Card>
  );
}

function StatusState({ status }: { status: JobDetails["status"] }) {
  if (status === "pending") {
    return (
      <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-slate-200 py-10 text-center text-sm text-slate-600 dark:border-slate-700 dark:text-slate-400">
        <Spinner size="lg" label="Queued" labelColor="secondary" />
        <p>Job is queued and waiting to start processing…</p>
      </div>
    );
  }

  if (status === "processing") {
    return (
      <div className="rounded-xl border border-slate-200 p-6 dark:border-slate-700">
        <div className="flex flex-wrap items-center gap-4">
          <Spinner size="sm" />
          <div className="min-w-[200px] flex-1">
            <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
              Processing changelog…
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              This may take a few minutes depending on the number of commits
            </p>
          </div>
        </div>
        <Progress
          value={45}
          className="mt-4"
          aria-label="Processing progress"
        />
      </div>
    );
  }

  if (status === "completed") {
    return (
      <div className="rounded-xl border border-green-200 bg-green-50 p-6 text-center dark:border-green-900/40 dark:bg-green-900/20">
        <svg
          className="mx-auto h-10 w-10 text-green-600 dark:text-green-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M5 13l4 4L19 7"
          />
        </svg>
        <h3 className="mt-4 text-lg font-semibold text-green-700 dark:text-green-300">
          Changelog ready!
        </h3>
        <p className="mt-1 text-sm text-green-700/80 dark:text-green-300/80">
          Review the markdown below or download it for sharing.
        </p>
      </div>
    );
  }

  if (status === "failed") {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center dark:border-red-900/40 dark:bg-red-900/20">
        <svg
          className="mx-auto h-10 w-10 text-red-600 dark:text-red-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M6 18L18 6M6 6l12 12"
          />
        </svg>
        <h3 className="mt-4 text-lg font-semibold text-red-700 dark:text-red-300">
          Generation failed
        </h3>
        <p className="mt-1 text-sm text-red-700/80 dark:text-red-300/80">
          Check the activity log for details or retry the job.
        </p>
      </div>
    );
  }

  return null;
}

function LogsList({ logs }: { logs: JobLogEntry[] }) {
  if (logs.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-200 py-6 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
        No logs yet.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
          Activity Log
        </h3>
        <Badge color="default" variant="flat">
          {logs.length} entries
        </Badge>
      </div>

      <div className="max-h-80 space-y-2 overflow-y-auto rounded-lg border border-slate-200 p-2 dark:border-slate-800">
        {logs.map((log, index) => (
          <LogRow key={`${log.timestamp}-${index}`} log={log} />
        ))}
      </div>
    </div>
  );
}

function LogRow({ log }: { log: JobLogEntry }) {
  const badgeColor =
    log.level === "error"
      ? "danger"
      : log.level === "warning"
        ? "warning"
        : "default";

  return (
    <div className="flex flex-col gap-1 rounded-md bg-slate-50 p-2 text-sm text-slate-700 dark:bg-slate-800 dark:text-slate-300">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
          {formatDateTime(log.timestamp)}
        </span>
        <Badge size="sm" color={badgeColor} variant="flat">
          {log.level}
        </Badge>
      </div>
      <p>{log.message}</p>
    </div>
  );
}

function buildStatusHint(status: JobDetails["status"]) {
  switch (status) {
    case "pending":
      return "Waiting for available worker";
    case "processing":
      return "Still crunching through commits";
    case "completed":
      return "Final markdown ready below";
    case "failed":
      return "Review logs or retry generation";
    default:
      return null;
  }
}

"use client";

import { useMemo } from "react";

import { Badge } from "@heroui/badge";
import { Button } from "@heroui/button";
import { Progress } from "@heroui/progress";
import { ScrollShadow } from "@heroui/scroll-shadow";
import { Skeleton } from "@heroui/skeleton";

import { formatDateTime } from "../utils";
import type { JobDetails, JobLogEntry } from "../types";
import { LogMessage } from "./LogMessage";

export function ProgressAndLogs({
  status,
  logs,
  onRefresh,
  isRefreshing,
}: {
  status: JobDetails["status"];
  logs: JobLogEntry[];
  onRefresh?: () => void;
  isRefreshing?: boolean;
}) {
  const statusHint = useMemo(() => buildStatusHint(status), [status]);

  return (
    <section className="">
      <header className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
            Progress & Logs
          </h2>
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
            className="self-start md:self-auto"
          >
            Refresh
          </Button>
        )}
      </header>

      <div className="mt-6 space-y-6">
        <StatusState status={status} />
        <div className="h-px bg-slate-200 dark:bg-slate-800" />
        <LogsList logs={logs} />
      </div>
    </section>
  );
}

function StatusState({ status }: { status: JobDetails["status"] }) {
  if (status === "pending") {
    return (
      <div className="flex flex-col items-center gap-4 rounded-xl border border-dashed border-slate-200 bg-white/70 px-6 py-10 text-center text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-900/40 dark:text-slate-400">
        <div className="flex flex-col items-center gap-2">
          <div className="h-3 w-32 animate-pulse rounded-full bg-slate-200 dark:bg-slate-700" />
          <div className="h-3 w-24 animate-pulse rounded-full bg-slate-200/80 dark:bg-slate-700/80" />
        </div>
        <p>Job is queued and waiting to start processing…</p>
      </div>
    );
  }

  if (status === "processing") {
    return (
      <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-6 dark:border-slate-700 dark:bg-slate-900/40">
        <div className="flex flex-wrap items-center gap-4">
          <div className="h-10 w-10 rounded-full border-2 border-slate-300 border-t-transparent animate-spin" />
          <div className="min-w-[200px] flex-1 space-y-1">
            <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
              Processing changelog…
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              This may take a few minutes depending on the number of commits.
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
      <div className="rounded-xl border border-emerald-200 bg-emerald-50/80 p-6 text-center dark:border-emerald-900/40 dark:bg-emerald-900/20">
        <svg
          className="mx-auto h-10 w-10 text-emerald-600 dark:text-emerald-400"
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
        <h3 className="mt-4 text-lg font-semibold text-emerald-700 dark:text-emerald-300">
          Changelog ready!
        </h3>
        <p className="mt-1 text-sm text-emerald-700/80 dark:text-emerald-300/80">
          Review the markdown in the Changelog tab.
        </p>
      </div>
    );
  }

  if (status === "failed") {
    return (
      <div className="rounded-xl border border-rose-200 bg-rose-50/80 p-6 text-center dark:border-rose-900/40 dark:bg-rose-900/20">
        <svg
          className="mx-auto h-10 w-10 text-rose-600 dark:text-rose-400"
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
        <h3 className="mt-4 text-lg font-semibold text-rose-700 dark:text-rose-300">
          Generation failed
        </h3>
        <p className="mt-1 text-sm text-rose-700/80 dark:text-rose-300/80">
          Check the activity log below for details and retry if needed.
        </p>
      </div>
    );
  }

  return null;
}

function LogsList({ logs }: { logs: JobLogEntry[] }) {
  if (logs.length === 0) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
            Activity Log
          </h3>
        </div>
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900">
          <div className="space-y-3">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="flex items-start gap-4">
                <Skeleton className="h-4 w-40 rounded" />
                <Skeleton className="h-4 w-12 rounded" />
                <Skeleton className="h-4 w-full max-w-[70%] rounded" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
          Activity Log
        </h3>
      </div>

      <ScrollShadow className="max-h-[50vh] rounded-lg border scrollbar-default border-slate-200 bg-slate-50 font-mono text-xs text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
        <div className="p-4">
          {logs.map((log, index) => (
            <LogRow key={`${log.timestamp}-${index}`} log={log} />
          ))}
        </div>
      </ScrollShadow>
    </div>
  );
}

function LogRow({ log }: { log: JobLogEntry }) {
  const levelColor =
    log.level === "error"
      ? "text-red-600 dark:text-red-400"
      : log.level === "warning"
        ? "text-yellow-600 dark:text-yellow-400"
        : "text-cyan-500 dark:text-cyan-400";

  return (
    <div className="flex items-start gap-4">
      <span className="w-40 shrink-0 text-slate-500">
        {formatDateTime(log.timestamp)}
      </span>
      <span className={`w-12 shrink-0 font-semibold ${levelColor}`}>
        {log.level}
      </span>
      <pre className="grow whitespace-pre-wrap font-inherit">
        <LogMessage log={log} />
      </pre>
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
      return "Final markdown ready in the Changelog tab";
    case "failed":
      return "Review logs or retry generation";
    default:
      return null;
  }
}

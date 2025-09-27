"use client";

import { useMemo } from "react";

import { Badge } from "@heroui/badge";
import { Card, CardBody, CardHeader } from "@heroui/card";
import { Code } from "@heroui/code";
import { Divider } from "@heroui/divider";
import { Tooltip } from "@heroui/tooltip";
import { ScrollShadow } from "@heroui/scroll-shadow";
import { Streamdown as MarkdownRender } from "streamdown";

import { formatDateTime } from "../utils";
import type { FinalChangelogLogEntry, FinalChangelogMetrics } from "../types";

type FinalChangelogProps = {
  markdown?: string | null;
  logs?: FinalChangelogLogEntry[] | null;
  metrics?: FinalChangelogMetrics | null;
};

export function FinalChangelog({
  markdown,
  logs,
  metrics,
}: FinalChangelogProps) {
  const sortedLogs = useMemo(() => sortLogs(logs), [logs]);
  const metricEntries = useMemo(() => Object.entries(metrics ?? {}), [metrics]);
  const hasMarkdown = Boolean(markdown && markdown.trim().length > 0);

  return (
    <Card>
      <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-lg font-semibold">Final Changelog</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Beautifully rendered markdown with helpful metrics and logs
          </p>
        </div>
        <MetricStack entries={metricEntries} />
      </CardHeader>

      <CardBody className="space-y-6">
        <section className="space-y-3">
          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
            Rendered Markdown
          </h3>
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900/40">
            {hasMarkdown ? (
              <ScrollShadow hideScrollBar className="max-h-[600px] pr-4">
                <MarkdownRender className="prose dark:prose-invert">
                  {markdown ?? ""}
                </MarkdownRender>
              </ScrollShadow>
            ) : (
              <EmptyMarkdown />
            )}
          </div>
        </section>

        <Divider />

        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
              Generation Logs
            </h3>
            <Badge color="default" variant="flat">
              {sortedLogs.length}
            </Badge>
          </div>
          <div className="space-y-2">
            {sortedLogs.length === 0 ? (
              <EmptyLogs />
            ) : (
              sortedLogs.map((entry, index) => (
                <LogEntry key={`${entry.timestamp}-${index}`} entry={entry} />
              ))
            )}
          </div>
        </section>
      </CardBody>
    </Card>
  );
}

function EmptyMarkdown() {
  return (
    <div className="space-y-3 rounded-lg border border-dashed border-slate-300 px-6 py-10 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
      <svg
        className="mx-auto h-10 w-10 text-slate-300"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M8 4H6a2 2 0 00-2 2v12m12-14h2a2 2 0 012 2v12m-4 2H8m8-18v4m-8-4v4"
        />
      </svg>
      <p className="font-medium">No markdown produced yet</p>
      <p className="text-xs text-slate-400">
        Once the job finishes successfully the generated changelog will appear
        here.
      </p>
    </div>
  );
}

function EmptyLogs() {
  return (
    <div className="rounded-lg border border-dashed border-slate-300 py-4 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
      No generation logs recorded.
    </div>
  );
}

function LogEntry({ entry }: { entry: FinalChangelogLogEntry }) {
  const badgeColor =
    entry.level === "error"
      ? "danger"
      : entry.level === "warning"
        ? "warning"
        : "success";

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-slate-200 p-4 text-sm dark:border-slate-800">
      <div className="flex flex-wrap items-center gap-3">
        <Badge color={badgeColor} variant="flat">
          {entry.level}
        </Badge>
        <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
          {formatDateTime(entry.timestamp)}
        </span>
      </div>
      <p className="font-medium text-slate-700 dark:text-slate-200">
        {entry.message}
      </p>
      {entry.details && Object.keys(entry.details).length > 0 && (
        <DetailPreview details={entry.details} />
      )}
    </div>
  );
}

function sortLogs(logs?: FinalChangelogLogEntry[] | null) {
  if (!logs) return [];
  return [...logs].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );
}

type MetricStackProps = {
  entries: [string, number | null | undefined][];
};

function MetricStack({ entries }: MetricStackProps) {
  if (entries.length === 0) {
    return (
      <div className="rounded-full border border-dashed border-slate-300 px-3 py-1 text-xs uppercase tracking-wide text-slate-400 dark:border-slate-700 dark:text-slate-500">
        No metrics yet
      </div>
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      {entries.map(([key, value]) => (
        <div
          key={key}
          className="flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600 dark:bg-slate-800/70 dark:text-slate-300"
        >
          <span>{value ?? "—"}</span>
          <span className="text-[0.65rem] uppercase tracking-wide text-slate-500 dark:text-slate-400">
            {key}
          </span>
        </div>
      ))}
    </div>
  );
}

type DetailPreviewProps = {
  details: Record<string, unknown> | null | undefined;
};

function DetailPreview({ details }: DetailPreviewProps) {
  if (!details) return null;

  return (
    <Tooltip
      content={
        <Code className="max-w-xs whitespace-pre-wrap text-left text-xs">
          {JSON.stringify(details, null, 2)}
        </Code>
      }
      placement="bottom"
      showArrow
    >
      <button className="self-start rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600 transition hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700">
        View details
      </button>
    </Tooltip>
  );
}

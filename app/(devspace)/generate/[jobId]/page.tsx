"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { notFound } from "next/navigation";
import { Button } from "@heroui/button";
import { Spinner } from "@heroui/spinner";

import { FinalChangelog } from "./components/FinalChangelog";
import { JobHeader } from "./components/JobHeader";
import { JobOverview } from "./components/JobOverview";
import { SelectedCommits } from "./components/SelectedCommits";
import type {
  FinalChangelogLogEntry,
  FinalChangelogResult,
  JobDetails,
  JobLogEntry,
} from "./types";
import { formatDateRange, formatDateTime } from "./utils";
import { ProgressAndLogs } from "./components/ProgressAndLogs";

type GenerateJobPageProps = {
  params: Promise<{
    jobId?: string;
  }>;
};

export default function GenerateJobPage({ params }: GenerateJobPageProps) {
  const [jobId, setJobId] = useState<string | null>(null);
  const [job, setJob] = useState<JobDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    params.then((resolvedParams) => {
      const id = resolvedParams.jobId;
      if (id) {
        setJobId(id);
      } else {
        notFound();
      }
    });
  }, [params]);

  const fetchJobDetails = useCallback(async () => {
    if (!jobId) return;

    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch(`/api/jobs/${jobId}`);
      if (!response.ok) {
        if (response.status === 404) {
          setError("Job not found");
          return;
        }

        const body = await response.json().catch(() => ({}));
        throw new Error(body?.error ?? "Failed to load job details");
      }

      const jobData = (await response.json()) as JobDetails;
      setJob(jobData);
    } catch (err) {
      console.error("Failed to fetch job details:", err);
      setError(
        err instanceof Error ? err.message : "Failed to load job details"
      );
    } finally {
      setIsLoading(false);
    }
  }, [jobId]);

  useEffect(() => {
    if (jobId) {
      fetchJobDetails();
    }
  }, [jobId, fetchJobDetails]);

  const handleRefresh = useCallback(async () => {
    if (!jobId || isRefreshing) return;
    try {
      setIsRefreshing(true);
      await fetchJobDetails();
    } finally {
      setIsRefreshing(false);
    }
  }, [fetchJobDetails, isRefreshing, jobId]);

  const parsedLogs: JobLogEntry[] = useMemo(() => {
    if (!job?.logs) return [];

    const normalizeEntry = (raw: unknown): JobLogEntry => {
      const now = new Date().toISOString();

      const getStringMessage = (value: unknown): string => {
        if (value == null) return "";
        if (typeof value === "string") return value;
        if (typeof value === "number" || typeof value === "boolean") {
          return String(value);
        }
        try {
          return JSON.stringify(value);
        } catch {
          return String(value);
        }
      };

      if (typeof raw === "object" && raw !== null) {
        const obj = raw as Record<string, unknown>;
        const level =
          obj.level === "error" || obj.level === "warning" ? obj.level : "info";
        const timestamp =
          typeof obj.timestamp === "string" && obj.timestamp.length > 0
            ? obj.timestamp
            : now;

        const messageSource =
          obj.message ??
          obj.logTail ??
          obj.event ??
          obj.stage ??
          obj.metrics ??
          obj;

        return {
          timestamp,
          level,
          message: getStringMessage(messageSource) || "",
        } satisfies JobLogEntry;
      }

      return {
        timestamp: now,
        level: "info",
        message: getStringMessage(raw),
      } satisfies JobLogEntry;
    };

    return job.logs.map((logStr: string) => {
      if (typeof logStr !== "string") {
        return normalizeEntry(logStr);
      }

      try {
        const parsed = JSON.parse(logStr);
        return normalizeEntry(parsed);
      } catch {
        return {
          timestamp: new Date().toISOString(),
          level: "info",
          message: logStr,
        } satisfies JobLogEntry;
      }
    });
  }, [job?.logs]);

  const finalResult = useMemo<FinalChangelogResult | null>(() => {
    const source = job?.final_changelog_result;
    if (!source) return null;

    if (typeof source === "string") {
      try {
        return JSON.parse(source) as FinalChangelogResult;
      } catch (parseError) {
        console.warn("Unable to parse final changelog result", parseError);
        return null;
      }
    }

    if (typeof source === "object") {
      return source as FinalChangelogResult;
    }

    return null;
  }, [job?.final_changelog_result]);

  const finalMarkdown = useMemo(() => {
    if (!finalResult || typeof finalResult.markdown !== "string") return "";
    return finalResult.markdown;
  }, [finalResult]);

  const finalLogs = useMemo<FinalChangelogLogEntry[]>(() => {
    if (!finalResult || !Array.isArray(finalResult.logs)) return [];
    return finalResult.logs
      .filter((entry): entry is FinalChangelogLogEntry =>
        Boolean(entry && entry.level && entry.message && entry.timestamp)
      )
      .map((entry) => ({
        level: entry.level,
        message: entry.message,
        timestamp: entry.timestamp,
        details: entry.details ?? null,
      }));
  }, [finalResult]);

  const finalMetrics = useMemo(() => {
    if (
      !finalResult ||
      typeof finalResult.metrics !== "object" ||
      finalResult.metrics === null
    ) {
      return undefined;
    }

    return finalResult.metrics;
  }, [finalResult]);

  if (!jobId) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner label="Loading..." />
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto py-10 px-6">
        <div className="flex min-h-[400px] items-center justify-center">
          <Spinner label="Loading job details..." />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto py-10 px-6">
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-red-600 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300">
          <h2 className="text-lg font-semibold mb-2">Error</h2>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="max-w-4xl mx-auto py-10 px-6">
        <div className="rounded-xl border border-dashed border-slate-300 p-6 text-sm text-slate-600 dark:border-slate-700 dark:text-slate-400">
          <p>Job not found</p>
        </div>
      </div>
    );
  }

  const showRefresh = job.status === "pending" || job.status === "processing";

  return (
    <div className="max-w-4xl mx-auto space-y-8 py-10 px-6">
      <JobHeader job={job} jobId={jobId} />

      <div className="grid gap-6 md:grid-cols-2">
        <JobOverview job={job} />
        <SelectedCommits commits={job.selected_commits} />
      </div>

      <ProgressAndLogs
        job={job}
        logs={parsedLogs}
        onRefresh={showRefresh ? handleRefresh : undefined}
        isRefreshing={isRefreshing}
      />

      <FinalChangelog
        markdown={finalMarkdown}
        logs={finalLogs}
        metrics={finalMetrics}
      />

      <footer className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Updated {formatDateTime(job.updated_at)} • Range{" "}
          {formatDateRange(job.date_range_start, job.date_range_end)}
        </p>

        <div className="flex flex-wrap items-center gap-2">
          <Button variant="flat" color="default">
            Back to Repository
          </Button>
          {job.status === "completed" && (
            <>
              <Button variant="flat" color="primary">
                Download Changelog
              </Button>
              <Button color="primary">View Changelog</Button>
            </>
          )}
        </div>
      </footer>
    </div>
  );
}

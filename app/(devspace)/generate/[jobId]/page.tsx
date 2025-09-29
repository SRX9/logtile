"use client";

import type { JobStatus } from "./types";

import { useEffect, useState, useCallback, useRef } from "react";
import { notFound } from "next/navigation";
import { Tabs, Tab } from "@heroui/tabs";
import { Skeleton } from "@heroui/skeleton";

import { JobHeader } from "./components/JobHeader";
import { ChangelogTab } from "./components/ChangelogTab";
import { OverviewTab } from "./components/OverviewTab";
import { LogsTab } from "./components/LogsTab";
import { fontHeading } from "@/config/fonts";

type GenerateJobPageProps = {
  params: Promise<{
    jobId?: string;
  }>;
};

export default function GenerateJobPage({ params }: GenerateJobPageProps) {
  const [jobId, setJobId] = useState<string | null>(null);
  const [header, setHeader] = useState<{
    repo_full_name: string;
    status: JobStatus;
  } | null>(null);
  const latestStatusRef = useRef<JobStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeKey, setActiveKey] = useState<string>("changelog");

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

  const fetchHeader = useCallback(async () => {
    if (!jobId) return;
    try {
      setIsLoading(true);
      setError(null);
      const response = await fetch(`/api/jobs/${jobId}/overview`);

      if (!response.ok) {
        if (response.status === 404) {
          setError("Job not found");

          return;
        }
        const body = await response.json().catch(() => ({}));

        throw new Error(body?.error ?? "Failed to load job header");
      }
      const data = await response.json();
      const statusToUse = latestStatusRef.current ?? data.status;

      latestStatusRef.current = statusToUse;
      setHeader({
        repo_full_name: data.repo_full_name,
        status: statusToUse,
      });
    } catch (err) {
      console.error("Failed to fetch header:", err);
      setError(
        err instanceof Error ? err.message : "Failed to load job header"
      );
    } finally {
      setIsLoading(false);
    }
  }, [jobId]);

  useEffect(() => {
    if (jobId) {
      fetchHeader();
    }
  }, [jobId, fetchHeader]);

  const handleStatusUpdate = useCallback((nextStatus: JobStatus) => {
    latestStatusRef.current = nextStatus;
    setHeader((prev) => {
      if (!prev) {
        return prev;
      }
      if (prev.status === nextStatus) {
        return prev;
      }

      return { ...prev, status: nextStatus };
    });
  }, []);

  // All per-tab data is fetched inside tab components now

  if (!jobId) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Skeleton className="h-16 w-16 rounded-full" />
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto w-full space-y-6 py-10 px-10">
        <div className="space-y-4">
          <Skeleton className="h-8 w-64 rounded-lg" />
          <Skeleton className="h-4 w-40 rounded" />
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          <Skeleton className="h-56 rounded-2xl" />
          <Skeleton className="h-56 rounded-2xl" />
        </div>
        <Skeleton className="h-[420px] rounded-2xl" />
        <Skeleton className="h-[520px] rounded-2xl" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl py-10 px-10">
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-red-600 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300">
          <h2 className={`${fontHeading.className} mb-2 text-lg font-semibold`}>
            Error
          </h2>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  if (!header) {
    return (
      <div className="max-w-4xl py-10 px-10">
        <div className="rounded-xl border border-dashed border-slate-300 p-6 text-sm text-slate-600 dark:border-slate-700 dark:text-slate-400">
          <p>Job not found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto w-full space-y-8 py-10 px-10">
      <JobHeader
        job={{ repo_full_name: header.repo_full_name, status: header.status }}
        jobId={jobId}
      />

      <div>
        <Tabs
          fullWidth
          aria-label="Job detail tabs"
          className="w-full"
          selectedKey={activeKey}
          onSelectionChange={(key) => setActiveKey(String(key))}
        >
          <Tab key="changelog" className="px-1 py-6" title="Changelog">
            {activeKey === "changelog" && jobId && (
              <ChangelogTab jobId={jobId} onStatusChange={handleStatusUpdate} />
            )}
          </Tab>
          <Tab key="overview" className="px-1 py-6" title="Overview">
            {activeKey === "overview" && jobId && <OverviewTab jobId={jobId} />}
          </Tab>
          <Tab key="logs" className="px-1 py-6" title="Logs">
            {activeKey === "logs" && jobId && (
              <LogsTab jobId={jobId} onStatusChange={handleStatusUpdate} />
            )}
          </Tab>
        </Tabs>
      </div>
    </div>
  );
}

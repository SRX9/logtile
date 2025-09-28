"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Skeleton } from "@heroui/skeleton";

import { JobOverview } from "./JobOverview";
import { SelectedCommits } from "./SelectedCommits";
import type { CommitMetadata } from "../types";

type OverviewApiResponse = {
  repo_full_name: string;
  status: "pending" | "processing" | "completed" | "failed";
  date_range_start: string | null;
  date_range_end: string | null;
  selected_commits: CommitMetadata[];
  created_at: string;
  updated_at: string;
};

export function OverviewTab({ jobId }: { jobId: string }) {
  const [data, setData] = useState<OverviewApiResponse | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const didInitRef = useRef(false);
  const fetchPromiseRef = useRef<Promise<OverviewApiResponse> | null>(null);

  const fetchOverview = useCallback(async () => {
    if (fetchPromiseRef.current) {
      const d = await fetchPromiseRef.current;
      setData(d);
      return d;
    }
    const promise = (async () => {
      const res = await fetch(`/api/jobs/${jobId}/overview`);
      if (!res.ok) throw new Error("Failed to load overview");
      return (await res.json()) as OverviewApiResponse;
    })();
    fetchPromiseRef.current = promise;
    try {
      const d = await promise;
      setData(d);
      return d;
    } finally {
      fetchPromiseRef.current = null;
    }
  }, [jobId]);

  useEffect(() => {
    if (didInitRef.current) return;
    didInitRef.current = true;
    fetchOverview();
  }, [fetchOverview]);

  const onRefresh = useCallback(async () => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    try {
      await fetchOverview();
    } finally {
      setIsRefreshing(false);
    }
  }, [fetchOverview, isRefreshing]);

  if (!data) return <OverviewSkeleton />;

  const jobForOverview = {
    id: jobId,
    status: data.status,
    repo_name: data.repo_full_name.split("/")[1] ?? data.repo_full_name,
    repo_owner: data.repo_full_name.split("/")[0] ?? data.repo_full_name,
    repo_full_name: data.repo_full_name,
    selected_commits: data.selected_commits,
    logs: [],
    date_range_start: data.date_range_start,
    date_range_end: data.date_range_end,
    created_at: data.created_at,
    updated_at: data.updated_at,
  } as const;

  return (
    <div className="space-y-6">
      <JobOverview job={jobForOverview as any} />
      <SelectedCommits commits={data.selected_commits} />
    </div>
  );
}

function OverviewSkeleton() {
  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white/70 p-4 dark:border-slate-800 dark:bg-slate-900/40">
        <div className="space-y-4">
          <Skeleton className="h-6 w-40 rounded" />
          <div className="space-y-3">
            <Skeleton className="h-4 w-72 rounded" />
            <Skeleton className="h-4 w-64 rounded" />
            <Skeleton className="h-4 w-52 rounded" />
            <Skeleton className="h-4 w-40 rounded" />
          </div>
        </div>
      </div>

      <section className="px-1 pt-4">
        <div className="mb-5 flex items-center justify-between gap-4">
          <div className="space-y-2">
            <Skeleton className="h-5 w-40 rounded" />
            <Skeleton className="h-3 w-32 rounded" />
          </div>
          <Skeleton className="h-6 w-20 rounded-full" />
        </div>
        <div className="divide-y divide-slate-200 rounded-lg border border-slate-200 dark:divide-slate-800 dark:border-slate-800">
          <div className="p-3">
            <Skeleton className="h-4 w-3/4 rounded" />
            <div className="mt-2 flex gap-3">
              <Skeleton className="h-3 w-24 rounded" />
              <Skeleton className="h-3 w-20 rounded" />
              <Skeleton className="h-3 w-16 rounded" />
            </div>
          </div>
          <div className="p-3">
            <Skeleton className="h-4 w-2/3 rounded" />
            <div className="mt-2 flex gap-3">
              <Skeleton className="h-3 w-24 rounded" />
              <Skeleton className="h-3 w-20 rounded" />
            </div>
          </div>
          <div className="p-3">
            <Skeleton className="h-4 w-1/2 rounded" />
            <div className="mt-2 flex gap-3">
              <Skeleton className="h-3 w-24 rounded" />
              <Skeleton className="h-3 w-16 rounded" />
              <Skeleton className="h-3 w-14 rounded" />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

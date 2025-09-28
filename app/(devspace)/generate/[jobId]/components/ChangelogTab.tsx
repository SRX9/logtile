"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Skeleton } from "@heroui/skeleton";

import { FinalChangelog } from "./FinalChangelog";
import type { ChangelogTitle, FinalChangelogMetrics } from "../types";

type ChangelogApiResponse = {
  status: "pending" | "processing" | "completed" | "failed";
  markdown: string | null;
  metrics: FinalChangelogMetrics | null;
  title: ChangelogTitle | null;
};

export function ChangelogTab({ jobId }: { jobId: string }) {
  const [data, setData] = useState<ChangelogApiResponse | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const didInitRef = useRef(false);
  const fetchPromiseRef = useRef<Promise<ChangelogApiResponse> | null>(null);
  const pollingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollingStartMsRef = useRef<number | null>(null);

  const fetchChangelog = useCallback(async () => {
    if (fetchPromiseRef.current) {
      const d = await fetchPromiseRef.current;
      setData(d);
      return d;
    }
    const promise = (async () => {
      const res = await fetch(`/api/jobs/${jobId}/changelog`);
      if (!res.ok) throw new Error("Failed to load changelog");
      return (await res.json()) as ChangelogApiResponse;
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
    fetchChangelog();
  }, [fetchChangelog]);

  // When status is pending, start polling every 5s. Stop when status changes or after 5 minutes.
  useEffect(() => {
    const isPending = data?.status === "pending";

    // Helper to clear polling
    const stopPolling = () => {
      if (pollingTimerRef.current) {
        clearInterval(pollingTimerRef.current);
        pollingTimerRef.current = null;
      }
      pollingStartMsRef.current = null;
    };

    if (!isPending) {
      stopPolling();
      return;
    }

    // Already polling
    if (pollingTimerRef.current) {
      return;
    }

    pollingStartMsRef.current = Date.now();

    pollingTimerRef.current = setInterval(async () => {
      // Max 5 minutes
      const startedAt = pollingStartMsRef.current ?? Date.now();
      const elapsed = Date.now() - startedAt;
      if (elapsed >= 5 * 60 * 1000) {
        stopPolling();
        return;
      }

      try {
        const next = await fetchChangelog();
        if (next.status !== "pending") {
          stopPolling();
        }
      } catch {
        // ignore transient errors; continue polling until cap
      }
    }, 5000);

    return () => {
      stopPolling();
    };
  }, [data?.status, fetchChangelog]);

  const onRefresh = useCallback(async () => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    try {
      await fetchChangelog();
    } finally {
      setIsRefreshing(false);
    }
  }, [fetchChangelog, isRefreshing]);

  return (
    <div className="space-y-6">
      {data ? (
        data.status === "pending" ? (
          <PendingMessage />
        ) : (
          <FinalChangelog
            markdown={data?.markdown ?? ""}
            title={data?.title ?? null}
            metrics={data?.metrics ?? null}
            jobId={jobId}
          />
        )
      ) : (
        <ChangelogSkeleton />
      )}
    </div>
  );
}

function ChangelogSkeleton() {
  return (
    <div className="space-y-8">
      <header className="rounded-2xl p-4">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-6">
            <div className="space-y-3">
              <Skeleton className="h-3 w-40 rounded" />
              <Skeleton className="h-8 w-80 rounded" />
              <Skeleton className="h-4 w-96 max-w-full rounded" />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-xl border border-slate-200 bg-white/90 px-4 py-3 dark:border-slate-700 dark:bg-slate-900/40">
                <Skeleton className="h-3 w-20 rounded" />
                <Skeleton className="mt-2 h-4 w-40 rounded" />
              </div>
              <div className="rounded-xl border border-slate-200 bg-white/90 px-4 py-3 dark:border-slate-700 dark:bg-slate-900/40">
                <Skeleton className="h-3 w-24 rounded" />
                <Skeleton className="mt-2 h-4 w-28 rounded" />
              </div>
            </div>
          </div>
          <Skeleton className="h-9 w-32 rounded" />
        </div>
      </header>

      <section className="px-4 pb-40">
        <div className="space-y-3">
          {Array.from({ length: 10 }).map((_, i) => (
            <Skeleton key={i} className="h-4 w-full max-w-[95%] rounded" />
          ))}
        </div>
      </section>
    </div>
  );
}

function PendingMessage() {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 bg-white/70 px-6 py-16 text-center dark:border-slate-700 dark:bg-slate-900/40">
      <div className="mx-auto mb-6 h-12 w-12 animate-spin rounded-full border-4 border-slate-300 border-t-transparent dark:border-slate-700" />
      <h3 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">
        Changelog is being processed
      </h3>
      <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
        Sit back and relax while we process your changelog.
      </p>
    </div>
  );
}

"use client";

import type { JobLogEntry, JobStatus } from "../types";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { ProgressAndLogs } from "./ProgressAndLogs";

type LogsApiResponse = {
  status: "pending" | "processing" | "completed" | "failed";
  logs: string[];
};

export function LogsTab({
  jobId,
  onStatusChange,
}: {
  jobId: string;
  onStatusChange?: (nextStatus: JobStatus) => void;
}) {
  const [status, setStatus] = useState<LogsApiResponse["status"]>("pending");
  const [rawLogs, setRawLogs] = useState<string[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const didInitRef = useRef(false);
  const fetchPromiseRef = useRef<Promise<LogsApiResponse> | null>(null);
  const pollingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollingStartMsRef = useRef<number | null>(null);

  const parseLogs = useCallback((logs: string[]): JobLogEntry[] => {
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
          obj.level === "error" || obj.level === "warning"
            ? (obj.level as any)
            : "info";
        const timestamp =
          typeof obj.timestamp === "string" && obj.timestamp.length > 0
            ? (obj.timestamp as string)
            : now;
        const messageSource =
          obj.message ??
          obj.logTail ??
          obj.event ??
          obj.stage ??
          obj.metrics ??
          obj;

        return { timestamp, level, message: getStringMessage(messageSource) };
      }

      return { timestamp: now, level: "info", message: getStringMessage(raw) };
    };

    return logs.map((logStr) => {
      if (typeof logStr !== "string") return normalizeEntry(logStr);
      try {
        const parsed = JSON.parse(logStr);

        return normalizeEntry(parsed);
      } catch {
        return {
          timestamp: new Date().toISOString(),
          level: "info",
          message: logStr,
        };
      }
    });
  }, []);

  const logs = useMemo(() => parseLogs(rawLogs), [rawLogs, parseLogs]);

  const fetchLogs = useCallback(async () => {
    if (fetchPromiseRef.current) {
      const data = await fetchPromiseRef.current;

      setStatus(data.status);
      setRawLogs(data.logs ?? []);

      return data;
    }
    const promise = (async () => {
      const res = await fetch(`/api/jobs/${jobId}/logs`);

      if (!res.ok) throw new Error("Failed to load logs");

      return (await res.json()) as LogsApiResponse;
    })();

    fetchPromiseRef.current = promise;
    try {
      const data = await promise;

      setStatus(data.status);
      setRawLogs(data.logs ?? []);
      onStatusChange?.(data.status);

      return data;
    } finally {
      fetchPromiseRef.current = null;
    }
  }, [jobId, onStatusChange]);

  useEffect(() => {
    if (didInitRef.current) return;
    didInitRef.current = true;
    fetchLogs().finally(() => setLoaded(true));
  }, [fetchLogs]);

  // Start polling every 5s while pending; stop when status changes or after 5 minutes
  useEffect(() => {
    const isPending = status === "pending" || status === "processing";

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

    if (pollingTimerRef.current) {
      return;
    }

    pollingStartMsRef.current = Date.now();

    pollingTimerRef.current = setInterval(async () => {
      const startedAt = pollingStartMsRef.current ?? Date.now();
      const elapsed = Date.now() - startedAt;

      if (elapsed >= 5 * 60 * 1000) {
        stopPolling();

        return;
      }

      try {
        const next = await fetchLogs();

        if (next.status !== "pending" && next.status !== "processing") {
          stopPolling();
        }
      } catch {
        // ignore transient errors, continue until cap is reached
      }
    }, 5000);

    return () => {
      stopPolling();
    };
  }, [status, fetchLogs]);

  const onRefresh = useCallback(async () => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    try {
      await fetchLogs();
    } finally {
      setIsRefreshing(false);
    }
  }, [fetchLogs, isRefreshing]);

  return (
    <ProgressAndLogs
      isRefreshing={isRefreshing}
      logs={logs}
      status={status}
      onRefresh={onRefresh}
    />
  );
}

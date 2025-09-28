"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { ProgressAndLogs } from "./ProgressAndLogs";
import type { JobLogEntry } from "../types";

type LogsApiResponse = {
  status: "pending" | "processing" | "completed" | "failed";
  logs: string[];
};

export function LogsTab({ jobId }: { jobId: string }) {
  const [status, setStatus] = useState<LogsApiResponse["status"]>("pending");
  const [rawLogs, setRawLogs] = useState<string[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const didInitRef = useRef(false);
  const fetchPromiseRef = useRef<Promise<LogsApiResponse> | null>(null);

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
      return data;
    } finally {
      fetchPromiseRef.current = null;
    }
  }, [jobId]);

  useEffect(() => {
    if (didInitRef.current) return;
    didInitRef.current = true;
    fetchLogs().finally(() => setLoaded(true));
  }, [fetchLogs]);

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
      status={status}
      logs={logs}
      onRefresh={onRefresh}
      isRefreshing={isRefreshing}
    />
  );
}

"use client";

import { use, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { notFound } from "next/navigation";
import { RangeCalendar, ScrollShadow } from "@heroui/react";
import {
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
} from "@heroui/modal";
import { Button } from "@heroui/button";
import { Spinner } from "@heroui/spinner";
import { Switch } from "@heroui/switch";
import {
  Drawer,
  DrawerBody,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
} from "@heroui/drawer";
import { Checkbox } from "@heroui/checkbox";
import {
  CalendarDate,
  DateValue,
  getLocalTimeZone,
} from "@internationalized/date";
import type { RangeValue } from "@react-types/shared";
import { RepositoryBreadcrumbs } from "@/components/repository-breadcrumbs";

const RANGE_MODE_OPTIONS = [
  {
    id: "date",
    label: "By Date Range",
    description: "Specify the start and end dates for commits.",
  },
  {
    id: "commits",
    label: "By Commits/Tags",
    description: "Pick two references or tags to compare commits between.",
  },
  {
    id: "smart",
    label: "Smart Detection",
    description: "Automatic detection of the most relevant commits.",
  },
] as const;

type RangeMode = (typeof RANGE_MODE_OPTIONS)[number]["id"];

type RouteParams = {
  repoId?: string | string[];
};

type GeneratePageProps = {
  params?: Promise<RouteParams>;
};

type HeadCommitSummary = {
  sha: string;
  message: string | null;
  committedAt: string | null;
};

type TagSummary = {
  name: string;
  sha: string;
  commitUrl: string | null;
};

type ComparisonSummary = {
  baseRef: string;
  headRef: string;
  totalCommits: number;
  uniqueContributors: number;
  htmlUrl: string | null;
};

type SuggestedDateRange = {
  from: string | null;
  to: string | null;
};

type GenerateOptionsResponse = {
  repository: {
    repo_id: string;
    name: string;
    owner: string;
    full_name: string;
  };
  defaultBranch: string | null;
  headCommit: HeadCommitSummary | null;
  tags: TagSummary[];
  suggestedDateRange: SuggestedDateRange | null;
  comparison?: ComparisonSummary | null;
  warning?: string;
  commitsPreview?: CommitSummary[];
};

type CommitSummary = {
  sha: string;
  message: string | null;
  committedAt: string | null;
  authorName: string | null;
  authorEmail: string | null;
  htmlUrl: string | null;
};

function formatDateTime(iso: string | null | undefined) {
  if (!iso) {
    return "Unknown";
  }

  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) {
    return iso;
  }

  return parsed.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatNumber(value: number | null | undefined) {
  if (value == null) {
    return "-";
  }

  return new Intl.NumberFormat().format(value);
}

function isoStringToCalendarDate(iso: string | null | undefined) {
  if (!iso) {
    return null;
  }

  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return new CalendarDate(
    parsed.getFullYear(),
    parsed.getMonth() + 1,
    parsed.getDate()
  );
}

function formatDateValue(value: DateValue | null | undefined) {
  if (!value) {
    return null;
  }

  try {
    return value.toDate(getLocalTimeZone()).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return null;
  }
}

function formatDateRange(range: RangeValue<DateValue> | null) {
  const start = formatDateValue(range?.start ?? null);
  const end = formatDateValue(range?.end ?? null);

  if (!start || !end) {
    return null;
  }

  return `${start} → ${end}`;
}

function toIsoDate(value: DateValue | null | undefined) {
  if (!value) {
    return null;
  }

  try {
    return value.toDate(getLocalTimeZone()).toISOString();
  } catch {
    return null;
  }
}

function formatCommitMessage(message: string | null | undefined) {
  if (!message) {
    return "No commit message";
  }

  return message.length > 80 ? `${message.slice(0, 77)}…` : message;
}

function formatProcessingTimeFromCommits(commitCount: number) {
  if (commitCount <= 0) {
    return "0 seconds";
  }

  const totalSeconds = commitCount * 30;

  if (totalSeconds < 60) {
    const roundedSeconds = Math.max(1, totalSeconds);
    return `${roundedSeconds} second${roundedSeconds === 1 ? "" : "s"}`;
  }

  const totalMinutes = Math.max(1, Math.round(totalSeconds / 60));
  if (totalMinutes < 60) {
    return `${totalMinutes} minute${totalMinutes === 1 ? "" : "s"}`;
  }

  const totalHours = Math.max(1, Math.round(totalMinutes / 60));
  return `${totalHours} hour${totalHours === 1 ? "" : "s"}`;
}

function useGenerateOptions(repoId: string | undefined) {
  const [data, setData] = useState<GenerateOptionsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!repoId) {
      return;
    }

    let cancelled = false;
    const controller = new AbortController();

    async function fetchOptions() {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch(
          `/api/repositories/${repoId}/generate-options`,
          {
            signal: controller.signal,
          }
        );

        if (!response.ok) {
          const body = await response.json().catch(() => ({}));
          throw new Error(
            body?.error ?? "Failed to load repository generate options"
          );
        }

        const body = (await response.json()) as GenerateOptionsResponse;
        if (!cancelled) {
          setData(body);
        }
      } catch (err) {
        if (cancelled) {
          return;
        }

        if (err instanceof DOMException && err.name === "AbortError") {
          return;
        }

        console.error(err);
        setError(
          err instanceof Error
            ? err.message
            : "Failed to load repository generate options"
        );
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void fetchOptions();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [repoId]);

  return { data, isLoading, error };
}

export default function RepositoryGeneratePage({ params }: GeneratePageProps) {
  const paramsPromise = useMemo(
    () => params ?? Promise.resolve<RouteParams>({ repoId: undefined }),
    [params]
  );

  const resolvedParams = use<RouteParams>(paramsPromise);

  const rawRepoId = resolvedParams?.repoId;
  const repoId = Array.isArray(rawRepoId) ? rawRepoId[0] : rawRepoId;

  if (!repoId) {
    notFound();
  }

  const { data, isLoading, error } = useGenerateOptions(repoId);
  const [selectedMode, setSelectedMode] = useState<RangeMode>("date");
  const [isDateRangeModalOpen, setIsDateRangeModalOpen] = useState(false);
  const [dateRange, setDateRange] = useState<RangeValue<DateValue> | null>(
    null
  );
  const [isCommitDrawerOpen, setIsCommitDrawerOpen] = useState(false);
  const [isLoadingCommits, setIsLoadingCommits] = useState(false);
  const [commitsError, setCommitsError] = useState<string | null>(null);
  const [commitSummaries, setCommitSummaries] = useState<CommitSummary[]>([]);
  const [deselectedCommitShas, setDeselectedCommitShas] = useState<Set<string>>(
    new Set()
  );
  const [isConfirmationModalOpen, setIsConfirmationModalOpen] = useState(false);
  const [isCreatingJob, setIsCreatingJob] = useState(false);
  const fetchedRangeRef = useRef<{ since: string; until: string } | null>(null);
  const activeFetchControllerRef = useRef<AbortController | null>(null);
  const activeFetchRangeRef = useRef<{ since: string; until: string } | null>(
    null
  );

  const comparisonSummary = useMemo(() => data?.comparison ?? null, [data]);
  const selectedCommits = useMemo(() => {
    if (!commitSummaries.length) {
      return [];
    }

    return commitSummaries.filter(
      (commit) => !deselectedCommitShas.has(commit.sha)
    );
  }, [commitSummaries, deselectedCommitShas]);

  const selectedCommitCount = selectedCommits.length;

  const estimatedProcessingTimeLabel = useMemo(
    () => formatProcessingTimeFromCommits(selectedCommitCount),
    [selectedCommitCount]
  );

  const handleRangeModeChange = useCallback((mode: RangeMode) => {
    if (mode !== "date") {
      return;
    }

    setSelectedMode(mode);
  }, []);

  const fetchCommits = useCallback(
    async (start: DateValue, end: DateValue) => {
      if (!repoId) {
        return;
      }

      const since = toIsoDate(start);
      const until = toIsoDate(end);

      if (!since || !until) {
        setCommitsError("Invalid date range");
        setCommitSummaries([]);
        setDeselectedCommitShas(new Set());
        return;
      }

      const currentRange = { since, until };
      activeFetchRangeRef.current = currentRange;

      if (
        activeFetchControllerRef.current &&
        typeof activeFetchControllerRef.current.abort === "function"
      ) {
        activeFetchControllerRef.current.abort();
      }

      const controller = new AbortController();
      activeFetchControllerRef.current = controller;

      setIsLoadingCommits(true);
      setCommitsError(null);

      try {
        const response = await fetch(
          `/api/repositories/${repoId}/commits?since=${encodeURIComponent(
            since
          )}&until=${encodeURIComponent(until)}`,
          { signal: controller.signal }
        );

        if (!response.ok) {
          const body = await response.json().catch(() => ({}));
          throw new Error(body?.error ?? "Failed to load commits");
        }

        const body = (await response.json()) as { commits: CommitSummary[] };

        if (
          activeFetchRangeRef.current?.since !== since ||
          activeFetchRangeRef.current?.until !== until
        ) {
          return;
        }

        setCommitSummaries(body.commits);
        setDeselectedCommitShas(new Set());
        fetchedRangeRef.current = currentRange;
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") {
          return;
        }

        console.error(err);
        setCommitsError(
          err instanceof Error ? err.message : "Failed to load commits"
        );
        setCommitSummaries([]);
        setDeselectedCommitShas(new Set());
      } finally {
        if (
          activeFetchRangeRef.current?.since === since &&
          activeFetchRangeRef.current?.until === until
        ) {
          setIsLoadingCommits(false);
          activeFetchControllerRef.current = null;
          activeFetchRangeRef.current = null;
        }
      }
    },
    [repoId]
  );

  useEffect(() => {
    if (!data?.suggestedDateRange || dateRange) {
      return;
    }

    const start = isoStringToCalendarDate(data.suggestedDateRange.from);
    const end = isoStringToCalendarDate(data.suggestedDateRange.to);

    if (start && end) {
      setDateRange({ start, end });
      fetchedRangeRef.current = {
        since: toIsoDate(start) ?? "",
        until: toIsoDate(end) ?? "",
      };
      void fetchCommits(start, end);
    }
  }, [data?.suggestedDateRange, dateRange, fetchCommits]);

  const selectedDateRangeLabel = useMemo(
    () => formatDateRange(dateRange),
    [dateRange]
  );

  const isDateRangeComplete = Boolean(dateRange?.start && dateRange?.end);
  const currentIsoRange = useMemo(() => {
    if (!dateRange?.start || !dateRange?.end) {
      return null;
    }

    const since = toIsoDate(dateRange.start);
    const until = toIsoDate(dateRange.end);

    if (!since || !until) {
      return null;
    }

    return { since, until };
  }, [dateRange]);

  const hasFetchedCurrentRange = Boolean(
    currentIsoRange &&
      fetchedRangeRef.current?.since === currentIsoRange.since &&
      fetchedRangeRef.current?.until === currentIsoRange.until
  );

  const shouldShowProcessingOverview =
    selectedMode === "date" ? Boolean(currentIsoRange) : true;

  const isProcessingOverviewLoading =
    selectedMode === "date" && Boolean(currentIsoRange) && isLoadingCommits;

  const isContinueDisabled =
    selectedMode === "date"
      ? !hasFetchedCurrentRange || isLoadingCommits || Boolean(commitsError)
      : false;

  const handleDateRangeChange = useCallback(
    (range: RangeValue<DateValue>) => {
      setDateRange(range);

      if (!range?.start || !range?.end) {
        setCommitSummaries([]);
        setDeselectedCommitShas(new Set());
        fetchedRangeRef.current = null;
        setCommitsError(null);
        setIsLoadingCommits(false);
        if (
          activeFetchControllerRef.current &&
          typeof activeFetchControllerRef.current.abort === "function"
        ) {
          activeFetchControllerRef.current.abort();
          activeFetchControllerRef.current = null;
        }
        activeFetchRangeRef.current = null;
        return;
      }

      void fetchCommits(range.start, range.end);
    },
    [fetchCommits]
  );

  const handleOpenCommitDrawer = useCallback(() => {
    if (!dateRange?.start || !dateRange?.end) {
      return;
    }

    if (isLoadingCommits) {
      setIsCommitDrawerOpen(true);
      return;
    }

    const since = toIsoDate(dateRange.start);
    const until = toIsoDate(dateRange.end);

    if (!since || !until) {
      setCommitsError("Invalid date range");
      setCommitSummaries([]);
      setDeselectedCommitShas(new Set());
      return;
    }

    const alreadyFetched =
      fetchedRangeRef.current?.since === since &&
      fetchedRangeRef.current?.until === until &&
      commitSummaries.length > 0;

    if (!alreadyFetched) {
      void fetchCommits(dateRange.start, dateRange.end);
    }

    setIsCommitDrawerOpen(true);
  }, [
    commitSummaries.length,
    dateRange?.end,
    dateRange?.start,
    fetchCommits,
    isLoadingCommits,
  ]);

  const handleCloseCommitDrawer = useCallback(() => {
    setIsCommitDrawerOpen(false);
  }, []);

  const handleToggleCommit = useCallback((sha: string) => {
    setDeselectedCommitShas((prev) => {
      const next = new Set(prev);
      if (next.has(sha)) {
        next.delete(sha);
      } else {
        next.add(sha);
      }
      return next;
    });
  }, []);

  const handleToggleAllCommits = useCallback(() => {
    setDeselectedCommitShas((prev) => {
      if (!commitSummaries.length) {
        return prev;
      }

      if (prev.size) {
        return new Set();
      }

      const all = new Set<string>();
      commitSummaries.forEach((commit) => {
        all.add(commit.sha);
      });
      return all;
    });
  }, [commitSummaries]);

  const smartDetectionDisabledReason = "Coming soon";

  const handleContinue = useCallback(() => {
    if (!isDateRangeComplete) {
      return;
    }
    setIsConfirmationModalOpen(true);
  }, [isDateRangeComplete]);

  const handleConfirmGeneration = useCallback(async () => {
    if (!repoId || !currentIsoRange || !selectedCommits.length) {
      return;
    }

    setIsCreatingJob(true);

    try {
      const response = await fetch(`/api/repositories/${repoId}/jobs`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          selectedCommits: selectedCommits.map((commit) => ({
            sha: commit.sha,
            message: commit.message,
            committedAt: commit.committedAt,
            authorName: commit.authorName,
            authorEmail: commit.authorEmail,
            htmlUrl: commit.htmlUrl,
          })),
          dateRangeStart: currentIsoRange.since,
          dateRangeEnd: currentIsoRange.until,
        }),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body?.error ?? "Failed to create changelog job");
      }

      const body = await response.json();
      const jobId = body.jobId;

      if (jobId) {
        // Redirect to the job page
        window.location.href = `/generate/${jobId}`;
      }
    } catch (error) {
      console.error("Failed to create job:", error);
      // You might want to show an error message here
    } finally {
      setIsCreatingJob(false);
    }
  }, [repoId, currentIsoRange, selectedCommits]);

  const handleCloseConfirmationModal = useCallback(() => {
    setIsConfirmationModalOpen(false);
  }, []);

  return (
    <div className="max-w-4xl  py-10 px-6 space-y-8">
      <RepositoryBreadcrumbs
        items={[
          { label: "Repositories", href: "/my-repositories" },
          { label: repoId, href: `/my-repositories/${repoId}` },
          { label: "Generate" },
        ]}
      />

      <div className="space-y-4">
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">
          Generate Changelog
        </h1>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Repo ID: <span className="font-mono">{repoId}</span>
        </p>
      </div>

      {isLoading ? (
        <div className="flex min-h-[160px] items-center justify-center rounded-xl border border-dashed border-slate-300 dark:border-slate-700">
          <Spinner label="Loading repository data" />
        </div>
      ) : error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-600 dark:border-red-800 dark:bg-red-900/10 dark:text-red-300">
          {error}
        </div>
      ) : data ? (
        <div className="space-y-8">
          <section className="space-y-4">
            <div className="rounded-xl border border-slate-200  p-6 shadow-sm dark:border-slate-800 ">
              <div className="space-y-2">
                <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                  1. Select Range
                </h2>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Decide how we should collect commits for this changelog.
                </p>
              </div>

              <div className="mt-5 grid gap-4">
                {RANGE_MODE_OPTIONS.map((option) => {
                  const isSelected = selectedMode === option.id;
                  const isSmart =
                    option.id === "smart" || option.id === "commits";

                  return (
                    <label
                      key={option.id}
                      className={`flex cursor-pointer flex-col gap-2 rounded-lg border p-4 transition-colors ${
                        isSelected
                          ? "border-primary-500 bg-primary-50/60 dark:border-primary-400 dark:bg-primary-500/10"
                          : "border-slate-200 hover:border-slate-300 dark:border-slate-700 dark:hover:border-slate-600"
                      } ${isSmart ? "cursor-not-allowed opacity-70" : ""}`}
                    >
                      <div className="flex items-center gap-3">
                        <Switch
                          aria-label={option.label}
                          isSelected={isSelected}
                          onValueChange={(value) => {
                            if (!isSmart && value) {
                              handleRangeModeChange(option.id);
                            }
                          }}
                          isDisabled={isSmart}
                        />
                        <div className="space-y-1">
                          <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                            {option.label}
                          </p>
                          <p className="text-xs text-slate-600 dark:text-slate-400">
                            {option.description}
                          </p>
                          {isSmart && (
                            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                              {smartDetectionDisabledReason}
                            </p>
                          )}
                        </div>
                      </div>

                      {option.id === "date" && isSelected && (
                        <div className="mt-3 space-y-3 text-xs text-slate-600 dark:text-slate-400">
                          <p>
                            Suggested:{" "}
                            {data.suggestedDateRange?.from
                              ? formatDateTime(data.suggestedDateRange.from)
                              : "-"}{" "}
                            →{" "}
                            {data.suggestedDateRange?.to
                              ? formatDateTime(data.suggestedDateRange.to)
                              : "-"}
                          </p>
                          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                            <Button
                              size="sm"
                              color="primary"
                              onPress={() => setIsDateRangeModalOpen(true)}
                            >
                              {isDateRangeComplete
                                ? "Edit Date Range"
                                : "Select Date Range"}
                            </Button>
                            <Button
                              size="sm"
                              variant="flat"
                              color="default"
                              isDisabled={!isDateRangeComplete}
                              onPress={handleOpenCommitDrawer}
                            >
                              View commits
                            </Button>
                            {selectedDateRangeLabel ? (
                              <span className="text-xs text-slate-600 dark:text-slate-400">
                                Selected:{" "}
                                <span className="font-medium text-slate-700 dark:text-slate-200">
                                  {selectedDateRangeLabel}
                                </span>
                              </span>
                            ) : (
                              <span className="text-[11px] uppercase tracking-wide text-slate-500 dark:text-slate-500">
                                No date range selected yet.
                              </span>
                            )}
                          </div>
                        </div>
                      )}

                      {option.id === "commits" && isSelected && (
                        <div className="mt-3 space-y-3 text-xs text-slate-600 dark:text-slate-400">
                          <p>
                            Default branch:{" "}
                            <span className="font-medium text-slate-700 dark:text-slate-200">
                              {data.defaultBranch ?? "Unknown"}
                            </span>
                          </p>
                          {comparisonSummary ? (
                            <div className="space-y-1">
                              <p>
                                Preview: {comparisonSummary.baseRef} →{" "}
                                {comparisonSummary.headRef} (
                                {formatNumber(comparisonSummary.totalCommits)}{" "}
                                commits,{" "}
                                {formatNumber(
                                  comparisonSummary.uniqueContributors
                                )}{" "}
                                contributors)
                              </p>
                              {comparisonSummary.htmlUrl && (
                                <a
                                  href={comparisonSummary.htmlUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-primary-600 underline-offset-2 hover:underline dark:text-primary-200"
                                >
                                  View comparison on GitHub
                                </a>
                              )}
                            </div>
                          ) : (
                            <p>No comparison preview available.</p>
                          )}
                          <p className="text-[11px] uppercase tracking-wide text-slate-500 dark:text-slate-500">
                            Commit/tag selectors coming soon.
                          </p>
                        </div>
                      )}
                    </label>
                  );
                })}
              </div>
            </div>
          </section>

          {shouldShowProcessingOverview && (
            <section className="space-y-4">
              <div className="rounded-xl border border-slate-200  p-6 shadow-sm dark:border-slate-800 ">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                      Processing overview
                    </h2>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      Estimated effort based on the commits selected for this
                      generation.
                    </p>
                  </div>
                  <div className="flex gap-2 text-xs text-slate-500 dark:text-slate-400">
                    <span>Branch: {data.defaultBranch ?? "Unknown"}</span>
                    {comparisonSummary?.baseRef &&
                      comparisonSummary?.headRef && (
                        <span className="font-mono">
                          {comparisonSummary.baseRef} →{" "}
                          {comparisonSummary.headRef}
                        </span>
                      )}
                  </div>
                </div>

                <div className="mt-4 grid gap-4 md:grid-cols-3">
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm dark:border-slate-800 dark:bg-slate-900/40">
                    <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
                      Estimated processing time
                    </p>
                    {isProcessingOverviewLoading ? (
                      <div className="mt-2 space-y-2">
                        <div className="h-6 w-20 bg-slate-200 dark:bg-slate-700 rounded animate-pulse"></div>
                        <div className="h-3 w-32 bg-slate-200 dark:bg-slate-700 rounded animate-pulse"></div>
                      </div>
                    ) : (
                      <>
                        <p className="mt-2 text-lg font-semibold text-slate-900 dark:text-slate-100">
                          {estimatedProcessingTimeLabel ?? "Unavailable"}
                        </p>
                        <p className="text-[11px] text-slate-500 dark:text-slate-500">
                          We approximate half a minute per commit.
                        </p>
                      </>
                    )}
                  </div>

                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm dark:border-slate-800 dark:bg-slate-900/40">
                    <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
                      Commits selected
                    </p>
                    {isProcessingOverviewLoading ? (
                      <div className="mt-2 space-y-2">
                        <div className="h-6 w-16 bg-slate-200 dark:bg-slate-700 rounded animate-pulse"></div>
                        <div className="h-3 w-36 bg-slate-200 dark:bg-slate-700 rounded animate-pulse"></div>
                      </div>
                    ) : (
                      <>
                        <p className="mt-2 text-lg font-semibold text-slate-900 dark:text-slate-100">
                          {formatNumber(selectedCommitCount)}
                        </p>
                        <p className="text-[11px] text-slate-500 dark:text-slate-500">
                          Based on the current commit selection.
                        </p>
                      </>
                    )}
                  </div>

                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm dark:border-slate-800 dark:bg-slate-900/40">
                    <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
                      Preview commits
                    </p>
                    <div className="mt-2 flex flex-col gap-2">
                      <Button
                        size="sm"
                        variant="flat"
                        color="default"
                        onPress={handleOpenCommitDrawer}
                        isDisabled={!isDateRangeComplete || isLoadingCommits}
                      >
                        {isProcessingOverviewLoading
                          ? "Loading..."
                          : "Preview commits"}
                      </Button>
                      {comparisonSummary?.htmlUrl && (
                        <a
                          href={comparisonSummary.htmlUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs font-medium text-primary-600 underline-offset-2 hover:underline dark:text-primary-200"
                        >
                          View comparison on GitHub
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </section>
          )}

          <div className="flex items-center justify-end gap-3">
            <Button variant="flat" color="default" isDisabled>
              Back
            </Button>
            <Button
              color="primary"
              isDisabled={isContinueDisabled}
              onPress={handleContinue}
            >
              Continue
            </Button>
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-slate-300 p-6 text-sm text-slate-600 dark:border-slate-700 dark:text-slate-400">
          No data available.
        </div>
      )}

      <Modal
        isOpen={isDateRangeModalOpen}
        onOpenChange={setIsDateRangeModalOpen}
        size="2xl"
      >
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader className="flex flex-col gap-1">
                Select Date Range
              </ModalHeader>
              <ModalBody>
                <div className="flex justify-center  py-10">
                  <RangeCalendar
                    aria-label="Select date range"
                    value={dateRange ?? undefined}
                    onChange={handleDateRangeChange}
                    visibleMonths={2}
                  />
                </div>
              </ModalBody>
              <ModalFooter>
                <Button variant="flat" color="default" onPress={onClose}>
                  Cancel
                </Button>
                <Button
                  color="primary"
                  isDisabled={!isDateRangeComplete}
                  onPress={onClose}
                >
                  Save Selection
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>

      <Drawer
        isOpen={isCommitDrawerOpen}
        onClose={handleCloseCommitDrawer}
        placement="right"
        size="lg"
      >
        <DrawerContent>
          <DrawerHeader className="flex flex-col gap-1">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
              Commits in selected range
            </h2>
            {selectedDateRangeLabel && (
              <p className="text-sm text-slate-600 dark:text-slate-400">
                {selectedDateRangeLabel}
              </p>
            )}
          </DrawerHeader>
          <DrawerBody className="space-y-4">
            {isLoadingCommits ? (
              <div className="flex h-40 items-center justify-center">
                <Spinner label="Loading commits" />
              </div>
            ) : commitsError ? (
              <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-600 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300">
                {commitsError}
              </div>
            ) : !commitSummaries.length ? (
              <div className="rounded-lg border border-dashed border-slate-200 p-6 text-sm text-slate-600 dark:border-slate-800 dark:text-slate-400">
                No commits found in this range.
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm text-slate-600 dark:text-slate-400">
                  <span>
                    Showing {commitSummaries.length} commits. Selected{" "}
                    {selectedCommits.length} commits.
                  </span>
                  <Button
                    size="sm"
                    variant="flat"
                    onPress={handleToggleAllCommits}
                  >
                    {deselectedCommitShas.size ? "Select all" : "Deselect all"}
                  </Button>
                </div>
                <ul className="space-y-3">
                  {commitSummaries.map((commit) => {
                    const isDeselected = deselectedCommitShas.has(commit.sha);
                    return (
                      <li
                        key={commit.sha}
                        className={`rounded-lg border p-4 text-sm transition-colors ${
                          isDeselected
                            ? "border-slate-200 bg-slate-50 opacity-70 dark:border-slate-800 dark:bg-slate-900/40"
                            : "border-slate-200  dark:border-slate-700 "
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <Checkbox
                            isSelected={!isDeselected}
                            onValueChange={() => handleToggleCommit(commit.sha)}
                            aria-label={`Include commit ${commit.sha}`}
                          />
                          <div className="space-y-1">
                            <p className="font-medium text-slate-900 dark:text-slate-100">
                              {formatCommitMessage(commit.message)}
                            </p>
                            <p className="text-xs font-mono text-slate-500 dark:text-slate-500">
                              {commit.sha.slice(0, 12)}
                            </p>
                            <p className="text-xs text-slate-500 dark:text-slate-500">
                              {formatDateTime(commit.committedAt)}
                              {commit.authorName
                                ? ` • ${commit.authorName}`
                                : ""}
                            </p>
                            {commit.htmlUrl && (
                              <a
                                href={commit.htmlUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="text-xs font-medium text-primary-600 underline-offset-2 hover:underline dark:text-primary-200"
                              >
                                View on GitHub
                              </a>
                            )}
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
          </DrawerBody>
          <DrawerFooter>
            <div className="flex w-full items-center justify-between">
              <p className="text-xs text-slate-500 dark:text-slate-500">
                {selectedCommits.length} commit(s) selected
              </p>
              <div className="flex gap-2">
                <Button variant="light" onPress={handleCloseCommitDrawer}>
                  Close
                </Button>
                <Button color="primary" onPress={handleCloseCommitDrawer}>
                  Save
                </Button>
              </div>
            </div>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>

      <Modal
        isOpen={isConfirmationModalOpen}
        onOpenChange={setIsConfirmationModalOpen}
        size="2xl"
        scrollBehavior="inside"
      >
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader className="flex flex-col gap-1">
                Confirm Changelog Generation
              </ModalHeader>
              <ModalBody>
                <div className="space-y-4">
                  <div>
                    <h3 className="text-lg font-semibold mb-2">
                      Repository Details
                    </h3>
                    <div className="bg-slate-50 dark:bg-slate-800 p-3 rounded-lg">
                      <p className="text-sm text-slate-600 dark:text-slate-400">
                        <span className="font-medium">Repository:</span>{" "}
                        {data?.repository.full_name}
                      </p>
                      <p className="text-sm text-slate-600 dark:text-slate-400">
                        <span className="font-medium">Date Range:</span>{" "}
                        {selectedDateRangeLabel}
                      </p>
                      <p className="text-sm text-slate-600 dark:text-slate-400">
                        <span className="font-medium">Commits Selected:</span>{" "}
                        {selectedCommitCount}
                      </p>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold mb-2">
                      Selected Commits
                    </h3>
                    <ScrollShadow className="max-h-96 space-y-2">
                      {!selectedCommits.length ? (
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                          No commits selected
                        </p>
                      ) : (
                        <div className="space-y-2">
                          {selectedCommits.map((commit) => (
                            <div
                              key={commit.sha}
                              className="p-3  dark:bg-slate-800 rounded border"
                            >
                              <div className="space-y-1">
                                <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                                  {formatCommitMessage(commit.message)}
                                </p>
                                <p className="text-xs font-mono text-slate-500 dark:text-slate-500">
                                  {commit.sha.slice(0, 12)}
                                </p>
                                <div className="flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400">
                                  <span>
                                    {formatDateTime(commit.committedAt)}
                                  </span>
                                  {commit.authorName && (
                                    <span>• {commit.authorName}</span>
                                  )}
                                </div>
                                {commit.htmlUrl && (
                                  <a
                                    href={commit.htmlUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="text-xs font-medium text-primary-600 hover:text-primary-700 dark:text-primary-200 dark:hover:text-primary-100"
                                  >
                                    View on GitHub
                                  </a>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </ScrollShadow>
                  </div>

                  <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 p-3 rounded-lg">
                    <p className="text-sm text-amber-800 dark:text-amber-200">
                      <strong>Processing Time:</strong>{" "}
                      {estimatedProcessingTimeLabel}
                    </p>
                    <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                      This process will run in the background. You'll be
                      redirected to a status page where you can monitor
                      progress.
                    </p>
                  </div>
                </div>
              </ModalBody>
              <ModalFooter>
                <Button
                  variant="flat"
                  color="default"
                  onPress={handleCloseConfirmationModal}
                  isDisabled={isCreatingJob}
                >
                  Cancel
                </Button>
                <Button
                  color="primary"
                  onPress={handleConfirmGeneration}
                  isLoading={isCreatingJob}
                  isDisabled={isCreatingJob || !selectedCommits.length}
                >
                  {isCreatingJob ? "Creating Job..." : "Generate Changelog"}
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </div>
  );
}

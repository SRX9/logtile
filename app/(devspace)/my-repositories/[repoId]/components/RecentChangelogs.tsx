"use client";

import { useCallback } from "react";
import Link from "next/link";
import { Button } from "@heroui/button";
import { Card, CardBody } from "@heroui/card";
import { Skeleton } from "@heroui/skeleton";
import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  GitCommit,
  Loader2,
  RefreshCcw,
  type LucideIcon,
} from "lucide-react";

import { buildDateRangeLabel, formatDate } from "../utils/date";
import { ChangelogMetadata, RepositoryChangelogResponse } from "../types";

type RecentChangelogsProps = {
  changelogFeed: RepositoryChangelogResponse | null;
  isChangelogLoading: boolean;
  changelogError: string | null;
  isLoadingMore: boolean;
  onViewAll: () => void;
  onRetry: () => void;
  onLoadMore: () => Promise<void>;
};

const skeletonItems = Array.from({ length: 3 });

type StatusConfig = {
  label: string;
  title: string;
  description?: string;
  icon: LucideIcon;
  iconBg: string;
  iconClass?: string;
  badgeClass: string;
  badgeIconClass?: string;
  cardAccent: string;
};

const STATUS_CONFIG: Record<ChangelogMetadata["status"], StatusConfig> = {
  pending: {
    label: "Pending",
    title: "Queued for generation",
    description: "Waiting for the next available slot.",
    icon: Loader2,
    iconBg:
      "bg-amber-50 text-amber-600 ring-1 ring-amber-200/60 dark:bg-amber-500/10 dark:text-amber-200 dark:ring-amber-500/40",
    iconClass: "motion-safe:animate-spin",
    badgeClass:
      "border border-amber-200/60 bg-amber-50/80 text-amber-700 dark:border-amber-400/30 dark:bg-amber-500/10 dark:text-amber-200",
    badgeIconClass: "motion-safe:animate-spin",
    cardAccent: "border-l-2 border-l-amber-400/70 dark:border-l-amber-400/40",
  },
  processing: {
    label: "Processing",
    title: "Generating summary",
    description: "We're compiling commit activity for this window.",
    icon: RefreshCcw,
    iconBg:
      "bg-sky-50 text-sky-600 ring-1 ring-sky-200/60 dark:bg-sky-500/10 dark:text-sky-200 dark:ring-sky-500/40",
    iconClass: "motion-safe:animate-spin",
    badgeClass:
      "border border-sky-200/60 bg-sky-50/80 text-sky-700 dark:border-sky-400/30 dark:bg-sky-500/10 dark:text-sky-200",
    badgeIconClass: "motion-safe:animate-spin",
    cardAccent: "border-l-2 border-l-sky-400/70 dark:border-l-sky-400/40",
  },
  completed: {
    label: "Completed",
    title: "Changelog ready",
    description: "Latest summary is ready to review.",
    icon: CheckCircle2,
    iconBg:
      "bg-emerald-50 text-emerald-600 ring-1 ring-emerald-200/60 dark:bg-emerald-500/10 dark:text-emerald-200 dark:ring-emerald-500/40",
    badgeClass:
      "border border-emerald-200/60 bg-emerald-50/80 text-emerald-700 dark:border-emerald-400/30 dark:bg-emerald-500/10 dark:text-emerald-200",
    cardAccent:
      "border-l-2 border-l-emerald-400/80 dark:border-l-emerald-500/50",
  },
  failed: {
    label: "Failed",
    title: "Generation failed",
    description: "We ran into an issue building this changelog.",
    icon: AlertTriangle,
    iconBg:
      "bg-rose-50 text-rose-600 ring-1 ring-rose-200/60 dark:bg-rose-500/10 dark:text-rose-200 dark:ring-rose-500/40",
    badgeClass:
      "border border-rose-200/60 bg-rose-50/80 text-rose-700 dark:border-rose-400/30 dark:bg-rose-500/10 dark:text-rose-200",
    cardAccent: "border-l-2 border-l-rose-400/70 dark:border-l-rose-500/50",
  },
};

export function RecentChangelogs({
  changelogFeed,
  isChangelogLoading,
  changelogError,
  isLoadingMore,
  onViewAll,
  onRetry,
  onLoadMore,
}: RecentChangelogsProps) {
  const renderSkeleton = useCallback(() => {
    return (
      <div className="space-y-4">
        <ul className="space-y-3">
          {skeletonItems.map((_, index) => (
            <li
              key={index}
              className="rounded-xl border border-slate-200/70 bg-white/90 px-4 py-3 text-sm shadow-sm dark:border-slate-800/60 dark:bg-slate-900/50"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Skeleton className="h-3 w-24 rounded-lg bg-slate-200/70 dark:bg-slate-700/70" />
                  <Skeleton className="h-3 w-16 rounded-lg bg-slate-200/70 dark:bg-slate-700/70" />
                </div>
                <Skeleton className="h-3 w-40 rounded-lg bg-slate-200/60 dark:bg-slate-700/60" />
              </div>
            </li>
          ))}
        </ul>
      </div>
    );
  }, []);

  const renderChangelogItem = useCallback((item: ChangelogMetadata) => {
    const status = STATUS_CONFIG[item.status];
    const StatusIcon = status.icon;
    const hasTitle = item.changelog_title?.title;

    // Use changelog title date if available, otherwise fall back to created_at
    const displayDate =
      hasTitle && item.changelog_title
        ? formatDate(item.changelog_title.date)
        : formatDate(item.created_at);

    return (
      <li key={item.id} className="rounded-xl text-sm">
        <Link href={`/generate/${item.id}`} className="block">
          <Card
            shadow="sm"
            className={`group overflow-hidden transition-all hover:shadow-md`}
          >
            <CardBody className="space-y-2 p-4 ">
              {/* Header with date and status */}
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs -mt-3 font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  {displayDate}
                </span>
                <span
                  className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${
                    hasTitle && item.status === "completed"
                      ? "border border-emerald-200/60 bg-emerald-50/80 text-emerald-700 dark:border-emerald-400/30 dark:bg-emerald-500/10 dark:text-emerald-200"
                      : status.badgeClass
                  }`}
                >
                  {hasTitle && item.status === "completed" ? (
                    <CheckCircle2 className="h-3.5 w-3.5" />
                  ) : (
                    <StatusIcon
                      className={`h-3.5 w-3.5 ${status.badgeIconClass ?? ""}`}
                    />
                  )}
                  {hasTitle && item.status === "completed"
                    ? "Ready"
                    : status.label}
                </span>
              </div>

              <div className="flex items-start gap-3 pb-2">
                <span
                  className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${
                    hasTitle && item.status === "completed"
                      ? "bg-emerald-50 text-emerald-600 ring-1 ring-emerald-200/60 dark:bg-emerald-500/10 dark:text-emerald-200 dark:ring-emerald-500/40"
                      : status.iconBg
                  }`}
                >
                  {hasTitle && item.status === "completed" ? (
                    <CheckCircle2 className="h-6 w-6" />
                  ) : (
                    <StatusIcon
                      className={`h-6 w-6 ${status.iconClass ?? ""}`}
                    />
                  )}
                </span>
                <div className="flex-1 space-y-2">
                  {/* Title and version */}
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 leading-tight">
                      {hasTitle && item.changelog_title
                        ? item.changelog_title.title
                        : status.title}
                    </p>
                    {hasTitle && item.changelog_title?.version_number && (
                      <p className="text-xs font-medium text-slate-600 dark:text-slate-300">
                        Version {item.changelog_title.version_number}
                      </p>
                    )}
                  </div>

                  {/* Description - only show for non-completed states or when no title */}
                  {(!hasTitle || item.status !== "completed") &&
                    status.description && (
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {status.description}
                      </p>
                    )}

                  {/* Metadata */}
                  <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600 dark:text-slate-400">
                    <span className="inline-flex items-center gap-1 font-medium text-slate-700 dark:text-slate-300">
                      <GitCommit className="h-4 w-4" />
                      {item.commit_count} commits
                    </span>
                    {item.date_range_start || item.date_range_end ? (
                      <span className="inline-flex items-center gap-1">
                        <CalendarDays className="h-4 w-4" />
                        {buildDateRangeLabel(
                          item.date_range_start,
                          item.date_range_end
                        )}
                      </span>
                    ) : null}
                  </div>
                </div>
              </div>
            </CardBody>
          </Card>
        </Link>
      </li>
    );
  }, []);

  const renderContent = useCallback(() => {
    if (isChangelogLoading && !changelogFeed?.changelogs.length) {
      return renderSkeleton();
    }

    if (changelogError) {
      return (
        <div className="rounded-xl border border-red-200 bg-red-50 px-6 py-8 text-center text-sm text-red-600 dark:border-red-900/60 dark:bg-red-900/20 dark:text-red-300">
          <p className="font-medium">Failed to load changelogs.</p>
          <p className="mt-1 text-xs">{changelogError}</p>
          <Button
            size="sm"
            color="primary"
            variant="flat"
            className="mt-3"
            onPress={() => {
              void onRetry();
            }}
          >
            Try again
          </Button>
        </div>
      );
    }

    if (!changelogFeed?.changelogs.length) {
      return (
        <div className="rounded-xl border border-dashed border-slate-300/80 bg-slate-50/70 px-6 py-10 text-center text-sm text-slate-600 dark:border-slate-700/80 dark:bg-slate-900/40 dark:text-slate-400">
          <p className="font-medium text-slate-700 dark:text-slate-300">
            No changelog entries yet.
          </p>
          <p>Generate a changelog to populate this feed.</p>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        <ul className="space-y-3">
          {changelogFeed.changelogs.map((item) => renderChangelogItem(item))}
        </ul>

        <div className="flex justify-center">
          <Button
            variant="flat"
            color="default"
            size="sm"
            isDisabled={!changelogFeed.pagination.hasMore}
            isLoading={isLoadingMore}
            onPress={() => {
              void onLoadMore();
            }}
          >
            {changelogFeed.pagination.hasMore ? "Load more" : "No more results"}
          </Button>
        </div>
      </div>
    );
  }, [
    changelogError,
    changelogFeed,
    isChangelogLoading,
    isLoadingMore,
    onLoadMore,
    onRetry,
    renderChangelogItem,
    renderSkeleton,
  ]);

  return (
    <div>
      <div className="space-y-5">
        <div className="flex flex-col gap-3 px-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
              Recent changelogs
            </h2>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              Summaries of what’s been shipped will appear here.
            </p>
          </div>
          <Button
            color="default"
            variant="flat"
            isDisabled={!changelogFeed?.changelogs.length}
            onPress={onViewAll}
          >
            View all
          </Button>
        </div>

        {renderContent()}
      </div>
    </div>
  );
}

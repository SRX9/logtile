"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { notFound, useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Avatar } from "@heroui/avatar";
import { Button } from "@heroui/button";
import { Card, CardBody } from "@heroui/card";
import { Divider } from "@heroui/divider";
import { Chip } from "@heroui/chip";
import { Skeleton } from "@heroui/skeleton";

import { RepositoryBreadcrumbs } from "@/components/repository-breadcrumbs";

import { ApiResponse, RepositoryChangelogResponse } from "./types";
import { RecentChangelogs } from "./components/RecentChangelogs";
import { buildDateRangeLabel, formatDate } from "./utils/date";
import { GitBranchIcon } from "lucide-react";

export default function RepositoryDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const { repoId } = params as { repoId?: string };
  const [data, setData] = useState<ApiResponse | null>(null);
  const [isChangelogLoading, setChangelogLoading] = useState(false);
  const [changelogError, setChangelogError] = useState<string | null>(null);
  const [changelogFeed, setChangelogFeed] =
    useState<RepositoryChangelogResponse | null>(null);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const activeRequestRef = useRef<{
    repoId: string;
    controller: AbortController;
    promise: Promise<ApiResponse>;
  } | null>(null);
  const activeChangelogRequest = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!repoId) {
      notFound();
      return;
    }

    const existingRequest = activeRequestRef.current;

    if (existingRequest && existingRequest.repoId !== repoId) {
      existingRequest.controller.abort();
      activeRequestRef.current = null;
    }

    let request = activeRequestRef.current;
    const isNewRequest = !request;

    if (isNewRequest) {
      const controller = new AbortController();
      const promise = (async () => {
        const response = await fetch(`/api/repositories/${repoId}`, {
          signal: controller.signal,
        });

        if (!response.ok) {
          const body = await response.json().catch(() => ({}));
          throw new Error(body?.error ?? "Failed to load repository");
        }

        return (await response.json()) as ApiResponse;
      })();

      request = {
        repoId,
        controller,
        promise,
      };

      activeRequestRef.current = request;
      setIsLoading(true);
      setError(null);
    }

    if (!request) {
      return;
    }

    let cancelled = false;

    request.promise
      .then((body) => {
        if (cancelled) {
          return;
        }

        setData(body);
      })
      .catch((err) => {
        if (cancelled) {
          return;
        }

        if (err instanceof DOMException && err.name === "AbortError") {
          return;
        }

        console.error(err);
        setError(
          err instanceof Error ? err.message : "Failed to load repository"
        );
      })
      .finally(() => {
        if (cancelled) {
          return;
        }

        if (activeRequestRef.current?.repoId === repoId) {
          activeRequestRef.current = null;
        }

        setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [repoId]);

  const details = data?.details;
  const repository = data?.repository;

  const loadChangelogs = useCallback(
    async ({ cursor, append }: { cursor?: string; append?: boolean } = {}) => {
      if (!repoId) {
        return;
      }

      if (activeChangelogRequest.current) {
        activeChangelogRequest.current.abort();
        activeChangelogRequest.current = null;
      }

      const controller = new AbortController();
      activeChangelogRequest.current = controller;

      if (append) {
        setIsLoadingMore(true);
      } else {
        setChangelogLoading(true);
        setChangelogError(null);
        if (!cursor) {
          setChangelogFeed(null);
        }
      }

      try {
        const params = new URLSearchParams();
        params.set("limit", "10");
        if (cursor) {
          params.set("cursor", cursor);
        }

        const queryString = params.toString();
        const endpoint = queryString
          ? `/api/repositories/${repoId}/changelogs?${queryString}`
          : `/api/repositories/${repoId}/changelogs`;

        const response = await fetch(endpoint, {
          signal: controller.signal,
        });

        const payload = (await response.json()) as
          | RepositoryChangelogResponse
          | { error?: string };

        if (!response.ok || !payload || !("changelogs" in payload)) {
          // payload may not have 'error' property, so check before accessing
          const errorMsg =
            typeof payload === "object" &&
            payload !== null &&
            "error" in payload &&
            typeof (payload as any).error === "string"
              ? (payload as any).error
              : "Failed to load changelogs";
          throw new Error(errorMsg);
        }

        setChangelogFeed((prev) => {
          if (append && prev) {
            return {
              changelogs: [...prev.changelogs, ...payload.changelogs],
              pagination: payload.pagination,
            };
          }

          return payload;
        });
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") {
          return;
        }

        setChangelogError(
          err instanceof Error ? err.message : "Failed to load changelogs"
        );
      } finally {
        if (activeChangelogRequest.current === controller) {
          activeChangelogRequest.current = null;
        }

        if (append) {
          setIsLoadingMore(false);
        } else {
          setChangelogLoading(false);
        }
      }
    },
    [repoId]
  );

  const loadMoreChangelogs = useCallback(async () => {
    if (
      !changelogFeed?.pagination.hasMore ||
      !changelogFeed.pagination.nextCursor
    ) {
      return;
    }

    await loadChangelogs({
      cursor: changelogFeed.pagination.nextCursor,
      append: true,
    });
  }, [changelogFeed, loadChangelogs]);

  useEffect(() => {
    if (!repoId) {
      return;
    }

    void loadChangelogs();

    return () => {
      if (activeChangelogRequest.current) {
        activeChangelogRequest.current.abort();
        activeChangelogRequest.current = null;
      }
    };
  }, [repoId, loadChangelogs]);

  const activityStats = useMemo(() => {
    if (!details) {
      return [];
    }

    return [
      { label: "Stars", value: details.stargazers_count },
      { label: "Forks", value: details.forks_count },
      { label: "Watchers", value: details.watchers_count },
      { label: "Subscribers", value: details.subscribers_count },
      { label: "Open Issues", value: details.open_issues_count },
    ];
  }, [details]);

  if (isLoading) {
    return (
      <div className="w-full max-w-5xl space-y-10 px-8 py-8 ">
        <Skeleton className="h-4 w-32 rounded-lg bg-slate-200/80 dark:bg-slate-700/80" />

        <Card shadow="sm">
          <CardBody className="space-y-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="flex items-start gap-4">
                <Skeleton className="h-14 w-14 rounded-full bg-slate-200/80 dark:bg-slate-700/80" />
                <div className="space-y-3">
                  <Skeleton className="h-5 w-52 rounded-lg bg-slate-200/80 dark:bg-slate-700/80" />
                  <Skeleton className="h-4 w-40 rounded-lg bg-slate-200/70 dark:bg-slate-700/70" />
                </div>
              </div>
              <Skeleton className="h-10 w-36 rounded-lg bg-slate-200/70 dark:bg-slate-700/70" />
            </div>
            <div className="flex flex-wrap gap-2">
              {Array.from({ length: 3 }).map((_, index) => (
                <Skeleton
                  key={index}
                  className="h-6 w-20 rounded-full bg-slate-200/60 dark:bg-slate-700/60"
                />
              ))}
            </div>
          </CardBody>
        </Card>

        <div className="grid gap-6 md:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)]">
          <Card shadow="sm">
            <CardBody className="space-y-5">
              <Skeleton className="h-5 w-48 rounded-lg bg-slate-200/80 dark:bg-slate-700/80" />
              <div className="grid gap-4 sm:grid-cols-2">
                {Array.from({ length: 6 }).map((_, index) => (
                  <div key={index} className="space-y-2">
                    <Skeleton className="h-3 w-32 rounded-lg bg-slate-200/60 dark:bg-slate-700/60" />
                    <Skeleton className="h-4 w-24 rounded-lg bg-slate-200/70 dark:bg-slate-700/70" />
                  </div>
                ))}
              </div>
              <div className="space-y-3">
                <Skeleton className="h-3 w-24 rounded-lg bg-slate-200/60 dark:bg-slate-700/60" />
                <div className="flex flex-wrap gap-2">
                  {Array.from({ length: 4 }).map((_, index) => (
                    <Skeleton
                      key={index}
                      className="h-6 w-16 rounded-full bg-slate-200/60 dark:bg-slate-700/60"
                    />
                  ))}
                </div>
              </div>
            </CardBody>
          </Card>
          <Card shadow="sm">
            <CardBody className="space-y-5">
              <Skeleton className="h-5 w-32 rounded-lg bg-slate-200/80 dark:bg-slate-700/80" />
              <div className="grid gap-3 sm:grid-cols-2">
                {Array.from({ length: 4 }).map((_, index) => (
                  <div
                    key={index}
                    className="space-y-2 rounded-xl border border-slate-200/60 bg-slate-50/80 p-4 dark:border-slate-800/60 dark:bg-slate-900/40"
                  >
                    <Skeleton className="h-3 w-20 rounded-lg bg-slate-200/60 dark:bg-slate-700/60" />
                    <Skeleton className="h-4 w-16 rounded-lg bg-slate-200/70 dark:bg-slate-700/70" />
                  </div>
                ))}
              </div>
            </CardBody>
          </Card>
        </div>

        <section className="space-y-4">
          <div className="space-y-2">
            <Skeleton className="h-5 w-40 rounded-lg bg-slate-200/80 dark:bg-slate-700/80" />
            <Skeleton className="h-4 w-64 rounded-lg bg-slate-200/70 dark:bg-slate-700/70" />
          </div>
          <Card shadow="sm">
            <CardBody className="space-y-3 py-10 text-center">
              <Skeleton className="mx-auto h-4 w-48 rounded-lg bg-slate-200/70 dark:bg-slate-700/70" />
              <Skeleton className="mx-auto h-3 w-32 rounded-lg bg-slate-200/60 dark:bg-slate-700/60" />
            </CardBody>
          </Card>
        </section>

        <Divider />

        <footer className="flex flex-col gap-3 text-sm text-slate-500 dark:text-slate-400 sm:flex-row sm:items-center sm:justify-between">
          <Skeleton className="h-4 w-64 rounded-lg bg-slate-200/70 dark:bg-slate-700/70" />
          <Skeleton className="h-4 w-52 rounded-lg bg-slate-200/70 dark:bg-slate-700/70" />
        </footer>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl  py-10 px-6">
        <Card className="border border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20">
          <CardBody className="space-y-4">
            <div className="text-sm text-red-600 dark:text-red-300">
              {error}
            </div>
            <Button variant="flat" onPress={() => router.back()}>
              Go back
            </Button>
          </CardBody>
        </Card>
      </div>
    );
  }

  if (!repository) {
    return null;
  }

  return (
    <div className="w-full max-w-5xl space-y-8 px-8 py-8 pb-40">
      <RepositoryBreadcrumbs
        className="text-xs text-slate-500 dark:text-slate-400"
        items={[
          { label: "Repositories", href: "/my-repositories" },
          {
            label: repository.full_name,
            href: `/my-repositories/${repository.repo_id}`,
          },
        ]}
      />

      <Card shadow="sm">
        <CardBody className="space-y-6">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-start gap-4">
              <Avatar
                size="lg"
                src={details?.owner.avatar_url}
                name={repository.owner}
                className="border border-slate-200 dark:border-slate-700"
              />
              <div className="space-y-3">
                <div className="space-y-1">
                  <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
                    {repository.full_name}
                  </h1>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    Connected {formatDate(repository.connected_at)}
                  </p>
                </div>
                {repository.description && (
                  <p className="max-w-3xl text-sm text-slate-700 dark:text-slate-300">
                    {repository.description}
                  </p>
                )}
                <div className="flex flex-wrap gap-2 text-[11px] uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  <Chip size="sm" variant="flat" color="default">
                    {repository.visibility ?? "unknown"}
                  </Chip>
                  <Chip size="sm" variant="flat" color="default">
                    <div className="flex items-center gap-1 px-1">
                      <GitBranchIcon className="w-4 h-4" />{" "}
                      {repository.default_branch ?? "n/a"}
                    </div>
                  </Chip>
                  {details?.archived && (
                    <Chip size="sm" variant="flat" color="warning">
                      Archived
                    </Chip>
                  )}
                  {details?.disabled && (
                    <Chip size="sm" variant="flat" color="danger">
                      Disabled
                    </Chip>
                  )}
                </div>
              </div>
            </div>
            <div className="flex flex-col items-start gap-2 justify-between h-full sm:items-end">
              <Button
                color="primary"
                variant="solid"
                onPress={() =>
                  router.push(`/my-repositories/${repository.repo_id}/generate`)
                }
              >
                Generate changelog
              </Button>
            </div>
          </div>
        </CardBody>
      </Card>

      {details && (
        <section className="grid gap-6 -mt-3 md:grid-cols-[minmax(0,1.65fr)_minmax(0,1fr)]">
          <Card className="p-3 " shadow="sm">
            <CardBody className="space-y-5">
              <div>
                <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                  Repository overview
                </h2>
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  Key meta pulled live from GitHub.
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1">
                  <p className="text-[11px] uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    Primary language
                  </p>
                  <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                    {details.language ?? "Not specified"}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-[11px] uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    License
                  </p>
                  <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                    {details.license?.name ?? "Unlicensed"}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-[11px] uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    Created
                  </p>
                  <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                    {formatDate(details.created_at)}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-[11px] uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    Last pushed
                  </p>
                  <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                    {formatDate(details.pushed_at)}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-[11px] uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    Last updated
                  </p>
                  <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                    {formatDate(details.updated_at)}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-[11px] uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    Default branch
                  </p>
                  <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                    {details.default_branch ??
                      repository.default_branch ??
                      "n/a"}
                  </p>
                </div>
              </div>

              {!!details.topics?.length && (
                <div className="space-y-2">
                  <p className="text-[11px] uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    Topics
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {details.topics.map((topic) => (
                      <Chip key={topic} size="sm" variant="flat">
                        {topic}
                      </Chip>
                    ))}
                  </div>
                </div>
              )}
            </CardBody>
          </Card>

          {!!activityStats.length && (
            <Card className="p-3 " shadow="sm">
              <CardBody className="space-y-5">
                <div>
                  <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                    Activity snapshot
                  </h2>
                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    Latest numbers from GitHub.
                  </p>
                </div>
                <div className="grid gap-3">
                  {activityStats.map(({ label, value }) => (
                    <div
                      key={label}
                      className="flex items-baseline justify-between rounded-lg border border-slate-200/70 bg-slate-50/80 px-4 py-3 text-sm dark:border-slate-800/60 dark:bg-slate-900/40"
                    >
                      <span className="text-slate-600 dark:text-slate-400">
                        {label}
                      </span>
                      <span className="font-semibold text-slate-900 dark:text-slate-100">
                        {value.toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              </CardBody>
            </Card>
          )}
        </section>
      )}

      <RecentChangelogs
        changelogFeed={changelogFeed}
        isChangelogLoading={isChangelogLoading}
        changelogError={changelogError}
        isLoadingMore={isLoadingMore}
        onViewAll={() =>
          router.push(`/my-changelogs?repo=${repository.repo_id}`)
        }
        onRetry={loadChangelogs}
        onLoadMore={loadMoreChangelogs}
      />

      {data?.warning && (
        <Card className="border border-amber-200/70 bg-amber-50/80 dark:border-amber-900/60 dark:bg-amber-900/20">
          <CardBody className="text-sm text-amber-800 dark:text-amber-200">
            {data.warning}
          </CardBody>
        </Card>
      )}

      <Divider className="border-slate-200/80 dark:border-slate-800/60" />

      <footer className="flex flex-col gap-2 text-sm text-slate-500 dark:text-slate-400 sm:flex-row sm:items-center pb-40 sm:justify-between">
        <span>Connected via Logtiles • Repo ID: {repository.repo_id}</span>
        <div className="flex flex-wrap gap-3">
          <Link
            href={repository.html_url}
            target="_blank"
            className="hover:text-primary-500"
          >
            GitHub repository
          </Link>
          {details?.owner?.html_url && (
            <Link
              href={details.owner.html_url}
              target="_blank"
              className="hover:text-primary-500"
            >
              Owner profile
            </Link>
          )}
        </div>
      </footer>
    </div>
  );
}

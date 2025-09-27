"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { notFound, useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Avatar } from "@heroui/avatar";
import { Button } from "@heroui/button";
import { Card, CardBody } from "@heroui/card";
import { Divider } from "@heroui/divider";
import { Chip } from "@heroui/chip";
import { Spinner } from "@heroui/spinner";

import { RepositoryBreadcrumbs } from "@/components/repository-breadcrumbs";

type Repository = {
  id: string;
  repo_id: string;
  name: string;
  owner: string;
  full_name: string;
  description: string | null;
  html_url: string;
  default_branch: string | null;
  visibility: string | null;
  connected_at: string;
};

type GithubDetails = {
  full_name: string;
  description: string | null;
  stargazers_count: number;
  forks_count: number;
  watchers_count: number;
  subscribers_count: number;
  open_issues_count: number;
  topics: string[];
  language: string | null;
  license: { name: string } | null;
  archived: boolean;
  disabled: boolean;
  created_at: string;
  updated_at: string;
  pushed_at: string;
  default_branch?: string;
  owner: {
    login: string;
    avatar_url?: string;
    html_url?: string;
  };
};

type ApiResponse = {
  repository: Repository;
  details: GithubDetails | null;
  changelogs: unknown[];
  warning?: string;
  error?: string;
};

function formatDate(date: string | null | undefined) {
  if (!date) {
    return "-";
  }

  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) {
    return date;
  }

  return parsed.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default function RepositoryDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const { repoId } = params as { repoId?: string };
  const [data, setData] = useState<ApiResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const activeRequestRef = useRef<{
    repoId: string;
    controller: AbortController;
    promise: Promise<ApiResponse>;
  } | null>(null);

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
      <div className="flex min-h-[60vh] items-center justify-center">
        <Spinner label="Loading repository details" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto py-10 px-6">
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
    <div className="max-w-6xl mx-auto py-10 px-6 space-y-10">
      <RepositoryBreadcrumbs
        className="text-xs"
        items={[
          { label: "Repositories", href: "/my-repositories" },
          {
            label: repository.full_name,
            href: `/my-repositories/${repository.repo_id}`,
          },
        ]}
      />

      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <Avatar
              size="lg"
              src={details?.owner.avatar_url}
              name={repository.owner}
              className="border border-slate-200 dark:border-slate-700"
            />
            <div>
              <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">
                {repository.full_name}
              </h1>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Connected {formatDate(repository.connected_at)} • Default
                branch: {repository.default_branch ?? "n/a"}
              </p>
            </div>
          </div>
          {repository.description && (
            <p className="text-base text-slate-700 dark:text-slate-300 max-w-3xl">
              {repository.description}
            </p>
          )}
          <div className="flex gap-2 text-xs uppercase tracking-wider">
            <Chip size="sm" variant="flat" color="primary">
              {repository.visibility ?? "unknown"}
            </Chip>
            {details?.archived && (
              <Chip size="sm" variant="shadow" color="warning">
                Archived
              </Chip>
            )}
            {details?.disabled && (
              <Chip size="sm" variant="shadow" color="danger">
                Disabled
              </Chip>
            )}
          </div>
        </div>
        <div className="flex flex-col gap-3 items-start">
          <Button
            color="primary"
            variant="solid"
            onPress={() =>
              router.push(`/my-repositories/${repository.repo_id}/generate`)
            }
          >
            Generate Now
          </Button>
          <div className="text-xs text-slate-500 dark:text-slate-400">
            Generate a changelog summary for recent activity.
          </div>
        </div>
      </div>

      {details && (
        <section className="grid gap-6 md:grid-cols-[1.3fr_1fr]">
          <Card className="border border-slate-200 dark:border-slate-800 p-3">
            <CardBody className="space-y-4">
              <div>
                <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                  Repository Overview
                </h2>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Insights pulled live from GitHub.
                </p>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-1">
                  <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    Primary language
                  </p>
                  <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                    {details.language ?? "Not specified"}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    License
                  </p>
                  <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                    {details.license?.name ?? "Unlicensed"}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    Created
                  </p>
                  <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                    {formatDate(details.created_at)}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    Last pushed
                  </p>
                  <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                    {formatDate(details.pushed_at)}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    Last updated
                  </p>
                  <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                    {formatDate(details.updated_at)}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
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
                  <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
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
        </section>
      )}

      <section className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
              Recent Changelogs
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Summaries of what's been shipped. Coming soon.
            </p>
          </div>
          <Button color="primary" variant="flat" isDisabled>
            View All
          </Button>
        </div>
        <Card className="border border-dashed border-slate-300 dark:border-slate-700">
          <CardBody className="flex flex-col items-center gap-2 py-10 text-sm text-slate-600 dark:text-slate-400">
            <span className="font-medium text-slate-700 dark:text-slate-300">
              No changelog entries yet.
            </span>
            <span>Generate a changelog to see updates here.</span>
          </CardBody>
        </Card>
      </section>

      {data?.warning && (
        <Card className="border border-amber-200 bg-amber-50 dark:border-amber-900/60 dark:bg-amber-900/20">
          <CardBody className="text-sm text-amber-800 dark:text-amber-200">
            {data.warning}
          </CardBody>
        </Card>
      )}

      <Divider />

      <footer className="flex flex-col gap-3 text-sm text-slate-500 dark:text-slate-400 md:flex-row md:items-center md:justify-between">
        <div>Connected via Logtiles • Repo ID: {repository.repo_id}</div>
        <div className="flex gap-3">
          <Link
            href={repository.html_url}
            target="_blank"
            className="hover:underline"
          >
            GitHub Repository
          </Link>
          {details?.owner?.html_url && (
            <Link
              href={details.owner.html_url}
              target="_blank"
              className="hover:underline"
            >
              Owner Profile
            </Link>
          )}
        </div>
      </footer>
    </div>
  );
}

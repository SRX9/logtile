"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardBody, CardHeader } from "@heroui/card";
import { Chip } from "@heroui/chip";
import { Button } from "@heroui/button";
import { Skeleton } from "@heroui/skeleton";
import {
  Clock,
  FileClock,
  Layers,
  ChevronRight,
  CalendarRangeIcon,
  Tag,
} from "lucide-react";

import { GithubIcon } from "@/components/icons";
import { ChangelogJobSummary } from "@/types";

type ChangelogJobsResponse = {
  jobs: ChangelogJobSummary[];
  pagination: {
    limit: number;
    offset: number;
    hasMore: boolean;
  };
};

const statusColorMap = {
  pending: "warning",
  processing: "primary",
  completed: "success",
  failed: "danger",
} as const;

export default function MyChangelogsPage() {
  const [jobs, setJobs] = useState<ChangelogJobSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const fetchJobs = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/changelog-jobs?limit=50&offset=0");

      if (!response.ok) {
        throw new Error("Failed to fetch changelog jobs");
      }

      const data: ChangelogJobsResponse = await response.json();

      setJobs(data.jobs);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJobs();
  }, []);

  const handleJobClick = (jobId: string) => {
    router.push(`/generate/${jobId}`);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const LoadingSkeleton = () => (
    <div className="max-w-4xl mt-8 w-full px-6">
      <div className="mb-8">
        <Skeleton className="h-8 rounded-md" />
        <div className="mt-2">
          <Skeleton className="h-4 rounded-md" />
        </div>
      </div>
      <div className="grid gap-4">
        {Array.from({ length: 5 }).map((_, idx) => (
          <Card key={idx}>
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between w-full">
                <div className="flex items-start gap-3 flex-1">
                  <Skeleton className="h-9 w-9 rounded-md" />
                  <div className="flex-1">
                    <Skeleton className="h-5 w-64 rounded-md" />
                    <div className="mt-2 flex items-center gap-3">
                      <Skeleton className="h-4 rounded-md" />
                      <Skeleton className="h-4 rounded-md" />
                    </div>
                  </div>
                </div>
                <Skeleton className="h-6  rounded-md" />
              </div>
            </CardHeader>
            <CardBody className="pt-0">
              <div className="flex items-center justify-between">
                <Skeleton className="h-4 w-40 rounded-md" />
                <Skeleton className="h-8 w-28 rounded-md" />
              </div>
            </CardBody>
          </Card>
        ))}
      </div>
    </div>
  );

  if (loading) {
    return <LoadingSkeleton />;
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center max-w-4xl mx-auto min-h-[400px] gap-4">
        <p className="text-red-500">Error: {error}</p>
        <Button
          className="dark:text-primary-100"
          color="primary"
          onPress={fetchJobs}
        >
          Try Again
        </Button>
      </div>
    );
  }

  return (
    <div className="container p-6 px-8">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <FileClock className="w-7 h-7 text-slate-800 dark:text-slate-200" />
          <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">
            My Changelogs
          </h1>
        </div>
        <p className="text-slate-600 dark:text-slate-400">
          View and manage your changelog generation jobs
        </p>
      </div>

      {jobs.length === 0 ? (
        <div className="flex flex-col items-center justify-center max-w-4xl mx-auto min-h-[400px] gap-4">
          <div className="text-center">
            <div className="mx-auto mb-4 flex items-center justify-center h-12 w-12 rounded-xl bg-slate-100 dark:bg-slate-800">
              <Layers className="h-6 w-6 text-slate-600 dark:text-slate-300" />
            </div>
            <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-2">
              No changelog jobs yet
            </h2>
            <p className="text-slate-600 dark:text-slate-400 mb-4">
              Generate your first changelog from one of your repositories.
            </p>
            <Button
              color="primary"
              endContent={<ChevronRight className="w-4 h-4" />}
              onClick={() => router.push("/my-repositories")}
            >
              Go to Repositories
            </Button>
          </div>
        </div>
      ) : (
        <div className="grid gap-4">
          {jobs.map((job) => (
            <Link
              key={job.id}
              aria-label={`Open changelog job ${job.repo_full_name}`}
              className="rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
              href={`/generate/${job.id}`}
            >
              <Card className="p-2" shadow="sm">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between w-full">
                    <div className="flex items-start gap-3 flex-1">
                      <div className="h-9 w-9 rounded-md bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                        <GithubIcon className="w-5 h-5 text-slate-600 dark:text-slate-300" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                            {job.changelog_title?.title ?? job.repo_full_name}
                          </h3>
                          {job.changelog_title?.version ? (
                            <Chip className="text-xs" size="sm" variant="flat">
                              {job.changelog_title.version}
                            </Chip>
                          ) : null}
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {job.repo_full_name}
                          {job.changelog_title?.subtitle ? (
                            <span className="ml-2">
                              • {job.changelog_title.subtitle}
                            </span>
                          ) : null}
                        </p>
                        <p className="text-sm text-slate-600 dark:text-slate-400 flex items-center gap-3 mt-1">
                          <span className="inline-flex items-center gap-1">
                            <Layers className="w-4 h-4" /> {job.commit_count}{" "}
                            commits
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <Clock className="w-4 h-4" /> Created{" "}
                            {formatDate(job.created_at)}
                          </span>
                          {job.changelog_title?.scope ? (
                            <span className="inline-flex items-center gap-1">
                              <Tag className="w-4 h-4" />{" "}
                              {job.changelog_title.scope}
                            </span>
                          ) : null}
                          {job.changelog_title?.date ? (
                            <span className="inline-flex items-center gap-1">
                              <CalendarRangeIcon className="w-4 h-4" />
                              {new Date(
                                job.changelog_title.date,
                              ).toLocaleDateString("en-US", {
                                year: "numeric",
                                month: "short",
                                day: "numeric",
                              })}
                            </span>
                          ) : null}
                        </p>
                      </div>
                    </div>
                    <Chip
                      className="capitalize"
                      color={statusColorMap[job.status]}
                      size="sm"
                      variant="flat"
                    >
                      {job.status}
                    </Chip>
                  </div>
                </CardHeader>
                <CardBody className="pt-2">
                  <div className="flex items-center justify-between text-sm text-slate-500 dark:text-slate-400">
                    <span className="inline-flex items-center gap-2">
                      <CalendarRangeIcon className="w-4 h-4" /> Updated{" "}
                      {formatDate(job.updated_at)}
                    </span>
                    <Button
                      endContent={<ChevronRight className="w-4 h-4" />}
                      size="sm"
                      variant="flat"
                      onPress={() => handleJobClick(job.id)}
                    >
                      View Details
                    </Button>
                  </div>
                </CardBody>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardBody, CardHeader } from "@heroui/card";
import { Chip } from "@heroui/chip";
import { Spinner } from "@heroui/spinner";
import { Button } from "@heroui/button";
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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <p className="text-red-500">Error: {error}</p>
        <Button onClick={fetchJobs} color="primary">
          Try Again
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-2">
          My Changelogs
        </h1>
        <p className="text-slate-600 dark:text-slate-400">
          View and manage all your changelog generation jobs
        </p>
      </div>

      {jobs.length === 0 ? (
        <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
          <div className="text-center">
            <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-2">
              No changelog jobs yet
            </h2>
            <p className="text-slate-600 dark:text-slate-400 mb-4">
              Create your first changelog by visiting the repositories page and
              generating a changelog for one of your repositories.
            </p>
            <Button
              onClick={() => router.push("/my-repositories")}
              color="primary"
            >
              Go to Repositories
            </Button>
          </div>
        </div>
      ) : (
        <div className="grid gap-4">
          {jobs.map((job) => (
            <Card
              key={job.id}
              className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => handleJobClick(job.id)}
            >
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between w-full">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                      {job.repo_full_name}
                    </h3>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      {job.commit_count} commits • Created{" "}
                      {formatDate(job.created_at)}
                    </p>
                  </div>
                  <Chip
                    color={statusColorMap[job.status]}
                    variant="flat"
                    size="sm"
                  >
                    {job.status}
                  </Chip>
                </div>
              </CardHeader>
              <CardBody className="pt-0">
                <div className="flex items-center justify-between text-sm text-slate-500 dark:text-slate-400">
                  <span>Updated {formatDate(job.updated_at)}</span>
                  <Button size="sm" variant="light">
                    View Details →
                  </Button>
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

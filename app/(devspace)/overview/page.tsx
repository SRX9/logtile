"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardBody, CardHeader, CardFooter } from "@heroui/card";
import { Button } from "@heroui/button";
import { Skeleton } from "@heroui/skeleton";
import { Avatar } from "@heroui/avatar";
import {
  Activity,
  GitBranch,
  Rocket,
  FileText,
  Sparkles,
  PlusCircle,
  ArrowRight,
  CalendarCheck,
  History,
} from "lucide-react";

import { useUser } from "@/lib/context/UserContext";
import { fontHeading } from "@/config/fonts";

type OverviewStats = {
  totalChangelogs: number;
  totalRepositories: number;
  lastGeneratedAt: string | null;
};

const formatDate = (input: string | null) => {
  if (!input) {
    return "Not yet";
  }

  const date = new Date(input);

  if (Number.isNaN(date.getTime())) {
    return "Unknown";
  }

  return date.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

async function fetchOverview(): Promise<OverviewStats> {
  const response = await fetch("/api/overview", { cache: "no-store" });

  if (!response.ok) {
    throw new Error("Failed to load overview statistics");
  }

  return response.json();
}

export default function OverviewPage() {
  const router = useRouter();
  const { user } = useUser();
  const [stats, setStats] = useState<OverviewStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const loadStats = async () => {
      try {
        setIsLoading(true);
        const data = await fetchOverview();

        if (mounted) {
          setStats(data);
        }
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err.message : "Failed to load data");
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    void loadStats();

    return () => {
      mounted = false;
    };
  }, []);

  const quickActions = useMemo(
    () => [
      {
        title: "Connect repository",
        description: "Bring a new GitHub repository into Logtiles.",
        icon: PlusCircle,
        action: () => router.push("/my-repositories"),
        cta: "Manage repositories",
      },
      {
        title: "Generate changelog",
        description: "Create a new changelog for one of your projects.",
        icon: Sparkles,
        action: () => router.push("/my-repositories"),
        cta: "Start generating",
      },
      {
        title: "Review history",
        description: "See previous changelog jobs and statuses.",
        icon: History,
        action: () => router.push("/my-changelogs"),
        cta: "Open changelogs",
      },
    ],
    [router]
  );

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="flex w-full max-w-6xl flex-col gap-8 px-10 py-10">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <Rocket className="h-8 w-8 text-slate-500 dark:text-slate-300" />
              <h1
                className={`${fontHeading.className} text-3xl font-semibold text-slate-900 dark:text-slate-100`}
              >
                Welcome back{user?.name ? `, ${user.name.split(" ")[0]}` : ""}
              </h1>
            </div>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
              Track your changelog activity, connect repositories, and jump back
              into where you left off.
            </p>
          </div>
          <div className="flex items-center gap-4 rounded-xl border border-slate-200 bg-white/80 p-3 shadow-sm backdrop-blur dark:border-slate-800 dark:bg-slate-900/60">
            <Avatar
              size="md"
              src={user?.image}
              name={user?.name || "User"}
              isBordered
            />
            <div className="leading-tight">
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                {user?.name ?? "Authenticated user"}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {user?.email ?? ""}
              </p>
            </div>
          </div>
        </header>

        {isLoading ? (
          <div className="grid gap-4 md:grid-cols-3">
            {Array.from({ length: 3 }).map((_, idx) => (
              <Card
                key={idx}
                className="rounded-2xl border border-slate-200/70 shadow-sm dark:border-slate-800/70"
              >
                <CardBody className="space-y-4 p-6">
                  <Skeleton className="h-10 w-10 rounded-lg" />
                  <Skeleton className="h-5 w-32 rounded" />
                  <Skeleton className="h-8 w-20 rounded" />
                  <Skeleton className="h-4 w-40 rounded" />
                </CardBody>
              </Card>
            ))}
          </div>
        ) : error ? (
          <div className="rounded-xl border border-slate-300 bg-slate-100/70 p-4 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-800/40 dark:text-slate-200">
            {error}
          </div>
        ) : stats ? (
          <div className="grid gap-4 md:grid-cols-3">
            <Card className="rounded-2xl border border-slate-200/70 shadow-sm dark:border-slate-800/70">
              <CardHeader className="flex items-center gap-3 p-6 pb-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-200">
                  <FileText className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    Total changelogs
                  </p>
                  <h2
                    className={`${fontHeading.className} text-xl font-semibold text-slate-900 dark:text-slate-100`}
                  >
                    {stats.totalChangelogs}
                  </h2>
                </div>
              </CardHeader>
              <CardBody className="px-6 pb-6 pt-0 text-sm text-slate-600 dark:text-slate-400">
                You have generated{" "}
                {stats.totalChangelogs === 0 ? "no" : stats.totalChangelogs}{" "}
                changelog{stats.totalChangelogs === 1 ? "" : "s"} so far.
              </CardBody>
            </Card>

            <Card className="rounded-2xl border border-slate-200/70 shadow-sm dark:border-slate-800/70">
              <CardHeader className="flex items-center gap-3 p-6 pb-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-200">
                  <GitBranch className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    Connected repositories
                  </p>
                  <h2
                    className={`${fontHeading.className} text-xl font-semibold text-slate-900 dark:text-slate-100`}
                  >
                    {stats.totalRepositories}
                  </h2>
                </div>
              </CardHeader>
              <CardBody className="px-6 pb-6 pt-0 text-sm text-slate-600 dark:text-slate-400">
                Keep your repositories connected to generate changelogs
                effortlessly.
              </CardBody>
            </Card>

            <Card className="rounded-2xl border border-slate-200/70 shadow-sm dark:border-slate-800/70">
              <CardHeader className="flex items-center gap-3 p-6 pb-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-200">
                  <Activity className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    Last generated
                  </p>
                  <h2
                    className={`${fontHeading.className} text-lg font-semibold text-slate-900 dark:text-slate-100`}
                  >
                    {formatDate(stats.lastGeneratedAt)}
                  </h2>
                </div>
              </CardHeader>
              <CardBody className="px-6 pb-6 pt-0 text-sm text-slate-600 dark:text-slate-400">
                Share fresh updates by generating a changelog whenever your team
                ships.
              </CardBody>
            </Card>
          </div>
        ) : null}

        <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <Card className="lg:col-span-2 rounded-2xl border border-slate-200/70 shadow-sm dark:border-slate-800/70">
            <CardHeader className="flex items-center justify-between p-6 pb-4">
              <div>
                <h2
                  className={`${fontHeading.className} text-lg font-semibold text-slate-900 dark:text-slate-100`}
                >
                  Quick actions
                </h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Jump into common workflows from here.
                </p>
              </div>
            </CardHeader>
            <CardBody className="grid gap-4 px-6 pb-4 pt-0 sm:grid-cols-2">
              {quickActions.map((action) => (
                <button
                  key={action.title}
                  className="group flex flex-col gap-3 rounded-xl border border-slate-200/70 bg-white/90 p-4 text-left transition-all hover:-translate-y-0.5 hover:border-slate-500/60 hover:shadow-md dark:border-slate-800/70 dark:bg-slate-900/60 dark:hover:border-slate-400/60"
                  onClick={action.action}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-200">
                      <action.icon className="h-5 w-5" />
                    </div>
                    <ArrowRight className="h-4 w-4 text-slate-400 transition group-hover:text-slate-600 dark:group-hover:text-slate-200" />
                  </div>
                  <div>
                    <h3
                      className={`${fontHeading.className} text-sm font-semibold text-slate-900 dark:text-slate-100`}
                    >
                      {action.title}
                    </h3>
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                      {action.description}
                    </p>
                  </div>
                  <span className="mt-2 text-xs font-medium text-slate-600 dark:text-slate-300">
                    {action.cta}
                  </span>
                </button>
              ))}
            </CardBody>
            <CardFooter className="flex items-center justify-between border-t border-slate-200/60 bg-slate-50/80 px-6 py-4 text-sm text-slate-500 dark:border-slate-800/60 dark:bg-slate-900/40 dark:text-slate-400">
              Tip: Track your latest jobs from the changelog history page.
            </CardFooter>
          </Card>

          <Card className="rounded-2xl border border-slate-200/70 shadow-sm dark:border-slate-800/70">
            <CardHeader className="flex items-center gap-3 p-6 pb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-200">
                <CalendarCheck className="h-5 w-5" />
              </div>
              <div>
                <h2
                  className={`${fontHeading.className} text-lg font-semibold text-slate-900 dark:text-slate-100`}
                >
                  Recent activity
                </h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Highlights from your latest changelog.
                </p>
              </div>
            </CardHeader>
            <CardBody className="space-y-4 px-6 pb-6 pt-0 text-sm text-slate-600 dark:text-slate-400">
              {stats?.totalChangelogs ? (
                <>
                  <div className="flex items-start gap-3 rounded-lg bg-slate-100/60 p-3 dark:bg-slate-800/50">
                    <span className="mt-1 inline-flex h-6 w-6 items-center justify-center rounded-full bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-200">
                      <FileText className="h-4 w-4" />
                    </span>
                    <div>
                      <p
                        className={`${fontHeading.className} text-sm font-medium text-slate-900 dark:text-slate-100`}
                      >
                        Latest changelog prepared
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Generated on {formatDate(stats.lastGeneratedAt)}.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 rounded-lg bg-slate-100/60 p-3 dark:bg-slate-800/50">
                    <span className="mt-1 inline-flex h-6 w-6 items-center justify-center rounded-full bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-200">
                      <GitBranch className="h-4 w-4" />
                    </span>
                    <div>
                      <p
                        className={`${fontHeading.className} text-sm font-medium text-slate-900 dark:text-slate-100`}
                      >
                        Connected repositories
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        You currently manage {stats.totalRepositories}{" "}
                        repositories.
                      </p>
                    </div>
                  </div>
                </>
              ) : (
                <div className="rounded-lg border border-dashed border-slate-300 p-4 text-center text-xs text-slate-500 dark:border-slate-700 dark:text-slate-400">
                  No activity yet — connect a repository and generate your first
                  changelog to see updates here.
                </div>
              )}
            </CardBody>
          </Card>
        </section>
      </div>
    </div>
  );
}

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Avatar } from "@heroui/avatar";
import { Button } from "@heroui/button";
import { Card, CardBody, CardFooter, CardHeader } from "@heroui/card";
import { Skeleton } from "@heroui/skeleton";
import { Clock3, GitBranch, Github, Shield } from "lucide-react";
import { Chip } from "@heroui/chip";

import { RepositoryConnectDrawer } from "./connect-repository-drawer";
// removed reauthorize helper

type ConnectedRepository = {
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

export default function MyRepositories() {
  const [connectedRepos, setConnectedRepos] = useState<ConnectedRepository[]>(
    [],
  );
  const [isLoadingConnected, setIsLoadingConnected] = useState(true);
  const [connectedError, setConnectedError] = useState<string | null>(null);

  const [connectedRepoIds, setConnectedRepoIds] = useState<string[]>([]);
  const [isConnectDrawerOpen, setIsConnectDrawerOpen] = useState(false);
  const hasFetchedConnectedRepos = useRef(false);

  const loadConnectedRepos = useCallback(async () => {
    setIsLoadingConnected(true);
    setConnectedError(null);

    try {
      const response = await fetch("/api/repositories", {
        method: "GET",
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));

        throw new Error(body?.error ?? "Unable to load connected repositories");
      }

      const data = (await response.json()) as {
        repositories: ConnectedRepository[];
      };

      setConnectedRepos(data.repositories);
      setConnectedRepoIds(data.repositories.map((repo) => repo.repo_id));
    } catch (error) {
      console.error(error);
      setConnectedError(
        error instanceof Error ? error.message : "Failed to load repositories",
      );
    } finally {
      setIsLoadingConnected(false);
    }
  }, []);

  useEffect(() => {
    if (hasFetchedConnectedRepos.current) {
      return;
    }

    hasFetchedConnectedRepos.current = true;
    void loadConnectedRepos();
  }, [loadConnectedRepos]);

  return (
    <>
      <div className="w-full space-y-10">
        <div className="flex flex-col gap-6 border-b px-4 py-6 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-10 lg:py-8">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">
              Connected Repositories
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
              Manage the repositories linked to your Logtiles workspace.
            </p>
          </div>
          <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:items-center">
            <Button
              className="w-full sm:w-auto"
              variant="flat"
              onPress={() =>
                window.open(
                  "/api/github/org-access",
                  "_blank",
                  "noopener,noreferrer",
                )
              }
            >
              Manage Org Access
            </Button>
            <Button
              className="w-full sm:w-auto"
              color="primary"
              variant="solid"
              onPress={() => setIsConnectDrawerOpen(true)}
            >
              Connect New Repository
            </Button>
          </div>
        </div>

        <section className="mx-auto w-full max-w-[1400px] px-4 pb-8 sm:px-6 lg:px-10">
          {isLoadingConnected ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 6 }).map((_, index) => (
                <Card
                  key={index}
                  aria-label="Loading repository"
                  className="relative flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200/60 bg-white/90 backdrop-blur-sm shadow-sm dark:border-slate-800/60 dark:bg-slate-900/65"
                >
                  <CardHeader className="flex flex-col gap-4 px-5 py-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="flex flex-1 items-start gap-3">
                      <Skeleton
                        aria-hidden="true"
                        className="h-12 w-12 rounded-xl"
                      />
                      <div className="flex flex-1 flex-col gap-2">
                        <Skeleton
                          aria-hidden="true"
                          className="h-3 w-28 rounded-lg"
                        />
                        <Skeleton
                          aria-hidden="true"
                          className="h-5 w-48 rounded-lg"
                        />
                        <Skeleton
                          aria-hidden="true"
                          className="h-3 w-24 rounded-lg"
                        />
                      </div>
                    </div>
                    <div className="flex flex-shrink-0 items-center">
                      <Skeleton
                        aria-hidden="true"
                        className="h-8 w-24 rounded-full"
                      />
                    </div>
                  </CardHeader>
                  <CardBody className="flex flex-1 flex-col gap-3 px-5 pb-5 pt-0">
                    <Skeleton
                      aria-hidden="true"
                      className="h-12 w-full rounded-lg"
                    />
                    <Skeleton
                      aria-hidden="true"
                      className="h-4 w-32 rounded-lg"
                    />
                  </CardBody>
                  <CardFooter className="flex flex-col gap-4 border-t border-slate-200/80 bg-slate-50/60 px-5 py-4 text-xs text-slate-500 dark:border-slate-800/60 dark:bg-slate-900/50 dark:text-slate-400 sm:flex-row sm:flex-wrap">
                    {[0, 1, 2].map((detail) => (
                      <div key={detail} className="flex items-center gap-2.5">
                        <Skeleton
                          aria-hidden="true"
                          className="h-7 w-7 rounded-full"
                        />
                        <div className="flex flex-col gap-1">
                          <Skeleton
                            aria-hidden="true"
                            className="h-3 w-20 rounded-lg"
                          />
                          <Skeleton
                            aria-hidden="true"
                            className="h-3 w-16 rounded-lg"
                          />
                        </div>
                      </div>
                    ))}
                  </CardFooter>
                </Card>
              ))}
            </div>
          ) : connectedError ? (
            <div className="max-w-6xl rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-600 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300">
              {connectedError}
            </div>
          ) : connectedRepos.length === 0 ? (
            <div className="flex min-h-[360px] flex-col items-start justify-center px-4 text-left sm:min-h-[420px] sm:items-center sm:px-12 sm:text-center">
              <div className="flex items-center gap-5">
                <span className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-900 text-white shadow-lg ring-4 ring-slate-100/80 dark:bg-slate-100 dark:text-slate-900 dark:ring-slate-800/70">
                  <Github aria-hidden="true" className="h-8 w-8" />
                </span>
                <span className="text-4xl font-black text-slate-300 dark:text-slate-700">
                  •
                </span>
                <span className="flex h-16 w-16 items-center justify-center rounded-full bg-primary-500 text-white shadow-lg ring-4 ring-primary-100/60 dark:bg-primary-400 dark:ring-primary-500/40">
                  <GitBranch aria-hidden="true" className="h-8 w-8" />
                </span>
              </div>
              <h2 className="mt-8 text-2xl font-semibold text-slate-900 dark:text-slate-100">
                No repositories connected yet
              </h2>
              <p className="mt-4 max-w-md text-sm text-slate-600 dark:text-slate-400">
                Bring your GitHub repositories into Logtiles to start generating
                rich changelog drafts, track activity, and collaborate with your
                team.
              </p>
              <div className="mt-8 flex flex-col items-start gap-3 text-xs uppercase tracking-[0.22em] text-slate-400 dark:text-slate-500 sm:items-center">
                <span className="inline-flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-300">
                    <Shield aria-hidden="true" className="h-5 w-5" />
                  </span>
                  Always Latest Data
                </span>
              </div>
              <Button
                className="mt-10 self-start sm:self-center"
                color="secondary"
                onPress={() => setIsConnectDrawerOpen(true)}
              >
                Connect a repository
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {connectedRepos.map((repo) => (
                <Link
                  key={repo.id}
                  className="group block h-full"
                  href={`/my-repositories/${repo.repo_id}`}
                >
                  <Card className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200/60 bg-white/90 backdrop-blur-sm shadow-sm transition-all duration-200 hover:-translate-y-1 hover:border-primary-200/50 hover:shadow-lg dark:border-slate-800/60 dark:bg-slate-900/65 dark:hover:border-primary-500/30">
                    <CardHeader className="flex flex-col gap-4 px-5 py-4 sm:flex-row sm:items-start sm:justify-between">
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          <Avatar
                            isBordered
                            className="border-primary-200 bg-slate-900 text-white dark:border-primary-500/40"
                            name={repo.owner}
                            radius="lg"
                            size="md"
                            src={`https://avatars.githubusercontent.com/${repo.owner}`}
                          />
                          <span className="absolute -right-1 -top-1 inline-flex h-5 w-5 items-center justify-center rounded-full bg-slate-900 text-white shadow-sm ring-2 ring-white/80 transition-all group-hover:scale-105 dark:bg-slate-100 dark:text-slate-900 dark:ring-slate-900/60">
                            <Github aria-hidden="true" className="h-3 w-3" />
                          </span>
                        </div>
                        <div className="flex flex-col gap-1">
                          <h2 className="text-base font-semibold pt-1 tracking-tight text-slate-900 transition-colors group-hover:text-blue-700 dark:text-slate-100 dark:group-hover:text-blue-100">
                            {repo.full_name}
                          </h2>
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            @{repo.owner}
                          </p>
                        </div>
                      </div>
                      <Chip className="self-start sm:self-auto" color="primary">
                        Github
                      </Chip>
                    </CardHeader>
                    <CardBody className="flex flex-1 flex-col gap-3 px-5 pb-5 pt-0 text-sm text-slate-600 dark:text-slate-400">
                      {repo.description ? (
                        <p className="leading-relaxed text-slate-600 transition-colors group-hover:text-slate-900 dark:text-slate-300 dark:group-hover:text-slate-200">
                          {repo.description}
                        </p>
                      ) : (
                        <p className="italic text-slate-400 dark:text-slate-500">
                          No description provided.
                        </p>
                      )}
                    </CardBody>
                    <CardFooter className="flex flex-col gap-4 border-t border-slate-200/80 bg-slate-50/60 px-5 py-4 text-xs text-slate-500 dark:border-slate-800/60 dark:bg-slate-900/50 dark:text-slate-400 sm:flex-row sm:flex-wrap">
                      <div className="flex items-center gap-2.5">
                        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 text-slate-700 shadow-sm dark:bg-slate-800 dark:text-slate-300">
                          <GitBranch aria-hidden="true" className="h-5 w-5" />
                        </span>
                        <div className="flex flex-col gap-0.5 leading-snug">
                          <span>Default branch</span>
                          <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                            {repo.default_branch ?? "n/a"}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2.5">
                        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 text-slate-700 shadow-sm dark:bg-slate-800 dark:text-slate-300">
                          <Shield aria-hidden="true" className="h-5 w-5" />
                        </span>
                        <div className="flex flex-col gap-0.5 leading-snug">
                          <span>Visibility</span>
                          <span className="text-sm font-semibold capitalize text-slate-800 dark:text-slate-200">
                            {repo.visibility ?? "unknown"}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2.5">
                        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 text-slate-700 shadow-sm dark:bg-slate-800 dark:text-slate-300">
                          <Clock3 aria-hidden="true" className="h-5 w-5" />
                        </span>
                        <div className="flex flex-col gap-0.5 leading-snug">
                          <span>Connected on</span>
                          <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                            {new Date(repo.connected_at).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </CardFooter>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>
      <RepositoryConnectDrawer
        isOpen={isConnectDrawerOpen}
        onClose={() => setIsConnectDrawerOpen(false)}
        onRepositoryConnected={async () => {
          await loadConnectedRepos();
          setConnectedRepoIds((current) => Array.from(new Set(current)));
        }}
        onSyncConnectedRepoIds={setConnectedRepoIds}
      />
    </>
  );
}

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Button } from "@heroui/button";
import { Card, CardBody, CardHeader } from "@heroui/card";
import { Spinner } from "@heroui/spinner";
import { RepositoryConnectDrawer } from "./connect-repository-drawer";

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
    []
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
        error instanceof Error ? error.message : "Failed to load repositories"
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
      <div className="max-w-4xl mx-auto py-10 px-6 space-y-10">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">
              Connected Repositories
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
              Manage the repositories linked to your Logtiles workspace.
            </p>
          </div>
          <Button
            color="primary"
            variant="solid"
            onPress={() => setIsConnectDrawerOpen(true)}
          >
            Connect New Repository
          </Button>
        </div>

        <section className="space-y-4">
          {isLoadingConnected ? (
            <div className="flex items-center justify-center h-32">
              <Spinner label="Loading connected repositories" />
            </div>
          ) : connectedError ? (
            <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-600 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300">
              {connectedError}
            </div>
          ) : connectedRepos.length === 0 ? (
            <Card className="border-dashed">
              <CardBody>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  No repositories connected yet. Click "Connect New Repository"
                  to get started.
                </p>
              </CardBody>
            </Card>
          ) : (
            connectedRepos.map((repo) => (
              <Link key={repo.id} href={`/my-repositories/${repo.repo_id}`}>
                <Card className="border border-slate-200 transition-colors hover:border-slate-300 hover:shadow-md dark:border-slate-800 dark:hover:border-slate-700">
                  <CardHeader className="flex flex-col items-start gap-2 md:flex-row md:items-center md:justify-between">
                    <div>
                      <h2 className="text-lg font-medium text-slate-900 dark:text-slate-100">
                        {repo.full_name}
                      </h2>
                      {repo.description && (
                        <p className="text-sm text-slate-600 dark:text-slate-400">
                          {repo.description}
                        </p>
                      )}
                    </div>
                    <span className="text-sm font-medium text-primary-600">
                      View details →
                    </span>
                  </CardHeader>
                  <CardBody className="grid gap-2 text-sm text-slate-600 dark:text-slate-400">
                    <div className="flex gap-2">
                      <span className="font-medium text-slate-700 dark:text-slate-300">
                        Default branch:
                      </span>
                      <span>{repo.default_branch ?? "n/a"}</span>
                    </div>
                    <div className="flex gap-2">
                      <span className="font-medium text-slate-700 dark:text-slate-300">
                        Visibility:
                      </span>
                      <span className="capitalize">
                        {repo.visibility ?? "unknown"}
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <span className="font-medium text-slate-700 dark:text-slate-300">
                        Connected:
                      </span>
                      <span>
                        {new Date(repo.connected_at).toLocaleString()}
                      </span>
                    </div>
                  </CardBody>
                </Card>
              </Link>
            ))
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

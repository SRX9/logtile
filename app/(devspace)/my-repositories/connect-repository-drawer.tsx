"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@heroui/button";
import { Skeleton } from "@heroui/skeleton";
import { Input } from "@heroui/input";
import { Search } from "lucide-react";
// reauthorize removed per request
import {
  Drawer,
  DrawerBody,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
} from "@heroui/drawer";

type GithubRepositoryOption = {
  id: number;
  name: string;
  owner: string;
  fullName: string;
  description: string | null;
  htmlUrl: string;
  defaultBranch?: string | null;
  visibility?: string | null;
};

type RepositoryConnectDrawerProps = {
  isOpen: boolean;
  onClose: () => void;
  onRepositoryConnected: () => Promise<void> | void;
  onSyncConnectedRepoIds?: (ids: string[]) => void;
};

export function RepositoryConnectDrawer({
  isOpen,
  onClose,
  onRepositoryConnected,
  onSyncConnectedRepoIds,
}: RepositoryConnectDrawerProps) {
  const [availableRepos, setAvailableRepos] = useState<
    GithubRepositoryOption[]
  >([]);
  const [connectedRepoIds, setConnectedRepoIds] = useState<string[]>([]);
  const [isLoadingAvailable, setIsLoadingAvailable] = useState(false);
  const [availableError, setAvailableError] = useState<string | null>(null);
  const [connectingRepoId, setConnectingRepoId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const hasFetchedAvailableRepos = useRef(false);

  const handleFetchAvailableRepos = useCallback(async () => {
    setIsLoadingAvailable(true);
    setAvailableError(null);

    try {
      const response = await fetch("/api/github/repositories", {
        method: "GET",
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));

        throw new Error(body?.error ?? "Unable to load GitHub repositories");
      }

      const data = (await response.json()) as {
        repositories: GithubRepositoryOption[];
        connectedRepoIds: string[];
      };

      setAvailableRepos(data.repositories);
      setConnectedRepoIds(data.connectedRepoIds);
      onSyncConnectedRepoIds?.(data.connectedRepoIds);
    } catch (error) {
      console.error(error);
      setAvailableError(
        error instanceof Error
          ? error.message
          : "Failed to load GitHub repositories"
      );
    } finally {
      setIsLoadingAvailable(false);
    }
  }, [onSyncConnectedRepoIds]);

  useEffect(() => {
    if (!isOpen) {
      hasFetchedAvailableRepos.current = false;

      return;
    }

    if (hasFetchedAvailableRepos.current) {
      return;
    }

    hasFetchedAvailableRepos.current = true;
    void handleFetchAvailableRepos();
  }, [isOpen, handleFetchAvailableRepos]);

  const handleConnectRepository = useCallback(
    async (repo: GithubRepositoryOption) => {
      setConnectingRepoId(repo.id);
      setAvailableError(null);

      try {
        const response = await fetch("/api/github/repositories", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ repository: repo }),
        });

        if (!response.ok) {
          const body = await response.json().catch(() => ({}));

          throw new Error(body?.error ?? "Failed to connect repository");
        }

        setConnectedRepoIds((prev) => {
          const updated = Array.from(new Set([...prev, String(repo.id)]));

          onSyncConnectedRepoIds?.(updated);

          return updated;
        });
        await onRepositoryConnected();
      } catch (error) {
        console.error(error);
        setAvailableError(
          error instanceof Error
            ? error.message
            : "Failed to connect repository"
        );
      } finally {
        setConnectingRepoId(null);
      }
    },
    [onRepositoryConnected]
  );

  const availableReposToDisplay = useMemo(() => {
    if (!availableRepos.length) {
      return [];
    }

    let filteredRepos = availableRepos.sort((a, b) =>
      a.fullName.localeCompare(b.fullName)
    );

    // Only show search when there are more than 10 repositories
    if (availableRepos.length > 10 && searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filteredRepos = filteredRepos.filter(
        (repo) =>
          repo.fullName.toLowerCase().includes(query) ||
          repo.name.toLowerCase().includes(query) ||
          repo.owner.toLowerCase().includes(query) ||
          (repo.description && repo.description.toLowerCase().includes(query))
      );
    }

    return filteredRepos;
  }, [availableRepos, searchQuery]);

  const isRepoConnected = useCallback(
    (repoId: number | string) => connectedRepoIds.includes(String(repoId)),
    [connectedRepoIds]
  );

  return (
    <Drawer isOpen={isOpen} placement="right" size="lg" onClose={onClose}>
      <DrawerContent>
        <DrawerHeader className="flex flex-col gap-1">
          <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
            Connect a Repository
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Select from your GitHub repositories and connect it to Logtiles.
          </p>
        </DrawerHeader>
        <DrawerBody className="space-y-4">
          {/* Search input - only show when more than 10 repositories */}
          {!isLoadingAvailable && availableRepos.length > 10 && (
            <div className="flex items-center gap-2">
              <Input
                className="flex-1"
                placeholder="Search repositories..."
                startContent={<Search className="h-4 w-4 text-slate-400" />}
                value={searchQuery}
                onValueChange={setSearchQuery}
              />
              {searchQuery && (
                <Button
                  size="sm"
                  variant="flat"
                  onPress={() => setSearchQuery("")}
                >
                  Clear
                </Button>
              )}
            </div>
          )}
          {isLoadingAvailable ? (
            <div className="space-y-4">
              {/* Search input skeleton */}
              <div className="flex items-center gap-2">
                <Skeleton className="h-10 flex-1 rounded-lg" />
                <Skeleton className="h-10 w-10 rounded-lg" />
              </div>
              {/* Repository cards skeleton */}
              {Array.from({ length: 3 }).map((_, index) => (
                <div
                  key={index}
                  className="rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900/60"
                >
                  <div className="flex flex-col gap-3 border-b border-slate-100 p-4 md:flex-row md:items-center md:justify-between dark:border-slate-800">
                    <div className="space-y-2">
                      <Skeleton className="h-6 w-48 rounded-lg" />
                      <Skeleton className="h-4 w-64 rounded-lg" />
                    </div>
                    <Skeleton className="h-9 w-20 rounded-lg" />
                  </div>
                  <div className="grid gap-3 p-4">
                    <div className="flex items-center gap-2">
                      <Skeleton className="h-4 w-24 rounded" />
                      <Skeleton className="h-4 w-16 rounded" />
                    </div>
                    <div className="flex items-center gap-2">
                      <Skeleton className="h-4 w-20 rounded" />
                      <Skeleton className="h-4 w-16 rounded" />
                    </div>
                    <Skeleton className="h-4 w-24 rounded" />
                  </div>
                </div>
              ))}
            </div>
          ) : availableError ? (
            <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-600 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300">
              <div className="space-y-3">
                <p>{availableError}</p>
                <Button
                  size="sm"
                  variant="flat"
                  onPress={() => void handleFetchAvailableRepos()}
                >
                  Try again
                </Button>
                {/* Reauthorize GitHub removed */}
                <Button
                  size="sm"
                  variant="flat"
                  onPress={() =>
                    window.open(
                      "/api/github/org-access",
                      "_blank",
                      "noopener,noreferrer"
                    )
                  }
                >
                  Manage Org Access
                </Button>
              </div>
            </div>
          ) : !availableReposToDisplay.length ? (
            <div className="rounded-lg border border-dashed border-slate-200 p-6 text-sm text-slate-600 dark:border-slate-800 dark:text-slate-400">
              <p>
                {searchQuery
                  ? `No repositories found matching "${searchQuery}".`
                  : "No repositories available. Ensure your GitHub account has accessible repositories."}
              </p>
              <div className="mt-4 flex flex-col sm:flex-row gap-2">
                {/* Reauthorize GitHub removed */}
                <Button
                  className="w-full sm:w-auto"
                  size="sm"
                  variant="flat"
                  onPress={() =>
                    window.open(
                      "/api/github/org-access",
                      "_blank",
                      "noopener,noreferrer"
                    )
                  }
                >
                  Manage Org Access
                </Button>
              </div>
            </div>
          ) : (
            availableReposToDisplay.map((repo) => {
              const connected = isRepoConnected(repo.id);

              return (
                <div
                  key={repo.id}
                  className="rounded-xl border border-slate-200 bg-white shadow-sm transition-colors hover:border-slate-300 dark:border-slate-700 dark:bg-slate-900/60 dark:hover:border-slate-600"
                >
                  <div className="flex flex-col gap-3 border-b border-slate-100 p-4 md:flex-row md:items-center md:justify-between dark:border-slate-800">
                    <div>
                      <h3 className="text-lg font-medium text-slate-900 dark:text-slate-100">
                        {repo.fullName}
                      </h3>
                      {repo.description && (
                        <p className="text-sm text-slate-600 dark:text-slate-400">
                          {repo.description}
                        </p>
                      )}
                    </div>
                    <Button
                      color={connected ? "default" : "primary"}
                      isDisabled={connected}
                      isLoading={connectingRepoId === repo.id}
                      size="sm"
                      variant={connected ? "flat" : "solid"}
                      onClick={() =>
                        !connected && handleConnectRepository(repo)
                      }
                    >
                      {connected ? "Connected" : "Connect"}
                    </Button>
                  </div>
                  <div className="grid gap-3 p-4 text-sm text-slate-600 dark:text-slate-400">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium text-slate-700 dark:text-slate-300">
                        Default branch:
                      </span>
                      <span>{repo.defaultBranch ?? "n/a"}</span>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium text-slate-700 dark:text-slate-300">
                        Visibility:
                      </span>
                      <span className="capitalize">
                        {repo.visibility ?? "unknown"}
                      </span>
                    </div>
                    <a
                      className="text-sm font-medium text-primary-600 hover:underline dark:text-primary-200 dark:hover:text-primary-100"
                      href={repo.htmlUrl}
                      rel="noopener noreferrer"
                      target="_blank"
                    >
                      View on GitHub
                    </a>
                  </div>
                </div>
              );
            })
          )}
        </DrawerBody>
        <DrawerFooter className="flex items-center justify-between">
          <Button variant="light" onPress={onClose}>
            Close
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}

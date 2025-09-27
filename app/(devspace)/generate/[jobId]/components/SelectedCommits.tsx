"use client";

import { Card, CardBody, CardHeader } from "@heroui/card";

import { formatDateTime, formatCommitMessage } from "../utils";
import type { CommitMetadata } from "../types";

type SelectedCommitsProps = {
  commits: CommitMetadata[];
};

export function SelectedCommits({ commits }: SelectedCommitsProps) {
  return (
    <Card>
      <CardHeader>
        <h2 className="text-lg font-semibold">Selected Commits</h2>
      </CardHeader>
      <CardBody>
        <div className="max-h-64 space-y-3 overflow-y-auto">
          {commits.length === 0 ? (
            <EmptyCommits />
          ) : (
            commits.map((commit) => (
              <CommitCard key={commit.sha} commit={commit} />
            ))
          )}
        </div>
      </CardBody>
    </Card>
  );
}

function EmptyCommits() {
  return (
    <div className="rounded-lg border border-dashed border-slate-300 py-6 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
      No commits selected
    </div>
  );
}

type CommitCardProps = {
  commit: CommitMetadata;
};

function CommitCard({ commit }: CommitCardProps) {
  return (
    <div className="space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm dark:border-slate-800 dark:bg-slate-800/50">
      <p className="font-medium text-slate-900 dark:text-slate-100">
        {formatCommitMessage(commit.message)}
      </p>
      <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
        <span className="font-mono">{commit.sha.slice(0, 12)}</span>
        <span aria-hidden="true">•</span>
        <span>{formatDateTime(commit.committedAt)}</span>
        {commit.authorName && (
          <>
            <span aria-hidden="true">•</span>
            <span>{commit.authorName}</span>
          </>
        )}
      </div>
      {commit.htmlUrl && (
        <a
          href={commit.htmlUrl}
          target="_blank"
          rel="noreferrer"
          className="text-xs font-medium text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300"
        >
          View on GitHub
        </a>
      )}
    </div>
  );
}

"use client";

import type { CommitMetadata } from "../types";

import { formatDateTime, formatCommitMessage } from "../utils";
import { fontHeading } from "@/config/fonts";

export type SelectedCommitsProps = {
  commits: CommitMetadata[];
};

export function SelectedCommits({ commits }: SelectedCommitsProps) {
  return (
    <section className="px-1 pt-4">
      <header className="mb-5 flex items-center justify-between gap-4">
        <div>
          <h2
            className={`${fontHeading.className} text-lg font-semibold text-slate-900 dark:text-slate-100`}
          >
            Selected Commits
          </h2>
          <p className="text-xs uppercase tracking-wide text-slate-400 dark:text-slate-500">
            Included in generation
          </p>
        </div>
        <span className="rounded-full border border-slate-200 px-3 py-1 text-xs font-medium tracking-wide text-slate-500 dark:border-slate-700 dark:text-slate-400">
          {commits.length} total
        </span>
      </header>

      <div className="space-y-3">
        {commits.length === 0 ? (
          <EmptyCommits />
        ) : (
          <div className="divide-y divide-slate-200 rounded-lg border border-slate-200 dark:divide-slate-800 dark:border-slate-800">
            {commits.map((commit) => (
              <CommitItem key={commit.sha} commit={commit} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function EmptyCommits() {
  return (
    <div className="rounded-lg border border-dashed border-slate-300 py-6 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
      No commits selected
    </div>
  );
}

function CommitItem({ commit }: { commit: CommitMetadata }) {
  return (
    <div className="space-y-2 p-3 text-sm">
      <div className="flex items-start justify-between">
        <p className="font-medium text-slate-900 dark:text-slate-100">
          {formatCommitMessage(commit.message)}
        </p>
        {commit.htmlUrl && (
          <a
            className="ml-4 whitespace-nowrap text-xs font-medium text-primary-600 hover:text-primary-700 dark:text-primary-200 dark:hover:text-primary-100"
            href={commit.htmlUrl}
            rel="noreferrer"
            target="_blank"
          >
            View on GitHub
          </a>
        )}
      </div>

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
    </div>
  );
}

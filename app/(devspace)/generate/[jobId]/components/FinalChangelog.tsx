"use client";

import type { ChangelogTitle, FinalChangelogMetrics } from "../types";

import { useMemo, useState, useCallback, useEffect } from "react";
import { Button } from "@heroui/button";
import { Check, Copy } from "lucide-react";
import { Streamdown as MarkdownRender } from "streamdown";

// TODO: Add optional generation log list for transparency in future iterations.

type FinalChangelogProps = {
  markdown?: string | null;
  title?: ChangelogTitle | null;
  metrics?: FinalChangelogMetrics | null;
  jobId: string;
};

type MetadataItem = {
  key: string;
  label: string;
  value: string;
};

export function FinalChangelog({
  markdown,
  title,
  metrics,
  jobId,
}: FinalChangelogProps) {
  const [isCopied, setIsCopied] = useState(false);
  const [isLinkCopied, setIsLinkCopied] = useState(false);
  const [publicUrl, setPublicUrl] = useState<string | null>(null);
  const hasMarkdown = Boolean(markdown && markdown.trim().length > 0);
  const changelogDate = useMemo(() => title?.date, [title?.date]);

  const onCopy = useCallback(() => {
    if (!markdown) {
      return;
    }
    navigator.clipboard.writeText(markdown);
    setIsCopied(true);
    setTimeout(() => {
      setIsCopied(false);
    }, 2000);
  }, [markdown]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    if (!jobId) {
      setPublicUrl(null);

      return;
    }
    setPublicUrl(`${window.location.origin}/changelog/${jobId}`);
  }, [jobId]);

  const onOpenPublicPage = useCallback(() => {
    if (!publicUrl) return;
    window.open(publicUrl, "_blank", "noopener,noreferrer");
  }, [publicUrl]);

  const onCopyPublicLink = useCallback(() => {
    if (!publicUrl) return;
    navigator.clipboard.writeText(publicUrl);
    setIsLinkCopied(true);
    setTimeout(() => {
      setIsLinkCopied(false);
    }, 2000);
  }, [publicUrl]);

  const metadataItems = useMemo<MetadataItem[]>(() => {
    const items: MetadataItem[] = [];

    if (title?.version_number) {
      items.push({
        key: "version",
        label: "Version",
        value: title.version_number,
      });
    }

    if (changelogDate) {
      items.push({
        key: "date",
        label: "Release Date",
        value: changelogDate,
      });
    }

    return items;
  }, [title?.version_number, changelogDate]);

  return (
    <div className="space-y-8">
      <header className="rounded-2xl  ">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-6 lg:flex-1 lg:min-w-0">
            <div className="space-y-3">
              <p className="text-xs font-medium uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">
                Release Overview
              </p>
              <h2 className="text-3xl font-semibold text-slate-900 dark:text-slate-50">
                {title?.title ?? "Changelog not ready yet"}
              </h2>
              {!title && (
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  We’ll populate release metadata as soon as the generation
                  pipeline finishes successfully.
                </p>
              )}
            </div>

            <MetadataGrid hasTitle={Boolean(title)} items={metadataItems} />
          </div>
          {hasMarkdown && (
            <div className="flex flex-col gap-2  lg:flex-none">
              <Button
                color="primary"
                isDisabled={!publicUrl}
                onClick={onOpenPublicPage}
              >
                View Changelog Page
              </Button>
              <Button
                isDisabled={!publicUrl}
                startContent={
                  isLinkCopied ? <Check size={16} /> : <Copy size={16} />
                }
                variant="bordered"
                onClick={onCopyPublicLink}
              >
                {isLinkCopied ? "Link Copied" : "Copy changelog URL"}
              </Button>
              <Button
                startContent={
                  isCopied ? <Check size={16} /> : <Copy size={16} />
                }
                variant="bordered"
                onClick={onCopy}
              >
                {isCopied ? "Copied" : "Copy markdown"}
              </Button>
            </div>
          )}
        </div>
      </header>

      <section className="px-4 pb-40">
        {hasMarkdown ? (
          <MarkdownRender className="prose max-w-none dark:prose-invert">
            {markdown ?? ""}
          </MarkdownRender>
        ) : (
          <EmptyMarkdown />
        )}
      </section>
    </div>
  );
}

type MetadataGridProps = {
  items: MetadataItem[];
  hasTitle: boolean;
};

function MetadataGrid({ items, hasTitle }: MetadataGridProps) {
  if (items.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-200 px-4 py-3 text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
        {hasTitle
          ? "Additional release metadata is unavailable."
          : "Awaiting changelog title metadata."}
      </div>
    );
  }

  return (
    <dl className="grid gap-4 sm:grid-cols-2">
      {items.map((item) => (
        <div
          key={item.key}
          className="rounded-xl border border-slate-200 bg-white/90 px-4 py-3 dark:border-slate-700 dark:bg-slate-900/40"
        >
          <dt className="text-[0.7rem] font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
            {item.label}
          </dt>
          <dd className="mt-1 text-sm font-medium text-slate-900 dark:text-slate-100">
            {item.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}

function EmptyMarkdown() {
  return (
    <div className="space-y-3 rounded-lg border border-dashed border-slate-300 px-6 py-10 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
      <svg
        className="mx-auto h-10 w-10 text-slate-300"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          d="M8 4H6a2 2 0 00-2 2v12m12-14h2a2 2 0 012 2v12m-4 2H8m8-18v4m-8-4v4"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
        />
      </svg>
      <p className="font-medium">No markdown produced yet</p>
      <p className="text-xs text-slate-400">
        Once the job finishes successfully the generated changelog will appear
        here.
      </p>
    </div>
  );
}

type MetricStackProps = {
  entries: [string, number | null | undefined][];
};

function MetricStack({ entries }: MetricStackProps) {
  if (entries.length === 0) {
    return (
      <div className="rounded-full border border-dashed border-slate-300 px-3 py-1 text-xs uppercase tracking-wide text-slate-400 dark:border-slate-700 dark:text-slate-500">
        No metrics yet
      </div>
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      {entries.map(([key, value]) => (
        <div
          key={key}
          className="flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600 dark:bg-slate-800/70 dark:text-slate-300"
        >
          <span>{value ?? "—"}</span>
          <span className="text-[0.65rem] uppercase tracking-wide text-slate-500 dark:text-slate-400">
            {key}
          </span>
        </div>
      ))}
    </div>
  );
}

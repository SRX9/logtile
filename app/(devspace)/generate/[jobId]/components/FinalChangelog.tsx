"use client";

import type {
  ChangelogTitle,
  FinalChangelogMetrics,
  JobStatus,
} from "../types";

import { useMemo, useState, useCallback, useEffect, useRef } from "react";
import { Button } from "@heroui/button";
import {
  Dropdown,
  DropdownItem,
  DropdownMenu,
  DropdownTrigger,
} from "@heroui/dropdown";
import {
  Drawer,
  DrawerBody,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
} from "@heroui/drawer";
import {
  Check,
  ChevronDown,
  Copy,
  ExternalLink,
  Link,
  Pencil,
} from "lucide-react";
import { Streamdown as MarkdownRender } from "streamdown";

import { fontHeading } from "@/config/fonts";

// TODO: Add optional generation log list for transparency in future iterations.

type FinalChangelogProps = {
  markdown?: string | null;
  title?: ChangelogTitle | null;
  metrics?: FinalChangelogMetrics | null;
  jobId: string;
  onResultUpdated?: (update: {
    markdown: string;
    metrics: FinalChangelogMetrics | null;
    title: ChangelogTitle | null;
    status?: JobStatus;
  }) => void;
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
  onResultUpdated,
}: FinalChangelogProps) {
  const [isCopied, setIsCopied] = useState(false);
  const [isLinkCopied, setIsLinkCopied] = useState(false);
  const [publicUrl, setPublicUrl] = useState<string | null>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [markdownDraft, setMarkdownDraft] = useState(markdown ?? "");
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const saveMessageTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null
  );
  const hasMarkdown = Boolean(markdown && markdown.trim().length > 0);
  const changelogDate = useMemo(() => title?.date, [title?.date]);

  const clearSaveMessage = useCallback(() => {
    if (saveMessageTimerRef.current) {
      clearTimeout(saveMessageTimerRef.current);
      saveMessageTimerRef.current = null;
    }
    setSaveMessage(null);
  }, []);

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

  useEffect(() => {
    if (!isEditOpen) {
      setMarkdownDraft(markdown ?? "");
    }
  }, [isEditOpen, markdown]);

  useEffect(() => {
    return () => {
      if (saveMessageTimerRef.current) {
        clearTimeout(saveMessageTimerRef.current);
      }
    };
  }, []);

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

  const onOpenEditor = useCallback(() => {
    setMarkdownDraft(markdown ?? "");
    setSaveError(null);
    clearSaveMessage();
    setIsEditOpen(true);
  }, [markdown, clearSaveMessage]);

  const onCloseEditor = useCallback(() => {
    if (isSaving) return;
    setIsEditOpen(false);
    setSaveError(null);
    setMarkdownDraft(markdown ?? "");
  }, [isSaving, markdown]);

  const onSaveMarkdown = useCallback(async () => {
    if (!jobId) return;
    if (!markdownDraft.trim().length) {
      setSaveError("Markdown cannot be empty");

      return;
    }

    setIsSaving(true);
    setSaveError(null);

    try {
      const response = await fetch(`/api/jobs/${jobId}/changelog`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ markdown: markdownDraft }),
      });

      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        setSaveError(
          (payload && typeof payload?.error === "string"
            ? payload.error
            : null) ?? "Failed to update changelog"
        );

        return;
      }

      const nextMarkdown =
        payload && typeof payload?.markdown === "string"
          ? payload.markdown
          : markdownDraft;

      onResultUpdated?.({
        markdown: nextMarkdown,
        metrics:
          payload && Object.prototype.hasOwnProperty.call(payload, "metrics")
            ? (payload.metrics as FinalChangelogMetrics | null)
            : (metrics ?? null),
        title:
          payload && Object.prototype.hasOwnProperty.call(payload, "title")
            ? (payload.title as ChangelogTitle | null)
            : (title ?? null),
        status: payload?.status,
      });
      setIsEditOpen(false);
      setMarkdownDraft(nextMarkdown);
      clearSaveMessage();
      setSaveMessage("Changelog updated");
      saveMessageTimerRef.current = setTimeout(() => {
        setSaveMessage(null);
        saveMessageTimerRef.current = null;
      }, 3000);
    } catch (error) {
      console.error("Failed to update changelog markdown", error);
      setSaveError("Failed to update changelog");
    } finally {
      setIsSaving(false);
    }
  }, [jobId, markdownDraft, onResultUpdated, clearSaveMessage]);

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
              <h2
                className={`${fontHeading.className} text-3xl font-semibold text-slate-900 dark:text-slate-50`}
              >
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
            <div className="flex flex-col gap-2 lg:flex-none">
              <Dropdown placement="bottom-end">
                <DropdownTrigger>
                  <Button
                    color="primary"
                    endContent={<ChevronDown size={16} />}
                    startContent={<Copy size={16} />}
                    variant="solid"
                  >
                    Changelog actions
                  </Button>
                </DropdownTrigger>
                <DropdownMenu aria-label="Changelog actions" variant="flat">
                  <DropdownItem
                    key="edit"
                    startContent={<Pencil size={16} />}
                    onPress={onOpenEditor}
                  >
                    Edit changelog
                  </DropdownItem>
                  <DropdownItem
                    key="view"
                    isDisabled={!publicUrl}
                    startContent={<ExternalLink size={16} />}
                    onPress={onOpenPublicPage}
                  >
                    View changelog page
                  </DropdownItem>
                  <DropdownItem
                    key="copy-link"
                    isDisabled={!publicUrl}
                    startContent={
                      isLinkCopied ? <Check size={16} /> : <Link size={16} />
                    }
                    onPress={onCopyPublicLink}
                  >
                    {isLinkCopied ? "Link Copied" : "Copy changelog URL"}
                  </DropdownItem>
                  <DropdownItem
                    key="copy-markdown"
                    startContent={
                      isCopied ? <Check size={16} /> : <Copy size={16} />
                    }
                    onPress={onCopy}
                  >
                    {isCopied ? "Copied" : "Copy markdown"}
                  </DropdownItem>
                </DropdownMenu>
              </Dropdown>
              {saveMessage ? (
                <p className="mt-1 text-xs font-medium text-emerald-600">
                  {saveMessage}
                </p>
              ) : null}
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

      <Drawer
        isOpen={isEditOpen}
        placement="right"
        size="3xl"
        onClose={onCloseEditor}
      >
        <DrawerContent>
          <DrawerHeader className="flex flex-col gap-1">
            <h3
              className={`${fontHeading.className} text-xl font-semibold text-slate-900 dark:text-slate-100`}
            >
              Edit changelog markdown
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Make updates to the generated markdown directly. Changes are
              applied immediately on save.
            </p>
          </DrawerHeader>
          <DrawerBody className="space-y-4">
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
              <span>Markdown preview is disabled in this editor.</span>
              <span>{markdownDraft.length.toLocaleString()} characters</span>
            </div>
            <textarea
              className="h-full w-full resize-vertical rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 font-mono text-sm text-slate-800 shadow-inner focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-300 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-100 dark:focus:border-slate-500 dark:focus:ring-slate-600"
              disabled={isSaving}
              spellCheck={false}
              value={markdownDraft}
              onChange={(event) => setMarkdownDraft(event.target.value)}
            />
            {saveError ? (
              <p className="text-sm text-rose-600 dark:text-rose-400">
                {saveError}
              </p>
            ) : null}
          </DrawerBody>
          <DrawerFooter className="flex items-center justify-between">
            <Button variant="light" onPress={onCloseEditor}>
              Cancel
            </Button>
            <Button
              color="primary"
              isLoading={isSaving}
              onPress={onSaveMarkdown}
            >
              Save changes
            </Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
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

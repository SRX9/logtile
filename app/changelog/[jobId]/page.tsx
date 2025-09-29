import type { Metadata } from "next";

import { notFound } from "next/navigation";
import { Streamdown as MarkdownRender } from "streamdown";

import { getPublicChangelog } from "@/lib/changelog";
import { fontHeading } from "@/config/fonts";
import { cn } from "@/lib/utils";

type Params = Promise<{ jobId?: string }>;

export const revalidate = 10;

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { jobId } = await params;

  if (!jobId) {
    return {};
  }

  try {
    const changelog = await getPublicChangelog(jobId);
    const title = changelog.title ?? "Changelog";
    const description = changelog.subtitle ?? "Latest release notes";

    return {
      title,
      description,
      openGraph: {
        title,
        description,
      },
      twitter: {
        title,
        description,
      },
    };
  } catch {
    return {};
  }
}

export default async function PublicChangelogPage({
  params,
}: {
  params: Params;
}) {
  const { jobId } = await params;

  if (!jobId) {
    notFound();
  }

  const changelog = await getPublicChangelog(jobId);

  if (!changelog.markdown) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-slate-50 py-16 px-4 text-slate-900">
      <div className="mx-auto max-w-3xl rounded-3xl bg-white/95 p-4 sm:p-10 shadow-xl">
        <div className="mb-8 text-center">
          {changelog.version ? (
            <span className="mb-4 inline-flex items-center rounded-full bg-slate-100 px-4 py-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
              {changelog.version}
            </span>
          ) : null}
          <h1
            className={cn(
              fontHeading.className,
              "text-4xl font-semibold tracking-tight"
            )}
          >
            {changelog.title ?? "Changelog"}
          </h1>
          {changelog.subtitle ? (
            <p
              className={cn(
                fontHeading.className,
                "mt-3 text-base text-slate-500"
              )}
            >
              {changelog.subtitle}
            </p>
          ) : null}
          <div className="mt-6 flex flex-wrap justify-center gap-4 text-sm text-slate-400">
            <span>
              Published {new Date(changelog.updatedAt).toLocaleDateString()}
            </span>
            {changelog.scope ? <span>Scope: {changelog.scope}</span> : null}
          </div>
        </div>

        <div className="prose mx-auto max-w-none text-slate-800 prose-headings:mt-8 prose-h2:mt-12 prose-h2:text-slate-900 prose-a:text-slate-900 prose-strong:text-slate-900 prose-headings:font-heading">
          <MarkdownRender className="prose max-w-none">
            {changelog.markdown}
          </MarkdownRender>
        </div>
      </div>
    </div>
  );
}

import type { Metadata } from "next";

import { notFound } from "next/navigation";
import Link from "next/link";
import { Streamdown as MarkdownRender } from "streamdown";

import { getPublicRepoChangelogs } from "@/lib/changelog";
import { fontHeading } from "@/config/fonts";
import { cn } from "@/lib/utils";

type Params = Promise<{ repoId?: string }>;

export const revalidate = 10;

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { repoId } = await params;

  if (!repoId) {
    return {};
  }

  try {
    const items = await getPublicRepoChangelogs(repoId, 1);
    const latest = items[0];
    const title = latest?.repoFullName
      ? `${latest.repoFullName} • Changelog`
      : "Repository Changelog";
    const description = latest?.title ?? "Latest release notes and updates.";

    return {
      title,
      description,
      openGraph: { title, description },
      twitter: { title, description },
    };
  } catch {
    return {};
  }
}

export default async function RepoChangelogPage({
  params,
}: {
  params: Params;
}) {
  const { repoId } = await params;

  if (!repoId) {
    notFound();
  }

  const items = await getPublicRepoChangelogs(repoId, 100);

  if (!items.length) {
    return (
      <div className="min-h-screen bg-slate-50 py-16 px-4 text-slate-900">
        <div className="mx-auto max-w-3xl rounded-3xl bg-white/95 p-10 shadow-xl">
          <div className="mb-8 text-center">
            <h1
              className={cn(
                fontHeading.className,
                "text-3xl font-semibold tracking-tight",
              )}
            >
              Official Changelog
            </h1>
            <p className="mt-2 text-slate-500">
              No published entries yet for this repository.
            </p>
          </div>
          <div className="text-center text-sm text-slate-500">
            <Link className="underline" href="/my-repositories">
              Go back to repositories
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const repoFullName = items[0]?.repoFullName;

  return (
    <div className="min-h-screen bg-slate-50 py-16 px-4 text-slate-900">
      <div className="mx-auto max-w-4xl">
        <header className="mb-8 text-center">
          <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
            {repoFullName}
          </div>
          <h1
            className={cn(
              fontHeading.className,
              "text-2xl font-semibold tracking-tight",
            )}
          >
            Changelog
          </h1>
          <p
            className={cn(fontHeading.className, "mt-2 text-sm text-slate-500")}
          >
            Latest updates and release notes, newest first.
          </p>
        </header>

        <div className="space-y-8">
          {items.map((item) => (
            <article
              key={item.id}
              className="rounded-3xl border p-8 px-12 pb-12 "
            >
              <div className="mb-6 text-center">
                {item.version ? (
                  <span className="mb-4 inline-flex items-center rounded-full bg-slate-100 px-4 py-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    {item.version}
                  </span>
                ) : null}
                <h2
                  className={cn(
                    fontHeading.className,
                    "text-2xl font-semibold tracking-tight",
                  )}
                >
                  {item.title ?? "Changelog"}
                </h2>
                {item.subtitle ? (
                  <p
                    className={cn(fontHeading.className, "mt-2 text-slate-500")}
                  >
                    {item.subtitle}
                  </p>
                ) : null}
                <div className="mt-4 flex flex-wrap justify-center gap-4 text-xs text-slate-400">
                  <span>
                    Published {new Date(item.updatedAt).toLocaleDateString()}
                  </span>
                  {item.scope ? <span>Scope: {item.scope}</span> : null}
                </div>
              </div>

              <div className="prose mx-auto max-w-none text-slate-800 prose-headings:mt-8 prose-h2:mt-12 prose-h2:text-slate-900 prose-a:text-slate-900 prose-strong:text-slate-900 prose-headings:font-heading">
                <MarkdownRender className="prose max-w-none">
                  {item.markdown}
                </MarkdownRender>
              </div>
            </article>
          ))}
        </div>

        <footer className="mt-10 text-center text-sm text-slate-500">
          <Link className="underline" href={`/my-repositories/${repoId}`}>
            Back to repository
          </Link>
        </footer>
      </div>
    </div>
  );
}

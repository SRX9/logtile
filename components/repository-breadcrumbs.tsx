import Link from "next/link";

type BreadcrumbItem = {
  label: string;
  href?: string;
  isCurrent?: boolean;
};

type RepositoryBreadcrumbsProps = {
  items: BreadcrumbItem[];
  className?: string;
};

export function RepositoryBreadcrumbs({
  items,
  className,
}: RepositoryBreadcrumbsProps) {
  if (!items.length) {
    return null;
  }

  return (
    <nav
      aria-label="Breadcrumb"
      className={className}
      data-testid="repository-breadcrumbs"
    >
      <ol className="flex flex-wrap items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          const isCurrent = item.isCurrent ?? isLast;

          return (
            <li key={`breadcrumb-${index}`} className="flex items-center gap-2">
              {item.href && !isCurrent ? (
                <Link
                  className="font-medium text-slate-600 transition-colors hover:text-slate-900 dark:text-slate-300 dark:hover:text-slate-100"
                  href={item.href}
                >
                  {item.label}
                </Link>
              ) : (
                <span
                  className={
                    isCurrent
                      ? "font-semibold text-slate-900 dark:text-slate-100"
                      : "text-slate-500 dark:text-slate-400"
                  }
                >
                  {item.label}
                </span>
              )}

              {!isLast && (
                <span
                  aria-hidden
                  className="text-slate-400 dark:text-slate-600"
                >
                  /
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

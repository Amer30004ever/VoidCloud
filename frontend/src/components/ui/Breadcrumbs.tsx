"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { useBreadcrumbs } from "@/hooks/useBreadcrumbs";

/**
 * Readable topbar breadcrumb (P3): renders labelled, clickable crumbs instead
 * of the raw pathname. The last crumb is the current page and is not a link.
 */
export function Breadcrumbs({ rootLabel }: { rootLabel?: string }) {
  const items = useBreadcrumbs();
  if (items.length === 0) return null;

  const crumbs = rootLabel ? [{ label: rootLabel, href: items[0].href }, ...items.slice(1)] : items;

  return (
    <nav aria-label="Breadcrumb" className="min-w-0">
      <ol className="flex min-w-0 items-center gap-1.5 text-sm text-white/50">
        {crumbs.map((c, i) => {
          const last = i === crumbs.length - 1;
          return (
            <li key={c.href} className="flex min-w-0 items-center gap-1.5">
              {i > 0 && <ChevronRight className="size-3.5 shrink-0 text-white/25" aria-hidden />}
              {last ? (
                <span aria-current="page" className="truncate text-white/80">
                  {c.label}
                </span>
              ) : (
                <Link
                  href={c.href}
                  className="hidden truncate rounded transition hover:text-white/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/60 sm:inline"
                >
                  {c.label}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

export default Breadcrumbs;

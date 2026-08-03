"use client";

import { cn } from "@/lib/utils";

interface PageHeadingProps {
  title: string;
  subtitle?: string;
  meta?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}

/**
 * One header for every in-product page (I2/I9): a single H1 scale, a muted
 * subtitle, low-emphasis metadata and a right-aligned action slot.
 */
export function PageHeading({ title, subtitle, meta, actions, className }: PageHeadingProps) {
  return (
    <div
      className={cn(
        "mb-6 flex flex-col gap-3 border-b border-white/10 pb-4 sm:flex-row sm:items-start sm:justify-between",
        className,
      )}
    >
      <div className="min-w-0">
        <h1 className="vc-h1 truncate">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-white/60">{subtitle}</p>}
        {meta && <div className="vc-meta mt-1">{meta}</div>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

import { cn } from "./utils";

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cn("animate-pulse rounded-md bg-white/10", className)}
    />
  );
}

interface TableSkeletonProps {
  rows?: number;
  cols?: number;
  className?: string;
}

/** Renders <tr> skeleton rows — must be placed inside a <tbody>. */
export function TableSkeleton({ rows = 5, cols = 5, className }: TableSkeletonProps) {
  return (
    <>
      {Array.from({ length: rows }).map((_, r) => (
        <tr key={r} className={cn("border-b border-white/5 last:border-0", className)}>
          {Array.from({ length: cols }).map((_, c) => (
            <td key={c} className="px-4 py-3">
              <Skeleton className={c === 0 ? "h-4 w-40" : "h-4 w-20"} />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

export function CardSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("rounded-2xl border border-white/10 bg-white/5 p-4", className)}>
      <Skeleton className="mb-3 h-3 w-24" />
      <Skeleton className="h-7 w-16" />
    </div>
  );
}

export function ListSkeleton({ rows = 4, className }: { rows?: number; className?: string }) {
  return (
    <div className={cn("space-y-3", className)}>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <Skeleton className="mb-2 h-4 w-48" />
          <Skeleton className="h-3 w-28" />
        </div>
      ))}
    </div>
  );
}

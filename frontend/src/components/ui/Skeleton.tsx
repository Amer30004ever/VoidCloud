import { cva, type VariantProps } from "class-variance-authority";

const skeletonVariants = cva("animate-pulse rounded-md bg-muted", {
  variants: {
    variant: {
      default: "bg-muted",
      card: "bg-white/5",
      table: "bg-white/5",
    },
    size: {
      sm: "h-4",
      md: "h-6",
      lg: "h-8",
    },
  },
  defaultVariants: {
    variant: "default",
    size: "md",
  },
});

interface SkeletonProps extends VariantProps<typeof skeletonVariants> {
  className?: string;
}

export function Skeleton({ variant, size, className }: SkeletonProps) {
  return <div className={skeletonVariants({ variant, size, className })} />;
}

export function TableRowSkeleton({ cols = 6 }: { cols?: number }) {
  return (
    <tr>
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} className="px-4 py-3">
          <Skeleton variant="table" size="sm" className="w-full max-w-[120px]" />
        </td>
      ))}
    </tr>
  );
}

export function CardSkeleton() {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <Skeleton variant="card" size="sm" className="mb-2 w-24" />
      <Skeleton variant="card" size="lg" className="w-16" />
    </div>
  );
}

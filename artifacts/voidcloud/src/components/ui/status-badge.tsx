import { cn } from "@/lib/utils";

type Status = "open" | "assigned" | "resolved" | "pending" | "new" | "qualified" | "won" | "lost";

const statusConfig: Record<Status, { label: string; className: string }> = {
  open:      { label: "Open",      className: "bg-blue-500/15 text-blue-400 border-blue-500/30" },
  assigned:  { label: "Assigned",  className: "bg-violet-500/15 text-violet-400 border-violet-500/30" },
  resolved:  { label: "Resolved",  className: "bg-green-500/15 text-green-400 border-green-500/30" },
  pending:   { label: "Pending",   className: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30" },
  new:       { label: "New",       className: "bg-cyan-500/15 text-cyan-400 border-cyan-500/30" },
  qualified: { label: "Qualified", className: "bg-primary/15 text-primary border-primary/30" },
  won:       { label: "Won",       className: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" },
  lost:      { label: "Lost",      className: "bg-red-500/15 text-red-400 border-red-500/30" },
};

interface StatusBadgeProps {
  status: Status;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = statusConfig[status] ?? { label: status, className: "bg-muted text-muted-foreground border-border" };
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium",
        config.className,
        className
      )}
    >
      {config.label}
    </span>
  );
}

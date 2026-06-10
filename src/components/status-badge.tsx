import { cn } from "@/lib/utils";

type Tone = "success" | "warning" | "destructive" | "info" | "muted" | "primary";

const toneMap: Record<string, Tone> = {
  Running: "success", Succeeded: "success", Healthy: "success", Ready: "success", success: "success",
  Pending: "warning", queued: "warning", Degraded: "warning", Pressure: "warning",
  Failed: "destructive", CrashLoopBackOff: "destructive", failed: "destructive", cancelled: "muted",
  running: "info",
};

const toneClasses: Record<Tone, string> = {
  success: "bg-success/15 text-success border-success/30",
  warning: "bg-warning/15 text-warning border-warning/30",
  destructive: "bg-destructive/15 text-destructive border-destructive/30",
  info: "bg-info/15 text-info border-info/30",
  muted: "bg-muted text-muted-foreground border-border",
  primary: "bg-primary/15 text-primary border-primary/30",
};

const dotClasses: Record<Tone, string> = {
  success: "bg-success", warning: "bg-warning", destructive: "bg-destructive",
  info: "bg-info", muted: "bg-muted-foreground", primary: "bg-primary",
};

export function StatusBadge({ status, className }: { status: string; className?: string }) {
  const tone: Tone = toneMap[status] ?? "muted";
  const pulse = tone === "info" || status === "running";
  return (
    <span className={cn(
      "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-medium font-mono uppercase tracking-wide",
      toneClasses[tone], className,
    )}>
      <span className={cn("h-1.5 w-1.5 rounded-full", dotClasses[tone], pulse && "animate-pulse")} />
      {status}
    </span>
  );
}

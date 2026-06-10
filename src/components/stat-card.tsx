import { Card } from "@/components/ui/card";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function StatCard({
  label, value, delta, icon: Icon, tone = "primary",
}: {
  label: string; value: string | number; delta?: string;
  icon: LucideIcon; tone?: "primary" | "success" | "warning" | "destructive" | "info";
}) {
  const toneRing: Record<string, string> = {
    primary: "from-primary/20 to-primary/0 text-primary",
    success: "from-success/20 to-success/0 text-success",
    warning: "from-warning/20 to-warning/0 text-warning",
    destructive: "from-destructive/20 to-destructive/0 text-destructive",
    info: "from-info/20 to-info/0 text-info",
  };
  return (
    <Card className="relative overflow-hidden border-border/60 bg-gradient-surface p-5">
      <div className={cn("absolute -right-6 -top-6 h-24 w-24 rounded-full bg-gradient-to-br blur-2xl opacity-60", toneRing[tone])} />
      <div className="relative flex items-start justify-between">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">{label}</p>
          <p className="mt-2 text-3xl font-semibold tracking-tight">{value}</p>
          {delta && <p className="mt-1 text-xs text-muted-foreground">{delta}</p>}
        </div>
        <div className={cn("grid h-9 w-9 place-items-center rounded-md border border-border/60 bg-background/40", toneRing[tone].split(" ").pop())}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
    </Card>
  );
}

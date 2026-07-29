"use client";

import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@workspace/ui-kit/page-header";
import { LoadingState } from "@workspace/ui-kit/loading-state";
import { EmptyState } from "@workspace/ui-kit/empty-state";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { alertsApi } from "@/features/billing/alerts";
import { statsApi } from "@/features/vps/stats";
import { BellRing, CheckCircle2, Circle, ExternalLink, Search, RefreshCw } from "lucide-react";
import { useState, useMemo } from "react";
import { Skeleton, CardSkeleton } from "@/components/ui/Skeleton";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { Sparkline } from "@/components/ui/Sparkline";

export default function MonitoringPage() {
  const qc = useQueryClient();
  const stats = useQuery({ queryKey: ["alerts", "stats"], queryFn: () => alertsApi.getAlertStats().then((r) => r.data) });
  const active = useQuery({ queryKey: ["alerts", "active"], queryFn: () => alertsApi.getActiveAlerts().then((r) => r.data) });
  const rules = useQuery({ queryKey: ["alerts", "rules"], queryFn: () => alertsApi.getAlertRules().then((r) => r.data) });
  const health = useQuery({ queryKey: ["stats", "cluster-health"], queryFn: () => statsApi.getClusterHealth().then((r) => r.data) });
  const history = useQuery({ queryKey: ["monitoring", "health-history"], queryFn: () => statsApi.getHealthHistory(24).then((r) => r.data), refetchInterval: 60000 });
  const [traceId, setTraceId] = useState("");
  const trace = useQuery({
    queryKey: ["monitoring", "trace", traceId],
    enabled: traceId.length > 0,
    queryFn: () => statsApi.lookupTrace(traceId).then((r) => r.data),
  });

  const historyByService = useMemo(() => {
    const map = new Map<string, number[]>();
    for (const h of history.data ?? []) {
      if (!map.has(h.serviceName)) map.set(h.serviceName, []);
      map.get(h.serviceName)!.push(h.status === 'UP' ? 100 : h.status === 'DEGRADED' ? 50 : 0);
    }
    return map;
  }, [history.data]);

  const ack = useMutation({
    mutationFn: (id: string) => alertsApi.acknowledgeAlert(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["alerts"] }),
  });
  const resolve = useMutation({
    mutationFn: (id: string) => alertsApi.resolveAlert(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["alerts"] }),
  });

  const traceUrl = process.env.NEXT_PUBLIC_JAEGER_URL || process.env.NEXT_PUBLIC_TEMPO_URL;
  const lastChecked = health.data?.checkedAt ? new Date(health.data.checkedAt).toLocaleString() : null;

  return (
    <ErrorBoundary>
      <AppLayout>
        <PageHeader
          title="Monitoring"
          description="Alert posture, active incidents, and cluster health."
          action={
            <button onClick={() => qc.invalidateQueries()} className="inline-flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-xs hover:bg-muted">
              <RefreshCw className="h-3 w-3" /> Refresh
            </button>
          }
        />

        {lastChecked && (
          <p className="text-xs text-white/40 mb-4">Last updated: {lastChecked}</p>
        )}

        {traceUrl && (
          <div className="mb-4">
             <a href={traceUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-sm text-primary hover:underline">
               <ExternalLink className="h-4 w-4" /> Open trace UI
             </a>
          </div>
        )}

        {health.isLoading ? (
          <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => <CardSkeleton key={i} />)}
          </div>
        ) : (
          <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-4">
            <Stat label="Total" value={stats.data?.total ?? 0} />
            <Stat label="Active" value={stats.data?.active ?? 0} tone="warn" />
            <Stat label="Acknowledged" value={stats.data?.acknowledged ?? 0} />
            <Stat label="Resolved" value={stats.data?.resolved ?? 0} tone="ok" />
          </div>
        )}

        <div className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-xl border border-border bg-card">
            <div className="border-b border-border px-4 py-2 text-sm font-medium">Active alerts</div>
            {active.isLoading ? (
              <LoadingState />
            ) : !active.data?.length ? (
              <EmptyState icon={<BellRing className="h-6 w-6" />} title="All clear" />
            ) : (
              <div className="divide-y divide-border">
                {active.data.map((a) => (
                  <div key={a.id} className="px-4 py-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-sm font-medium">{a.ruleName}</p>
                        <p className="text-xs text-muted-foreground">{a.message}</p>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {a.severity} • fired {new Date(a.firedAt).toLocaleString()}
                        </p>
                      </div>
                      <div className="flex gap-1">
                        <button onClick={() => ack.mutate(a.id)} className="rounded-md border border-border p-1 hover:bg-muted" title="Acknowledge">
                          <Circle className="h-4 w-4" />
                        </button>
                        <button onClick={() => resolve.mutate(a.id)} className="rounded-md border border-border p-1 hover:bg-muted" title="Resolve">
                          <CheckCircle2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-xl border border-border bg-card">
            <div className="border-b border-border px-4 py-2 text-sm font-medium">24h uptime sparkline</div>
            {history.isLoading ? (
              <div className="p-4 space-y-3">
                {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} variant="card" className="h-10" />)}
              </div>
            ) : (
              <div className="p-4 space-y-3 max-h-80 overflow-y-auto">
                {Array.from(historyByService.entries()).map(([name, points]) => (
                  <div key={name} className="flex items-center justify-between">
                    <span className="text-xs font-medium w-28 truncate">{name}</span>
                    <Sparkline points={points} />
                    <span className="text-[10px] text-muted-foreground w-10 text-right">{points[points.length - 1] ?? 0}%</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="mt-6 rounded-xl border border-border bg-card">
          <div className="border-b border-border px-4 py-2 text-sm font-medium">Alert rules ({rules.data?.length ?? 0})</div>
          {rules.isLoading ? (
            <LoadingState />
          ) : !rules.data?.length ? (
            <EmptyState title="No alert rules" />
          ) : (
            <div className="divide-y divide-border">
              {rules.data.map((r) => (
                <div key={r.id} className="px-4 py-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium">{r.name}</p>
                    <span className={`text-xs ${r.enabled ? "text-emerald-500" : "text-muted-foreground"}`}>
                      {r.enabled ? "enabled" : "disabled"}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {r.type} • {r.severity} • threshold {r.threshold} • {r.duration}s
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </AppLayout>
    </ErrorBoundary>
  );
}

function Stat({ label, value, tone = "neutral" }: { label: string; value: number; tone?: "ok" | "warn" | "neutral" }) {
  const cls = tone === "ok" ? "text-emerald-500" : tone === "warn" ? "text-yellow-500" : "text-foreground";
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={`mt-1 text-2xl font-semibold ${cls}`}>{value}</p>
    </div>
  );
}

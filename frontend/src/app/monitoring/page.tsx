"use client";

import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/ui/page-header";
import { LoadingState } from "@/components/ui/loading-state";
import { EmptyState } from "@/components/ui/empty-state";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { alertsApi } from "@/lib/alerts";
import { statsApi } from "@/lib/stats";
import { BellRing, CheckCircle2, Circle } from "lucide-react";

export default function MonitoringPage() {
  const qc = useQueryClient();
  const stats = useQuery({ queryKey: ["alerts", "stats"], queryFn: () => alertsApi.getAlertStats().then((r) => r.data) });
  const active = useQuery({ queryKey: ["alerts", "active"], queryFn: () => alertsApi.getActiveAlerts().then((r) => r.data) });
  const rules = useQuery({ queryKey: ["alerts", "rules"], queryFn: () => alertsApi.getAlertRules().then((r) => r.data) });
  const health = useQuery({ queryKey: ["stats", "cluster-health"], queryFn: () => statsApi.getClusterHealth().then((r) => r.data) });

  const ack = useMutation({
    mutationFn: (id: string) => alertsApi.acknowledgeAlert(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["alerts"] }),
  });
  const resolve = useMutation({
    mutationFn: (id: string) => alertsApi.resolveAlert(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["alerts"] }),
  });

  return (
    <AppLayout>
      <PageHeader title="Monitoring" description="Alert posture, active incidents, and cluster health." />

      <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-4">
        <Stat label="Total" value={stats.data?.total ?? 0} />
        <Stat label="Active" value={stats.data?.active ?? 0} tone="warn" />
        <Stat label="Acknowledged" value={stats.data?.acknowledged ?? 0} />
        <Stat label="Resolved" value={stats.data?.resolved ?? 0} tone="ok" />
      </div>

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
          <div className="border-b border-border px-4 py-2 text-sm font-medium">Cluster health</div>
          {health.isLoading ? (
            <LoadingState />
          ) : (
            <pre className="max-h-80 overflow-auto p-4 text-xs">
              {JSON.stringify(health.data, null, 2)}
            </pre>
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

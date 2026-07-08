"use client";

import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/ui/page-header";
import { LoadingState } from "@/components/ui/loading-state";
import { EmptyState } from "@/components/ui/empty-state";
import { useQuery } from "@tanstack/react-query";
import { securityApi } from "@/lib/security";
import { ShieldCheck } from "lucide-react";

/**
 * Compliance overview derived from vulnerability scan stats.
 * Backend has no dedicated /security/compliance route — we surface the
 * scan-stats + recent-scan posture as a compliance snapshot.
 */
export default function CompliancePage() {
  const stats = useQuery({ queryKey: ["security", "vuln-stats"], queryFn: securityApi.getVulnerabilityStats });
  const history = useQuery({ queryKey: ["security", "vuln-history"], queryFn: () => securityApi.getScanHistory(50) });

  const totalCritical = stats.data?.bySeverity?.critical ?? 0;
  const totalHigh = stats.data?.bySeverity?.high ?? 0;
  const open = stats.data?.open ?? 0;
  const status: "pass" | "warn" | "fail" =
    totalCritical > 0 ? "fail" : totalHigh > 0 || open > 5 ? "warn" : "pass";

  return (
    <AppLayout>
      <PageHeader title="Compliance" description="Posture summary based on the latest vulnerability scans." />

      <div className="mb-6 grid gap-4 md:grid-cols-3">
        <Card label="Overall posture" value={status.toUpperCase()} tone={status} />
        <Card label="Open findings" value={String(open)} />
        <Card label="Critical findings" value={String(totalCritical)} tone={totalCritical > 0 ? "fail" : "pass"} />
      </div>

      <div className="rounded-xl border border-border bg-card">
        <div className="border-b border-border px-4 py-2 text-sm font-medium">Scan history (last 50)</div>
        {history.isLoading ? (
          <LoadingState />
        ) : !history.data?.length ? (
          <EmptyState icon={<ShieldCheck className="h-6 w-6" />} title="No scans yet" />
        ) : (
          <div className="divide-y divide-border">
            {history.data.map((s) => (
              <div key={s.id} className="px-4 py-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">{s.target}</p>
                  <span className="text-xs text-muted-foreground">{s.status}</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {s.targetType} • {new Date(s.startedAt).toLocaleString()}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}

function Card({ label, value, tone = "neutral" }: { label: string; value: string; tone?: "pass" | "warn" | "fail" | "neutral" }) {
  const toneClass =
    tone === "pass" ? "text-emerald-500" : tone === "warn" ? "text-yellow-500" : tone === "fail" ? "text-destructive" : "text-foreground";
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={`mt-1 text-2xl font-semibold ${toneClass}`}>{value}</p>
    </div>
  );
}

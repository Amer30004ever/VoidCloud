
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/ui/page-header";
import { LoadingState } from "@/components/ui/loading-state";
import { EmptyState } from "@/components/ui/empty-state";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { securityApi } from "@/lib/security";
import { ShieldAlert, Container, Layers } from "lucide-react";
import { useState } from "react";

export default function VulnerabilitiesPage() {
  const qc = useQueryClient();
  const [image, setImage] = useState("");
  const [deploy, setDeploy] = useState({ namespace: "", name: "" });

  const stats = useQuery({ queryKey: ["security", "vuln-stats"], queryFn: securityApi.getVulnerabilityStats });
  const history = useQuery({ queryKey: ["security", "vuln-history"], queryFn: () => securityApi.getScanHistory(20) });

  const scanImg = useMutation({
    mutationFn: (img: string) => securityApi.scanImage({ image: img }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["security", "vuln-history"] });
      qc.invalidateQueries({ queryKey: ["security", "vuln-stats"] });
    },
  });
  const scanDep = useMutation({
    mutationFn: (p: { namespace: string; name: string }) => securityApi.scanDeployment(p),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["security", "vuln-history"] }),
  });

  return (
    <AppLayout>
      <PageHeader title="Vulnerabilities" description="Container image and deployment vulnerability scans." />

      <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-5">
        <Stat label="Total scans" value={stats.data?.totalScans ?? 0} />
        <Stat label="Open" value={stats.data?.open ?? 0} />
        {(["critical", "high", "medium"] as const).map((sev) => (
          <Stat key={sev} label={sev} value={stats.data?.bySeverity?.[sev] ?? 0} />
        ))}
      </div>

      <div className="mb-6 grid gap-4 md:grid-cols-2">
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="mb-2 flex items-center gap-2 text-sm font-medium">
            <Container className="h-4 w-4" /> Scan image
          </div>
          <div className="flex gap-2">
            <input
              value={image}
              onChange={(e) => setImage(e.target.value)}
              placeholder="nginx:1.25"
              className="flex-1 rounded-md border border-border bg-background px-3 py-1.5 text-sm"
            />
            <button
              onClick={() => image && scanImg.mutate(image)}
              disabled={scanImg.isPending}
              className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground disabled:opacity-50"
            >
              Scan
            </button>
          </div>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="mb-2 flex items-center gap-2 text-sm font-medium">
            <Layers className="h-4 w-4" /> Scan deployment
          </div>
          <div className="flex gap-2">
            <input
              value={deploy.namespace}
              onChange={(e) => setDeploy((d) => ({ ...d, namespace: e.target.value }))}
              placeholder="namespace"
              className="flex-1 rounded-md border border-border bg-background px-3 py-1.5 text-sm"
            />
            <input
              value={deploy.name}
              onChange={(e) => setDeploy((d) => ({ ...d, name: e.target.value }))}
              placeholder="name"
              className="flex-1 rounded-md border border-border bg-background px-3 py-1.5 text-sm"
            />
            <button
              onClick={() => deploy.namespace && deploy.name && scanDep.mutate(deploy)}
              disabled={scanDep.isPending}
              className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground disabled:opacity-50"
            >
              Scan
            </button>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card">
        <div className="border-b border-border px-4 py-2 text-sm font-medium">Recent scans</div>
        {history.isLoading ? (
          <LoadingState />
        ) : !history.data?.length ? (
          <EmptyState icon={<ShieldAlert className="h-6 w-6" />} title="No scans yet" />
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
                  {s.severity ? ` • C:${s.severity.critical ?? 0} H:${s.severity.high ?? 0} M:${s.severity.medium ?? 0}` : ""}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-semibold">{value}</p>
    </div>
  );
}

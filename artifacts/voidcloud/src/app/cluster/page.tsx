
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/ui/page-header";
import { LoadingState } from "@/components/ui/loading-state";
import { ErrorState } from "@/components/ui/error-state";
import { EmptyState } from "@/components/ui/empty-state";
import { useQuery } from "@tanstack/react-query";
import { clusterApi } from "@/lib/cluster";
import { Server, HardDrive, Package, Network, Gauge, Activity } from "lucide-react";
import { useState } from "react";

type Tab = "nodes" | "storage" | "helm" | "network" | "quotas" | "events";

export default function ClusterPage() {
  const [tab, setTab] = useState<Tab>("nodes");

  return (
    <AppLayout>
      <PageHeader title="Cluster" description="Kubernetes nodes, storage, Helm releases, and policies." />

      <div className="mb-4 flex flex-wrap gap-2 border-b border-border">
        {([
          { k: "nodes", label: "Nodes", Icon: Server },
          { k: "storage", label: "Storage", Icon: HardDrive },
          { k: "helm", label: "Helm", Icon: Package },
          { k: "network", label: "Network", Icon: Network },
          { k: "quotas", label: "Quotas", Icon: Gauge },
          { k: "events", label: "Events", Icon: Activity },
        ] as const).map(({ k, label, Icon }) => (
          <button
            key={k}
            onClick={() => setTab(k as Tab)}
            className={`flex items-center gap-1.5 px-4 py-2 text-sm ${tab === k ? "border-b-2 border-primary text-foreground" : "text-muted-foreground"}`}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </div>

      <div className="rounded-xl border border-border bg-card">
        {tab === "nodes" && <NodesTab />}
        {tab === "storage" && <StorageTab />}
        {tab === "helm" && <HelmTab />}
        {tab === "network" && <NetworkTab />}
        {tab === "quotas" && <QuotasTab />}
        {tab === "events" && <EventsTab />}
      </div>
    </AppLayout>
  );
}

function NodesTab() {
  const { data, isLoading, error } = useQuery({ queryKey: ["cluster", "nodes"], queryFn: clusterApi.listNodes });
  if (isLoading) return <LoadingState />;
  if (error) return <ErrorState message={(error as Error).message} />;
  if (!data?.length) return <EmptyState icon={<Server className="h-6 w-6" />} title="No nodes" />;
  return (
    <table className="w-full text-sm">
      <thead className="border-b border-border text-xs text-muted-foreground">
        <tr>
          <th className="px-4 py-2 text-left">Name</th>
          <th className="px-4 py-2 text-left">Status</th>
          <th className="px-4 py-2 text-left">Roles</th>
          <th className="px-4 py-2 text-left">Version</th>
          <th className="px-4 py-2 text-left">Age</th>
        </tr>
      </thead>
      <tbody>
        {data.map((n) => (
          <tr key={n.name} className="border-b border-border last:border-0">
            <td className="px-4 py-3 font-medium">{n.name}</td>
            <td className="px-4 py-3">{n.status}</td>
            <td className="px-4 py-3 text-muted-foreground">{n.roles?.join(", ")}</td>
            <td className="px-4 py-3 text-muted-foreground">{n.version}</td>
            <td className="px-4 py-3 text-muted-foreground">{n.age}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function StorageTab() {
  const pvs = useQuery({ queryKey: ["cluster", "pvs"], queryFn: clusterApi.listPersistentVolumes });
  const pvcs = useQuery({ queryKey: ["cluster", "pvcs"], queryFn: () => clusterApi.listPersistentVolumeClaims() });
  const scs = useQuery({ queryKey: ["cluster", "sc"], queryFn: clusterApi.listStorageClasses });

  if (pvs.isLoading || pvcs.isLoading || scs.isLoading) return <LoadingState />;

  return (
    <div className="divide-y divide-border">
      <Section title="Persistent Volumes" count={pvs.data?.length ?? 0}>
        {pvs.data?.map((p) => (
          <Row key={p.name} title={p.name} subtitle={`${p.capacity} • ${p.status} • ${p.storageClass ?? "—"}`} />
        ))}
      </Section>
      <Section title="Persistent Volume Claims" count={pvcs.data?.length ?? 0}>
        {pvcs.data?.map((p) => (
          <Row key={`${p.namespace}/${p.name}`} title={`${p.namespace}/${p.name}`} subtitle={`${p.capacity ?? "—"} • ${p.status}`} />
        ))}
      </Section>
      <Section title="Storage Classes" count={scs.data?.length ?? 0}>
        {scs.data?.map((s) => (
          <Row key={s.name} title={s.name} subtitle={`${s.provisioner}${s.isDefault ? " • default" : ""}`} />
        ))}
      </Section>
    </div>
  );
}

function HelmTab() {
  const { data, isLoading, error } = useQuery({ queryKey: ["cluster", "helm"], queryFn: () => clusterApi.listHelmReleases() });
  if (isLoading) return <LoadingState />;
  if (error) return <ErrorState message={(error as Error).message} />;
  if (!data?.length) return <EmptyState icon={<Package className="h-6 w-6" />} title="No Helm releases" />;
  return (
    <div className="divide-y divide-border">
      {data.map((r) => (
        <Row key={`${r.namespace}/${r.name}`} title={`${r.namespace}/${r.name}`} subtitle={`${r.chart}@${r.version} • ${r.status}`} />
      ))}
    </div>
  );
}

function NetworkTab() {
  const { data, isLoading } = useQuery({ queryKey: ["cluster", "netpol"], queryFn: () => clusterApi.listNetworkPolicies() });
  if (isLoading) return <LoadingState />;
  if (!data?.length) return <EmptyState icon={<Network className="h-6 w-6" />} title="No network policies" />;
  return (
    <div className="divide-y divide-border">
      {data.map((p) => (
        <Row key={`${p.namespace}/${p.name}`} title={`${p.namespace}/${p.name}`} subtitle={p.policyTypes?.join(", ")} />
      ))}
    </div>
  );
}

function QuotasTab() {
  const { data, isLoading } = useQuery({ queryKey: ["cluster", "quotas"], queryFn: () => clusterApi.listQuotas() });
  if (isLoading) return <LoadingState />;
  if (!data?.length) return <EmptyState icon={<Gauge className="h-6 w-6" />} title="No quotas" />;
  return (
    <div className="divide-y divide-border">
      {data.map((q) => (
        <div key={`${q.namespace}/${q.name}`} className="px-4 py-3">
          <p className="text-sm font-medium">{q.namespace}/{q.name}</p>
          <pre className="mt-1 text-xs text-muted-foreground">{JSON.stringify(q.hard, null, 2)}</pre>
        </div>
      ))}
    </div>
  );
}

function EventsTab() {
  const { data, isLoading } = useQuery({ queryKey: ["cluster", "events"], queryFn: () => clusterApi.listEvents() });
  if (isLoading) return <LoadingState />;
  if (!data?.length) return <EmptyState icon={<Activity className="h-6 w-6" />} title="No events" />;
  return (
    <div className="divide-y divide-border">
      {data.map((e, i) => (
        <div key={i} className="px-4 py-3">
          <div className="flex justify-between text-sm">
            <span className="font-medium">{e.reason}</span>
            <span className="text-xs text-muted-foreground">{e.lastTimestamp}</span>
          </div>
          <p className="text-xs text-muted-foreground">{e.namespace}/{e.involvedObject} — {e.message}</p>
        </div>
      ))}
    </div>
  );
}

function Section({ title, count, children }: { title: string; count: number; children: React.ReactNode }) {
  return (
    <div>
      <div className="bg-muted/40 px-4 py-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {title} ({count})
      </div>
      <div className="divide-y divide-border">{children}</div>
    </div>
  );
}

function Row({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="px-4 py-3">
      <p className="text-sm font-medium">{title}</p>
      {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
    </div>
  );
}

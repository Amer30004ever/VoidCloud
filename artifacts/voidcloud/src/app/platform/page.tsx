
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, RefreshCw, GitBranch, Network, Gauge, Layers, Radio } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/ui/page-header";
import { AddItemButton } from "@/components/ui/create-item-dialog";
import { platformApi } from "@/lib/platform";
import { useAuth } from "@/contexts/AuthContext";

export default function PlatformPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === "ADMIN";
  const queryClient = useQueryClient();

  const observability = useQuery({ queryKey: ["platform-observability"], queryFn: platformApi.getObservabilityLinks });
  const gitops = useQuery({ queryKey: ["platform-gitops"], queryFn: platformApi.getGitOpsStatus });
  const topology = useQuery({ queryKey: ["platform-topology"], queryFn: platformApi.getTopology });
  const capacity = useQuery({ queryKey: ["platform-capacity"], queryFn: platformApi.getCapacity, enabled: isAdmin });
  const heatmap = useQuery({ queryKey: ["platform-heatmap"], queryFn: platformApi.getHeatmap });
  const clusters = useQuery({ queryKey: ["platform-clusters"], queryFn: platformApi.getClusters });

  const syncMutation = useMutation({
    mutationFn: platformApi.forceGitOpsSync,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["platform-gitops"] }),
  });

  const activateMutation = useMutation({
    mutationFn: platformApi.activateCluster,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["platform-clusters"] }),
  });

  return (
    <AppLayout>
      <PageHeader
        title="Platform Hub"
        description="Observability, GitOps, topology, capacity, and multi-cluster control"
        action={
          isAdmin ? (
            <AddItemButton
              label="Register Cluster"
              title="Register Cluster"
              fields={[
                { name: "name", label: "Name", placeholder: "production", required: true },
                { name: "context", label: "Kube Context", placeholder: "prod-cluster", required: true },
                { name: "apiServer", label: "API Server", placeholder: "https://k8s.example.com:6443" },
              ]}
              onSubmit={async (values) => {
                await platformApi.createCluster({
                  name: values.name,
                  context: values.context,
                  apiServer: values.apiServer,
                });
                await queryClient.invalidateQueries({ queryKey: ["platform-clusters"] });
              }}
            />
          ) : undefined
        }
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-xl border border-border bg-card p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-sm font-semibold">
              <GitBranch className="h-4 w-4 text-primary" /> GitOps Status
            </h2>
            {isAdmin && (
              <button
                type="button"
                onClick={() => syncMutation.mutate()}
                disabled={syncMutation.isPending}
                className="flex items-center gap-1 rounded-lg bg-primary/10 px-3 py-1.5 text-xs text-primary hover:bg-primary/20"
              >
                {syncMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
                Force sync
              </button>
            )}
          </div>
          {gitops.isLoading ? (
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          ) : (
            <pre className="max-h-48 overflow-auto rounded-lg bg-muted/50 p-3 text-xs text-foreground">
              {JSON.stringify(gitops.data, null, 2)}
            </pre>
          )}
        </section>

        <section className="rounded-xl border border-border bg-card p-6">
          <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold">
            <Layers className="h-4 w-4 text-primary" /> Clusters
          </h2>
          {clusters.isLoading ? (
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          ) : (
            <div className="space-y-2">
              {(clusters.data?.clusters ?? []).map((c: { id: string; name: string; environment?: string; active?: boolean }) => (
                <div key={c.id} className="flex items-center justify-between rounded-lg border border-border p-3 text-sm">
                  <div>
                    <p className="font-medium text-foreground">{c.name}</p>
                    <p className="text-xs text-muted-foreground">{c.environment ?? "production"}</p>
                  </div>
                  {c.active ? (
                    <span className="rounded-full bg-green-500/10 px-2 py-0.5 text-xs text-green-600">Active</span>
                  ) : isAdmin ? (
                    <button type="button" onClick={() => activateMutation.mutate(c.id)} className="text-xs text-primary hover:underline">
                      Activate
                    </button>
                  ) : null}
                </div>
              ))}
              {!clusters.data?.clusters?.length && <p className="text-sm text-muted-foreground">No clusters registered.</p>}
            </div>
          )}
        </section>

        <section className="rounded-xl border border-border bg-card p-6">
          <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold">
            <Radio className="h-4 w-4 text-primary" /> Observability
          </h2>
          <div className="grid gap-2 sm:grid-cols-2">
            {(observability.data ?? []).map((link: { id: string; name: string; url: string; category: string }) => (
              <a
                key={link.id}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-lg border border-border p-3 text-sm hover:border-primary/40"
              >
                <p className="font-medium text-foreground">{link.name}</p>
                <p className="text-xs text-muted-foreground">{link.category}</p>
              </a>
            ))}
          </div>
        </section>

        <section className="rounded-xl border border-border bg-card p-6">
          <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold">
            <Network className="h-4 w-4 text-primary" /> Service Topology
          </h2>
          {topology.isLoading ? (
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          ) : (
            <pre className="max-h-48 overflow-auto rounded-lg bg-muted/50 p-3 text-xs">
              {JSON.stringify(topology.data, null, 2)}
            </pre>
          )}
        </section>

        {isAdmin && (
          <section className="rounded-xl border border-border bg-card p-6 lg:col-span-2">
            <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold">
              <Gauge className="h-4 w-4 text-primary" /> Capacity Forecast
            </h2>
            {capacity.isLoading ? (
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            ) : (
              <pre className="max-h-64 overflow-auto rounded-lg bg-muted/50 p-3 text-xs">
                {JSON.stringify(capacity.data, null, 2)}
              </pre>
            )}
          </section>
        )}

        <section className="rounded-xl border border-border bg-card p-6 lg:col-span-2">
          <h2 className="mb-4 text-sm font-semibold">Resource Heatmap</h2>
          {heatmap.isLoading ? (
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          ) : (
            <pre className="max-h-64 overflow-auto rounded-lg bg-muted/50 p-3 text-xs">
              {JSON.stringify(heatmap.data, null, 2)}
            </pre>
          )}
        </section>
      </div>
    </AppLayout>
  );
}

"use client";

import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@workspace/ui-kit/page-header";
import { LoadingState } from "@workspace/ui-kit/loading-state";
import { ErrorState } from "@workspace/ui-kit/error-state";
import { EmptyState } from "@workspace/ui-kit/empty-state";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { infrastructureApi } from "@/features/vps/infrastructure";
import { Rocket, Trash2 } from "lucide-react";
import { useState } from "react";

export default function DeploymentsPage() {
  const qc = useQueryClient();
  const [ns, setNs] = useState<string>("");

  const namespaces = useQuery({ queryKey: ["infra", "ns"], queryFn: () => infrastructureApi.getNamespaces().then((r) => r.data) });
  const deps = useQuery({
    queryKey: ["infra", "deployments", ns],
    queryFn: () => infrastructureApi.getDeployments(ns || undefined).then((r) => r.data),
  });

  const del = useMutation({
    mutationFn: ({ namespace, name }: { namespace: string; name: string }) =>
      infrastructureApi.deleteDeployment(namespace, name),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["infra", "deployments"] }),
  });

  return (
    <AppLayout>
      <PageHeader title="Deployments" description="Kubernetes deployments across namespaces." />

      <div className="mb-4 flex items-center gap-2">
        <label className="text-xs text-muted-foreground">Namespace</label>
        <select
          value={ns}
          onChange={(e) => setNs(e.target.value)}
          className="rounded-md border border-border bg-background px-2 py-1 text-sm"
        >
          <option value="">all</option>
          {namespaces.data?.map((n) => (
            <option key={n} value={n}>{n}</option>
          ))}
        </select>
      </div>

      <div className="rounded-xl border border-border bg-card">
        {deps.isLoading ? (
          <LoadingState />
        ) : deps.error ? (
          <ErrorState message={(deps.error as Error).message} />
        ) : !deps.data?.length ? (
          <EmptyState icon={<Rocket className="h-6 w-6" />} title="No deployments" />
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-border text-xs text-muted-foreground">
              <tr>
                <th className="px-4 py-2 text-left">Namespace</th>
                <th className="px-4 py-2 text-left">Name</th>
                <th className="px-4 py-2 text-left">Ready</th>
                <th className="px-4 py-2 text-left">Image</th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {deps.data.map((d) => (
                <tr key={`${d.namespace}/${d.name}`} className="border-b border-border last:border-0">
                  <td className="px-4 py-2 text-muted-foreground">{d.namespace}</td>
                  <td className="px-4 py-2 font-medium">{d.name}</td>
                  <td className="px-4 py-2">{d.readyReplicas ?? 0}/{d.replicas ?? 0}</td>
                  <td className="px-4 py-2 text-xs text-muted-foreground">{d.image ?? "—"}</td>
                  <td className="px-4 py-2 text-right">
                    <button
                      onClick={() => del.mutate({ namespace: d.namespace, name: d.name })}
                      className="rounded-md border border-border p-1.5 text-destructive hover:bg-destructive/10"
                      title="Delete"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </AppLayout>
  );
}

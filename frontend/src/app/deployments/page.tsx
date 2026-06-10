"use client";

import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { AddItemButton } from "@/components/ui/create-item-dialog";
import { Rocket, Loader2, RotateCcw, Eye, X } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { pipelinesApi, DeploymentHistory, WorkflowRun } from "@/lib/pipelines";

export default function DeploymentsPage() {
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState<DeploymentHistory | null>(null);
  const [workflowDetail, setWorkflowDetail] = useState<WorkflowRun | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["deployment-history"],
    queryFn: async () => {
      const response = await pipelinesApi.getDeploymentHistory(50);
      return response.data;
    },
  });

  const rollbackMutation = useMutation({
    mutationFn: pipelinesApi.rollbackDeployment,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["deployment-history"] }),
  });

  const openDetails = async (item: DeploymentHistory) => {
    setSelected(item);
    setWorkflowDetail(null);
    if (item.owner && item.repo && item.workflowId) {
      setLoadingDetail(true);
      try {
        const res = await pipelinesApi.getWorkflowStatus(item.owner, item.repo, item.workflowId);
        setWorkflowDetail(res.data.workflow);
      } catch {
        setWorkflowDetail(null);
      } finally {
        setLoadingDetail(false);
      }
    }
  };

  const items = data?.items ?? [];

  return (
    <AppLayout>
      <PageHeader
        title="Deployments"
        description="Track application deployments across environments"
        action={
          <AddItemButton
            label="New Deployment"
            title="Trigger Deployment"
            description="Trigger a pipeline deployment."
            className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            fields={[
              { name: "repo", label: "Repository", placeholder: "Amer-Devops-Poral", required: true },
              { name: "owner", label: "Owner", placeholder: "Amer30004ever" },
              { name: "workflowId", label: "Workflow ID", placeholder: "deploy.yml" },
              { name: "ref", label: "Branch/Ref", placeholder: "main" },
            ]}
            onSubmit={async (values) => {
              await pipelinesApi.triggerPipeline({
                provider: "github",
                owner: values.owner || "Amer30004ever",
                repo: values.repo,
                workflowId: values.workflowId || "deploy.yml",
                ref: values.ref || "main",
              });
              await queryClient.invalidateQueries({ queryKey: ["deployment-history"] });
            }}
          />
        }
      />

      <div className="rounded-xl border border-border bg-card">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : items.length === 0 ? (
          <EmptyState
            icon={<Rocket className="h-6 w-6" />}
            title="No deployments yet"
            description="Trigger your first deployment to populate the timeline"
            className="py-20"
          />
        ) : (
          <div className="p-4">
            <h3 className="mb-4 text-sm font-semibold text-foreground">Deployment Timeline</h3>
            <div className="space-y-4">
              {items.map((item) => (
                <div key={item.id} className="relative border-l-2 border-primary/30 pl-4">
                  <div className="absolute -left-[5px] top-1 h-2 w-2 rounded-full bg-primary" />
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        {item.repo} @ {item.ref ?? "main"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {item.provider} • {item.status} • {new Date(item.createdAt).toLocaleString()}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => openDetails(item)}
                        className="flex items-center gap-1 rounded-lg bg-muted px-2 py-1 text-xs hover:bg-muted/80"
                      >
                        <Eye className="h-3 w-3" />
                        Details
                      </button>
                      <button
                        type="button"
                        onClick={() => rollbackMutation.mutate(item.id)}
                        className="flex items-center gap-1 rounded-lg bg-primary/10 px-2 py-1 text-xs text-primary hover:bg-primary/20"
                      >
                        <RotateCcw className="h-3 w-3" />
                        Rollback
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[80vh] w-full max-w-lg overflow-y-auto rounded-xl border border-border bg-card p-6">
            <div className="mb-4 flex items-start justify-between">
              <h3 className="text-lg font-semibold">Deployment Details</h3>
              <button type="button" onClick={() => setSelected(null)} className="text-muted-foreground hover:text-foreground">
                <X className="h-5 w-5" />
              </button>
            </div>
            <dl className="space-y-2 text-sm">
              <div><dt className="text-muted-foreground">Repository</dt><dd>{selected.repo}</dd></div>
              <div><dt className="text-muted-foreground">Status</dt><dd>{selected.status}</dd></div>
              <div><dt className="text-muted-foreground">Ref</dt><dd>{selected.ref ?? "main"}</dd></div>
              <div><dt className="text-muted-foreground">Workflow</dt><dd>{selected.workflowId ?? "—"}</dd></div>
            </dl>
            {loadingDetail && <Loader2 className="mt-4 h-5 w-5 animate-spin" />}
            {workflowDetail && (
              <pre className="mt-4 max-h-48 overflow-auto rounded-lg bg-muted p-3 text-xs">
                {JSON.stringify(workflowDetail, null, 2)}
              </pre>
            )}
          </div>
        </div>
      )}
    </AppLayout>
  );
}

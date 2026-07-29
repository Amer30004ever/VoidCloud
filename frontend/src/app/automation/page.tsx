"use client";

import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@workspace/ui-kit/page-header";
import { EmptyState } from "@workspace/ui-kit/empty-state";
import { LoadingState } from "@workspace/ui-kit/loading-state";
import { ErrorState } from "@workspace/ui-kit/error-state";
import { AddItemButton } from "@workspace/ui-kit/create-item-dialog";
import { Bot, Play, Trash2 } from "lucide-react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { automationApi, type AutomationScript, type AutomationWorkflow } from "@/features/admin/automation";
import { useState } from "react";

type Tab = "scripts" | "workflows";

export default function AutomationPage() {
  const [tab, setTab] = useState<Tab>("scripts");
  const qc = useQueryClient();

  const scripts = useQuery({ queryKey: ["automation", "scripts"], queryFn: automationApi.listScripts });
  const workflows = useQuery({ queryKey: ["automation", "workflows"], queryFn: automationApi.listWorkflows });

  const runScript = useMutation({
    mutationFn: (id: string) => automationApi.executeScript(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["automation", "scripts"] }),
  });
  const runWorkflow = useMutation({
    mutationFn: (id: string) => automationApi.executeWorkflow(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["automation", "workflows"] }),
  });
  const deleteScript = useMutation({
    mutationFn: (id: string) => automationApi.deleteScript(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["automation", "scripts"] }),
  });
  const deleteWorkflow = useMutation({
    mutationFn: (id: string) => automationApi.deleteWorkflow(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["automation", "workflows"] }),
  });

  return (
    <AppLayout>
      <PageHeader
        title="Automation"
        description="Manage automation scripts and multi-step workflows."
        action={
          tab === "scripts" ? (
            <AddItemButton
              label="New Script"
              title="Create Script"
              description="Define a runnable automation script."
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
              fields={[
                { name: "name", label: "Name", required: true },
                { name: "language", label: "Language", placeholder: "bash | python | node", required: true },
                { name: "description", label: "Description" },
                { name: "content", label: "Source", required: true },
              ]}
              onSubmit={async (v) => {
                await automationApi.createScript(v as Partial<AutomationScript>);
                qc.invalidateQueries({ queryKey: ["automation", "scripts"] });
              }}
            />
          ) : (
            <AddItemButton
              label="New Workflow"
              title="Create Workflow"
              description="Compose a multi-step workflow."
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
              fields={[
                { name: "name", label: "Name", required: true },
                { name: "trigger", label: "Trigger", placeholder: "manual | cron | webhook", required: true },
                { name: "description", label: "Description" },
              ]}
              onSubmit={async (v) => {
                await automationApi.createWorkflow({
                  name: v.name,
                  trigger: v.trigger,
                  description: v.description,
                  steps: [],
                  enabled: true,
                } as Partial<AutomationWorkflow>);
                qc.invalidateQueries({ queryKey: ["automation", "workflows"] });
              }}
            />
          )
        }
      />

      <div className="mb-4 flex gap-2 border-b border-border">
        {(["scripts", "workflows"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm capitalize ${tab === t ? "border-b-2 border-primary text-foreground" : "text-muted-foreground"}`}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="rounded-xl border border-border bg-card">
        {tab === "scripts" ? (
          scripts.isLoading ? (
            <LoadingState message="Loading scripts..." />
          ) : scripts.error ? (
            <ErrorState message={(scripts.error as Error).message} />
          ) : scripts.data?.length === 0 ? (
            <EmptyState icon={<Bot className="h-6 w-6" />} title="No scripts yet" description="Create your first automation script" />
          ) : (
            <div className="divide-y divide-border">
              {scripts.data?.map((s) => (
                <div key={s.id} className="flex items-center justify-between px-4 py-3">
                  <div>
                    <p className="text-sm font-medium text-foreground">{s.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {s.language} • {s.description ?? "—"}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => runScript.mutate(s.id)} className="rounded-md border border-border p-1.5 hover:bg-muted" title="Run">
                      <Play className="h-4 w-4" />
                    </button>
                    <button onClick={() => deleteScript.mutate(s.id)} className="rounded-md border border-border p-1.5 text-destructive hover:bg-destructive/10" title="Delete">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )
        ) : workflows.isLoading ? (
          <LoadingState message="Loading workflows..." />
        ) : workflows.error ? (
          <ErrorState message={(workflows.error as Error).message} />
        ) : workflows.data?.length === 0 ? (
          <EmptyState icon={<Bot className="h-6 w-6" />} title="No workflows yet" description="Create your first workflow" />
        ) : (
          <div className="divide-y divide-border">
            {workflows.data?.map((w) => (
              <div key={w.id} className="flex items-center justify-between px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {w.name} {w.enabled ? <span className="ml-2 text-xs text-emerald-500">enabled</span> : <span className="ml-2 text-xs text-muted-foreground">disabled</span>}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    trigger: {w.trigger} • {w.steps?.length ?? 0} steps
                  </p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => runWorkflow.mutate(w.id)} className="rounded-md border border-border p-1.5 hover:bg-muted" title="Run">
                    <Play className="h-4 w-4" />
                  </button>
                  <button onClick={() => deleteWorkflow.mutate(w.id)} className="rounded-md border border-border p-1.5 text-destructive hover:bg-destructive/10" title="Delete">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}

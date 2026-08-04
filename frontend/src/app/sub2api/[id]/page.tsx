"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@workspace/ui-kit/page-header";
import { LoadingState } from "@workspace/ui-kit/loading-state";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api, { sub2api } from "@/lib/api";
import { Button } from "@workspace/ui-kit/button";
import { BellRing, CheckCircle2, Rocket, Server, Trash2 } from "lucide-react";

type Project = {
  id: string;
  name: string;
  description: string | null;
  status: "draft" | "generating" | "ready" | "failed";
  createdAt: string;
  updatedAt: string;
  supabaseProject: {
    id?: string;
    url?: string;
    anonKey?: string;
    status?: string;
  } | null;
};

type Generation = {
  id: string;
  status: string;
  prompt: string | null;
  generatedFiles: Record<string, string> | null;
  error: string | null;
  createdAt: string;
};

type Activity = {
  id: string;
  action: string;
  detail: string | null;
  createdAt: string;
};

export default function ProjectDetailPage() {
  const params = useParams();
  const projectId = params.id as string;
  const qc = useQueryClient();
  const [tab, setTab] = useState("generation");

  const project = useQuery({
    queryKey: ["sub2api", "project", projectId],
    queryFn: () => sub2api.get<Project>(`/projects/${projectId}`).then((r) => r.data),
  });

  const generations = useQuery({
    queryKey: ["sub2api", "generations", projectId],
    queryFn: () => sub2api.get<Generation[]>(`/generations/project/${projectId}`).then((r) => r.data),
    enabled: tab === "generation",
  });

  const activity = useQuery({
    queryKey: ["sub2api", "activity", projectId],
    queryFn: () => sub2api.get<Activity[]>(`/activity/project/${projectId}`).then((r) => r.data),
    enabled: tab === "activity",
  });

  const generate = useMutation({
    mutationFn: (prompt?: string) =>
      sub2api.post(`/generations/project/${projectId}`, { prompt }).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["sub2api", "generations", projectId] });
      qc.invalidateQueries({ queryKey: ["sub2api", "project", projectId] });
    },
  });

  const provision = useMutation({
    mutationFn: () => sub2api.post(`/provisioning/project/${projectId}`).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["sub2api", "project", projectId] }),
  });

  const deleteProject = useMutation({
    mutationFn: () => sub2api.delete(`/projects/${projectId}`).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["sub2api", "projects"] });
      window.location.href = "/sub2api";
    },
  });

  const logActivity = async (action: string, detail?: string) => {
    await sub2api.post(`/activity/project/${projectId}`, { action, detail });
    qc.invalidateQueries({ queryKey: ["sub2api", "activity", projectId] });
  };

  const p = project.data;
  if (!p) {
    return (
      <AppLayout>
        <LoadingState />
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <PageHeader
        title={p.name}
        description={p.description || "sub2api Studio project"}
        action={
          <div className="flex items-center gap-2">
            <span
              className={`text-xs uppercase tracking-wide ${
                p.status === "ready"
                  ? "text-emerald-500"
                  : p.status === "failed"
                  ? "text-red-500"
                  : p.status === "generating"
                  ? "text-yellow-500"
                  : "text-muted-foreground"
              }`}
            >
              {p.status}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (confirm("Delete this project and provisioned backend?")) {
                  deleteProject.mutate();
                  logActivity("deleted", "Project deleted").catch(() => {});
                }
              }}
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        }
      />

      <div className="mt-6 flex gap-1 rounded-xl border border-border bg-card p-1">
        {["generation", "backend", "activity"].map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`rounded-lg px-4 py-2 text-sm capitalize ${
              tab === t ? "bg-primary/10 text-foreground" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "generation" && (
        <div className="mt-4 space-y-4">
          <div className="rounded-xl border border-border bg-card p-5">
            <h3 className="text-sm font-medium">Generate app</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              Describe the app you want. We&apos;ll scaffold a React + Vite project wired to Supabase,
              with a list, detail and form page per entity.
            </p>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={3}
              placeholder="A todo app with kanban boards and user auth..."
              className="mt-3 w-full rounded-lg border border-white/10 bg-slate-950/60 px-3 py-2 text-sm"
            />
            <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
              <input
                value={targetFiles}
                onChange={(e) => setTargetFiles(e.target.value)}
                placeholder="Regenerate only these files (optional), e.g. src/pages/*"
                className="flex-1 rounded-lg border border-white/10 bg-slate-950/60 px-3 py-2 text-xs font-mono"
              />
              <Button onClick={runGenerate} disabled={generate.isPending || !prompt.trim()}>
                <Rocket className="mr-1 h-4 w-4" />
                {generate.isPending ? "Generating..." : targetFiles.trim() ? "Regenerate files" : "Generate"}
              </Button>
            </div>
            {targetFiles.trim() ? (
              <p className="mt-2 text-[11px] text-muted-foreground">
                Only matching files are replaced; everything else is carried over from the last
                successful generation.
              </p>
            ) : null}
          </div>

          {generations.isLoading ? (
            <LoadingState />
          ) : (
            <div className="space-y-3">
              {generations.data?.map((g) => (
                <div key={g.id} className="rounded-xl border border-border bg-card p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    {g.status === "completed" ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    ) : g.status === "failed" ? (
                      <BellRing className="h-4 w-4 text-red-500" />
                    ) : (
                      <Server className="h-4 w-4 text-yellow-500" />
                    )}
                    <span className="text-sm font-medium capitalize">{g.status}</span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(g.createdAt).toLocaleString()}
                    </span>
                    {g.status === "completed" && g.generatedFiles ? (
                      <>
                        <span className="text-xs text-muted-foreground">
                          {Object.keys(g.generatedFiles).length} files
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          className="ml-auto"
                          onClick={() => void download(g.id)}
                        >
                          <Download className="mr-1 h-3 w-3" /> Download project
                        </Button>
                      </>
                    ) : null}
                  </div>
                  {g.prompt ? (
                    <p className="mt-2 text-xs text-muted-foreground">{g.prompt}</p>
                  ) : null}
                  {g.error && <p className="mt-2 text-xs text-red-400">{g.error}</p>}
                  {g.generatedFiles && (
                    <div className="mt-3">
                      <GeneratedFileTree files={g.generatedFiles} />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}


      {tab === "backend" && (
        <div className="mt-4">
          <div className="rounded-xl border border-border bg-card p-5">
            <h3 className="text-sm font-medium">Supabase backend</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              Provision a real Supabase project for this generated app.
            </p>
            {p.supabaseProject ? (
              <div className="mt-3 space-y-1 text-xs">
                <p>
                  <strong>URL:</strong> {p.supabaseProject.url}
                </p>
                <p>
                  <strong>Anon key:</strong>{" "}
                  <span className="font-mono">{p.supabaseProject.anonKey?.slice(0, 12)}...</span>
                </p>
                <p>
                  <strong>Status:</strong> {p.supabaseProject.status}
                </p>
              </div>
            ) : (
              <Button
                className="mt-3"
                onClick={() => {
                  provision.mutate();
                  logActivity("provisioned", "Supabase project provisioning started").catch(() => {});
                }}
                disabled={provision.isPending}
              >
                {provision.isPending ? "Provisioning..." : "Provision Supabase project"}
              </Button>
            )}
          </div>
        </div>
      )}

      {tab === "activity" && (
        <div className="mt-4">
          <div className="rounded-xl border border-border bg-card divide-y divide-border">
            {activity.isLoading ? (
              <div className="p-8 text-center text-sm text-muted-foreground">Loading...</div>
            ) : activity.data?.length === 0 ? (
              <div className="p-8 text-center text-sm text-muted-foreground">No activity yet.</div>
            ) : (
              activity.data?.map((a) => (
                <div key={a.id} className="flex items-center justify-between px-4 py-3">
                  <div>
                    <p className="text-sm font-medium capitalize">{a.action}</p>
                    {a.detail && <p className="text-xs text-muted-foreground">{a.detail}</p>}
                  </div>
                  <span className="text-[10px] text-muted-foreground">
                    {new Date(a.createdAt).toLocaleString()}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </AppLayout>
  );
}

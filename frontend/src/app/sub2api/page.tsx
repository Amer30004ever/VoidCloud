"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@workspace/ui-kit/page-header";
import { LoadingState } from "@workspace/ui-kit/loading-state";
import { EmptyState } from "@workspace/ui-kit/empty-state";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, ExternalLink, Trash2 } from "lucide-react";
import api, { sub2api } from "@/lib/api";

type Project = {
  id: string;
  name: string;
  description: string | null;
  status: "draft" | "generating" | "ready" | "failed";
  createdAt: string;
  updatedAt: string;
};

export default function StudioDashboard() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["sub2api", "projects"],
    queryFn: () => sub2api.get<Project[]>("/projects").then((r) => r.data),
  });

  const remove = useMutation({
    mutationFn: (id: string) => sub2api.delete(`/projects/${id}`).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["sub2api", "projects"] }),
  });

  const projects = data ?? [];

  return (
    <AppLayout>
      <PageHeader
        title="sub2api Studio"
        description="AI-powered React app generator"
        action={
          <Link
            href="/sub2api/new"
            className="inline-flex items-center gap-1 rounded-lg bg-gradient-to-r from-cyan-400 to-fuchsia-500 px-4 py-2 text-sm font-semibold text-slate-950"
          >
            <Plus className="h-4 w-4" /> New project
          </Link>
        }
      />

      {isLoading ? (
        <LoadingState />
      ) : projects.length === 0 ? (
        <EmptyState
          icon={<Plus className="h-6 w-6" />}
          title="No projects yet"
          description="Create your first generated app to get started."
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {projects.map((p) => (
            <div key={p.id} className="rounded-xl border border-border bg-card p-5">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold">{p.name}</h3>
                  <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
                    {p.description || "No description"}
                  </p>
                </div>
                <span
                  className={`text-[10px] uppercase tracking-wide ${
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
              </div>
              <div className="mt-4 flex items-center gap-2">
                <Link
                  href={`/sub2api/${p.id}`}
                  className="inline-flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-xs hover:bg-muted"
                >
                  <ExternalLink className="h-3 w-3" /> Open
                </Link>
                <button
                  onClick={() => {
                    if (confirm("Delete this project? This cannot be undone.")) remove.mutate(p.id);
                  }}
                  className="rounded-lg border border-red-500/30 px-3 py-1.5 text-xs text-red-300 hover:bg-red-500/10"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
              <p className="mt-3 text-[10px] text-muted-foreground">
                Updated {new Date(p.updatedAt).toLocaleString()}
              </p>
            </div>
          ))}
        </div>
      )}
    </AppLayout>
  );
}

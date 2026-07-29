"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@workspace/ui-kit/page-header";
import { sub2api } from "@/lib/api";
import { useMutation, useQueryClient } from "@tanstack/react-query";

export default function NewProjectPage() {
  const router = useRouter();
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const create = useMutation({
    mutationFn: () =>
      sub2api
        .post("/projects", { name, description })
        .then((r) => r.data),
    onSuccess: (project) => {
      qc.invalidateQueries({ queryKey: ["sub2api", "projects"] });
      router.push(`/sub2api/${project.id}`);
    },
  });

  return (
    <AppLayout>
      <PageHeader title="New project" description="Describe your app and we'll scaffold it."
        action={
          <a href="/sub2api" className="rounded-lg border border-border px-3 py-1.5 text-xs hover:bg-muted">← Back</a>
        } />

      <div className="mx-auto max-w-xl rounded-xl border border-border bg-card p-6">
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium">Project name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="My Awesome App"
              className="w-full rounded-lg border border-white/10 bg-slate-950/60 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="A task manager with kanban boards..."
              rows={5}
              className="w-full rounded-lg border border-white/10 bg-slate-950/60 px-3 py-2 text-sm"
            />
          </div>
          <button
            disabled={!name.trim() || create.isPending}
            onClick={() => create.mutate()}
            className="w-full rounded-lg bg-gradient-to-r from-cyan-400 to-fuchsia-500 py-2 font-semibold text-slate-950 disabled:opacity-50"
          >
            {create.isPending ? "Creating..." : "Generate app"}
          </button>
        </div>
      </div>
    </AppLayout>
  );
}

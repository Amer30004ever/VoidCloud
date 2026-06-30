
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/ui/page-header";
import { LoadingState } from "@/components/ui/loading-state";
import { ErrorState } from "@/components/ui/error-state";
import { EmptyState } from "@/components/ui/empty-state";
import { AddItemButton } from "@/components/ui/create-item-dialog";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { learningApi } from "@/lib/learning";
import { useAuth } from "@/contexts/AuthContext";
import { FileText, Trash2, Download, Sparkles, FileCheck2 } from "lucide-react";
import { useState } from "react";

export default function CvStudioPage() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const [selected, setSelected] = useState<string | null>(null);

  const cvs = useQuery({ queryKey: ["cv", "list"], queryFn: learningApi.listCvs });
  const templates = useQuery({ queryKey: ["cv", "templates"], queryFn: learningApi.getCvTemplates });
  const current = useQuery({
    queryKey: ["cv", "get", selected],
    queryFn: () => learningApi.getCv(selected!),
    enabled: !!selected,
  });

  const del = useMutation({
    mutationFn: (id: string) => learningApi.deleteCv(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["cv", "list"] }),
  });
  const optimize = useMutation({
    mutationFn: (id: string) => learningApi.optimizeCv(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["cv", "get", selected] }),
  });
  const ats = useMutation({ mutationFn: (id: string) => learningApi.atsScore(id) });

  const exportCv = useMutation({
    mutationFn: (id: string) => learningApi.exportCv(id, { format: "pdf" }),
  });

  return (
    <AppLayout>
      <PageHeader
        title="CV Studio"
        description="Author, optimize, and export your DevOps CV."
        action={
          <AddItemButton
            label="New CV"
            title="Create CV"
            description="Start a new CV from a template."
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            fields={[
              { name: "title", label: "Title", placeholder: "Senior DevOps CV", required: true },
              { name: "templateId", label: "Template ID" },
            ]}
            onSubmit={async (v) => {
              const r = (await learningApi.createCv({
                title: v.title,
                templateId: v.templateId || undefined,
                userId: user?.id,
              })) as { id: string };
              if (r?.id) setSelected(r.id);
              qc.invalidateQueries({ queryKey: ["cv", "list"] });
            }}
          />
        }
      />

      <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
        <div className="space-y-4">
          <div className="rounded-xl border border-border bg-card">
            <div className="border-b border-border px-3 py-2 text-xs font-medium uppercase text-muted-foreground">
              My CVs
            </div>
            {cvs.isLoading ? (
              <LoadingState size="sm" />
            ) : !cvs.data?.length ? (
              <EmptyState icon={<FileText className="h-6 w-6" />} title="No CVs" />
            ) : (
              <div className="divide-y divide-border">
                {cvs.data.map((c) => {
                  const cv = c as { id: string; title?: string; updatedAt?: string };
                  return (
                    <button
                      key={cv.id}
                      onClick={() => setSelected(cv.id)}
                      className={`block w-full px-3 py-2 text-left text-sm hover:bg-muted ${selected === cv.id ? "bg-muted" : ""}`}
                    >
                      <p className="truncate font-medium">{cv.title ?? cv.id}</p>
                      {cv.updatedAt && <p className="text-xs text-muted-foreground">{new Date(cv.updatedAt).toLocaleDateString()}</p>}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className="rounded-xl border border-border bg-card">
            <div className="border-b border-border px-3 py-2 text-xs font-medium uppercase text-muted-foreground">
              Templates ({templates.data?.length ?? 0})
            </div>
            <div className="max-h-60 divide-y divide-border overflow-y-auto">
              {(templates.data ?? []).map((t) => {
                const tpl = t as { id: string; name?: string };
                return (
                  <div key={tpl.id} className="px-3 py-2 text-sm">
                    {tpl.name ?? tpl.id}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card">
          {!selected ? (
            <EmptyState icon={<FileText className="h-6 w-6" />} title="Select a CV" description="Pick a CV from the list to edit, optimize, or export." />
          ) : current.isLoading ? (
            <LoadingState />
          ) : current.error ? (
            <ErrorState message={(current.error as Error).message} />
          ) : (
            <div className="space-y-4 p-4">
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => optimize.mutate(selected)}
                  className="flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-sm hover:bg-muted"
                >
                  <Sparkles className="h-4 w-4" /> Optimize
                </button>
                <button
                  onClick={() => ats.mutate(selected)}
                  className="flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-sm hover:bg-muted"
                >
                  <FileCheck2 className="h-4 w-4" /> ATS score
                </button>
                <button
                  onClick={() => exportCv.mutate(selected)}
                  className="flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-sm hover:bg-muted"
                >
                  <Download className="h-4 w-4" /> Export PDF
                </button>
                <button
                  onClick={() => {
                    del.mutate(selected);
                    setSelected(null);
                  }}
                  className="flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-sm text-destructive hover:bg-destructive/10"
                >
                  <Trash2 className="h-4 w-4" /> Delete
                </button>
              </div>
              {ats.data && (
                <div className="rounded-md border border-border bg-muted/40 p-3 text-sm">
                  <p>ATS score: <span className="font-semibold">{ats.data.score}</span></p>
                  <ul className="mt-2 list-disc pl-5 text-xs text-muted-foreground">
                    {ats.data.suggestions.map((s, i) => (<li key={i}>{s}</li>))}
                  </ul>
                </div>
              )}
              <pre className="max-h-[60vh] overflow-auto rounded-md border border-border bg-muted/30 p-3 text-xs">
                {JSON.stringify(current.data, null, 2)}
              </pre>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}

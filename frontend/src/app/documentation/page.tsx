"use client";

import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/ui/page-header";
import { LoadingState } from "@/components/ui/loading-state";
import { ErrorState } from "@/components/ui/error-state";
import { EmptyState } from "@/components/ui/empty-state";
import { AddItemButton } from "@/components/ui/create-item-dialog";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { documentationApi } from "@/lib/documentation";
import { useAuth } from "@/contexts/AuthContext";
import { BookOpen, Trash2, Download, Upload } from "lucide-react";
import { useRef, useState } from "react";

export default function DocumentationPage() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const [q, setQ] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const docs = useQuery({
    queryKey: ["docs", { q }],
    queryFn: () => documentationApi.list(q ? { q } : undefined),
  });
  const categories = useQuery({ queryKey: ["docs", "categories"], queryFn: documentationApi.listCategories });

  const del = useMutation({
    mutationFn: (id: string) => documentationApi.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["docs"] }),
  });
  const upload = useMutation({
    mutationFn: (file: File) => documentationApi.upload(file, { title: file.name }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["docs"] }),
  });

  const onDownload = async (id: string, title: string) => {
    const blob = await documentationApi.download(id);
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = title;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <AppLayout>
      <PageHeader
        title="Documentation"
        description="Knowledge base: documents, categories, and versions."
        action={
          <div className="flex gap-2">
            <input ref={fileRef} type="file" hidden onChange={(e) => e.target.files?.[0] && upload.mutate(e.target.files[0])} />
            <button
              onClick={() => fileRef.current?.click()}
              className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm hover:bg-muted"
            >
              <Upload className="h-4 w-4" /> Upload
            </button>
            <AddItemButton
              label="New Doc"
              title="Create Document"
              description="Author a new document."
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
              fields={[
                { name: "title", label: "Title", required: true },
                { name: "content", label: "Content" },
                { name: "categoryId", label: "Category ID" },
              ]}
              onSubmit={async (v) => {
                await documentationApi.create({
                  title: v.title,
                  content: v.content,
                  categoryId: v.categoryId || undefined,
                  ownerId: user?.id ?? "",
                });
                qc.invalidateQueries({ queryKey: ["docs"] });
              }}
            />
          </div>
        }
      />

      <div className="mb-4 flex gap-3">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search documents..."
          className="flex-1 rounded-md border border-border bg-background px-3 py-2 text-sm"
        />
        <span className="self-center text-xs text-muted-foreground">
          {categories.data?.length ?? 0} categories
        </span>
      </div>

      <div className="rounded-xl border border-border bg-card">
        {docs.isLoading ? (
          <LoadingState />
        ) : docs.error ? (
          <ErrorState message={(docs.error as Error).message} />
        ) : !docs.data?.length ? (
          <EmptyState icon={<BookOpen className="h-6 w-6" />} title="No documents" description="Create or upload your first document" />
        ) : (
          <div className="divide-y divide-border">
            {docs.data.map((d) => (
              <div key={d.id} className="flex items-center justify-between px-4 py-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium">{d.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {d.mimeType ?? "text/markdown"} • updated {new Date(d.updatedAt).toLocaleString()}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => onDownload(d.id, d.title)} className="rounded-md border border-border p-1.5 hover:bg-muted" title="Download">
                    <Download className="h-4 w-4" />
                  </button>
                  <button onClick={() => del.mutate(d.id)} className="rounded-md border border-border p-1.5 text-destructive hover:bg-destructive/10" title="Delete">
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


import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/ui/page-header";
import { LoadingState } from "@/components/ui/loading-state";
import { ErrorState } from "@/components/ui/error-state";
import { EmptyState } from "@/components/ui/empty-state";
import { AddItemButton } from "@/components/ui/create-item-dialog";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { securityApi } from "@/lib/security";
import { KeyRound, Trash2, Eye } from "lucide-react";
import { useState } from "react";

export default function SecretsPage() {
  const qc = useQueryClient();
  const [revealed, setRevealed] = useState<Record<string, string>>({});
  const { data, isLoading, error } = useQuery({
    queryKey: ["security", "secrets"],
    queryFn: () => securityApi.listSecrets(),
  });
  const del = useMutation({
    mutationFn: (id: string) => securityApi.deleteSecret(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["security", "secrets"] }),
  });
  const reveal = useMutation({
    mutationFn: (id: string) => securityApi.revealSecret(id),
    onSuccess: (r) => setRevealed((prev) => ({ ...prev, [r.id]: r.value })),
  });

  return (
    <AppLayout>
      <PageHeader
        title="Secrets"
        description="Store and manage application secrets."
        action={
          <AddItemButton
            label="New Secret"
            title="Create Secret"
            description="Store a new secret value."
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            fields={[
              { name: "name", label: "Name", required: true },
              { name: "value", label: "Value", required: true },
              { name: "type", label: "Type", placeholder: "opaque | tls | docker" },
              { name: "namespace", label: "Namespace" },
              { name: "description", label: "Description" },
            ]}
            onSubmit={async (v) => {
              await securityApi.createSecret(v as { name: string; value: string });
              qc.invalidateQueries({ queryKey: ["security", "secrets"] });
            }}
          />
        }
      />

      <div className="rounded-xl border border-border bg-card">
        {isLoading ? (
          <LoadingState />
        ) : error ? (
          <ErrorState message={(error as Error).message} />
        ) : !data?.length ? (
          <EmptyState icon={<KeyRound className="h-6 w-6" />} title="No secrets" description="Create your first secret" />
        ) : (
          <div className="divide-y divide-border">
            {data.map((s) => (
              <div key={s.id} className="flex items-center justify-between px-4 py-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{s.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {s.type} • {s.namespace ?? "default"} {s.description ? `• ${s.description}` : ""}
                  </p>
                  {revealed[s.id] && (
                    <pre className="mt-1 max-w-full truncate rounded bg-muted px-2 py-1 text-xs">
                      {revealed[s.id]}
                    </pre>
                  )}
                </div>
                <div className="flex gap-2">
                  <button onClick={() => reveal.mutate(s.id)} className="rounded-md border border-border p-1.5 hover:bg-muted" title="Reveal">
                    <Eye className="h-4 w-4" />
                  </button>
                  <button onClick={() => del.mutate(s.id)} className="rounded-md border border-border p-1.5 text-destructive hover:bg-destructive/10" title="Delete">
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

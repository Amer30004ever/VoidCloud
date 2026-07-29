"use client";

import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@workspace/ui-kit/page-header";
import { LoadingState } from "@workspace/ui-kit/loading-state";
import { EmptyState } from "@workspace/ui-kit/empty-state";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { alertsApi } from "@/features/billing/alerts";
import { Inbox as InboxIcon, CheckCircle2 } from "lucide-react";

export default function InboxPage() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["alerts", "active"],
    queryFn: () => alertsApi.getActiveAlerts().then((r) => r.data),
  });
  const ack = useMutation({
    mutationFn: (id: string) => alertsApi.acknowledgeAlert(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["alerts"] }),
  });
  const resolve = useMutation({
    mutationFn: (id: string) => alertsApi.resolveAlert(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["alerts"] }),
  });

  return (
    <AppLayout>
      <PageHeader title="Inbox" description="Active alerts that require your attention." />

      <div className="rounded-xl border border-border bg-card">
        {isLoading ? (
          <LoadingState />
        ) : !data?.length ? (
          <EmptyState icon={<InboxIcon className="h-6 w-6" />} title="Inbox zero" description="No active alerts" />
        ) : (
          <div className="divide-y divide-border">
            {data.map((a) => (
              <div key={a.id} className="flex items-start justify-between px-4 py-3">
                <div>
                  <p className="text-sm font-medium">{a.ruleName}</p>
                  <p className="text-xs text-muted-foreground">{a.message}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {a.severity} • {new Date(a.firedAt).toLocaleString()}
                  </p>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => ack.mutate(a.id)} className="rounded-md border border-border px-2 py-1 text-xs hover:bg-muted">
                    Ack
                  </button>
                  <button
                    onClick={() => resolve.mutate(a.id)}
                    className="flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs hover:bg-muted"
                  >
                    <CheckCircle2 className="h-3 w-3" /> Resolve
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

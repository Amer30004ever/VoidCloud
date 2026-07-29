"use client";
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState } from "react";
import { auditApiClient } from "@/features/admin/audit";
import ActivityTimeline from "@/components/ui/activity-timeline";

export default function AdminAuditLogPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await auditApiClient.list({ limit: 100 });
      setLogs(data);
    } catch (e: any) {
      setError(e?.response?.data?.message ?? e?.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/set-state-in-effect

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Audit Log</h1>
        <button onClick={load} className="rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm hover:bg-white/10">
          Refresh
        </button>
      </div>

      {error && <p className="text-sm text-red-300">{error}</p>}

      <section className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl">
        <ActivityTimeline logs={logs} loading={loading} error={error} emptyMessage="No audit events yet." />
      </section>
    </div>
  );
}

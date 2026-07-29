/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { auditApiClient } from "@/features/admin/audit";
import ActivityTimeline from "@/components/ui/activity-timeline";

export default function AdminUserDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!id) return;
    setLoading(true);
    setError(null);
    auditApiClient
      .userLogs(id, 100)
      .then(setLogs)
      .catch((e: any) => setError(e?.response?.data?.message ?? e?.message))
      .finally(() => setLoading(false));
  }, [id]);
  /* eslint-enable react-hooks/set-state-in-effect */

  if (!id) return <p className="text-white/50">Missing user id.</p>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">User Activity</h1>
          <p className="mt-1 text-sm text-white/50">User ID: {id}</p>
        </div>
      </div>

      {error && <p className="text-sm text-red-300">{error}</p>}

      <section className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl">
        <h2 className="mb-4 text-lg font-semibold">Activity Timeline</h2>
        <ActivityTimeline
          logs={logs}
          loading={loading}
          emptyMessage="No activity recorded for this user yet."
        />
      </section>
    </div>
  );
}

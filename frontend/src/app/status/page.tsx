"use client";

import { useEffect, useState } from "react";
import api from "@/lib/api";

type Incident = {
  id: string;
  title: string;
  description: string;
  severity: string;
  status: string;
  createdAt: string;
  resolvedAt?: string;
  updates: Array<{ id: string; message: string; status: string; createdAt: string }>;
};

export default function PublicStatusPage() {
  const [data, setData] = useState<{ overall: string; incidents: Incident[] } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/monitoring/incidents/public").then((r) => setData(r.data)).catch(() => setData({ overall: "OPERATIONAL", incidents: [] })).finally(() => setLoading(false));
  }, []);

  const statusColor: Record<string, string> = {
    OPERATIONAL: "text-emerald-300",
    DEGRADED: "text-yellow-300",
    PARTIAL_OUTAGE: "text-orange-300",
    MAJOR_OUTAGE: "text-red-300",
  };

  const severityColor: Record<string, string> = {
    DEGRADED: "bg-yellow-500/20 text-yellow-300 border-yellow-500/30",
    PARTIAL_OUTAGE: "bg-orange-500/20 text-orange-300 border-orange-500/30",
    MAJOR_OUTAGE: "bg-red-500/20 text-red-300 border-red-500/30",
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-white">
        <div className="text-center">
          <div className="mb-4 h-8 w-8 animate-spin rounded-full border-2 border-cyan-400 border-t-transparent mx-auto" />
          <p className="text-sm text-white/60">Loading status...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950">
      <div className="mx-auto max-w-3xl px-4 py-16">
        <h1 className="text-3xl font-bold text-white">VoidCloud Status</h1>
        <p className="mt-2 text-sm text-white/60">Real-time platform status and incident history.</p>

        <div className="mt-8 rounded-2xl border border-white/10 bg-white/5 p-8 backdrop-blur-xl">
          <div className="text-center">
            <div className={`text-2xl font-bold ${statusColor[data?.overall || 'OPERATIONAL'] || 'text-emerald-300'}`}>
              {data?.overall || 'OPERATIONAL'}
            </div>
            <p className="mt-2 text-sm text-white/60">
              {data?.overall === 'OPERATIONAL' ? 'All systems operational.' : 'Some systems are experiencing issues.'}
            </p>
          </div>
        </div>

        <div className="mt-12">
          <h2 className="text-xl font-semibold text-white">Incident History</h2>
          <div className="mt-4 space-y-4">
            {data?.incidents?.length === 0 && (
              <p className="text-center text-white/50 py-8">No incidents reported.</p>
            )}
            {(data?.incidents || []).map((incident) => (
              <div key={incident.id} className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="font-semibold text-white">{incident.title}</h3>
                    <p className="mt-1 text-sm text-white/60">{incident.description}</p>
                  </div>
                  <span className={`shrink-0 rounded-full border px-3 py-1 text-xs ${severityColor[incident.severity] || 'bg-gray-500/20 text-gray-300'}`}>
                    {incident.severity}
                  </span>
                </div>

                {incident.updates?.length > 0 && (
                  <div className="mt-4 space-y-2">
                    {incident.updates.map((update) => (
                      <div key={update.id} className="rounded-lg border border-white/5 bg-white/5 p-3 text-sm">
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-white/50">{new Date(update.createdAt).toLocaleString()}</span>
                          <span className="text-xs text-cyan-300">{update.status}</span>
                        </div>
                        <p className="mt-1 text-white/80">{update.message}</p>
                      </div>
                    ))}
                  </div>
                )}

                <div className="mt-3 text-xs text-white/40">
                  {new Date(incident.createdAt).toLocaleString()} {incident.resolvedAt && `· Resolved ${new Date(incident.resolvedAt).toLocaleString()}`}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

"use client";

import api from "@/lib/api";
import { useEffect, useState } from "react";

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

export default function StatusPage() {
  const [data, setData] = useState<{ overall: string; incidents: Incident[] } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get("/monitoring/incidents/public")
      .then((r) => setData(r.data))
      .catch(() => setData({ overall: "OPERATIONAL", incidents: [] }))
      .finally(() => setLoading(false));
  }, []);

  const severityColor: Record<string, string> = {
    critical: "text-red-400",
    high: "text-orange-400",
    medium: "text-yellow-300",
    low: "text-emerald-300",
  };

  const overallColor: Record<string, string> = {
    OPERATIONAL: "text-emerald-300",
    DEGRADED: "text-yellow-300",
    PARTIAL_OUTAGE: "text-orange-300",
    MAJOR_OUTAGE: "text-red-400",
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-white">
        <p className="text-sm text-white/50">Loading status&hellip;</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-6 py-12">
      <h1 className="text-2xl font-bold text-white">System Status</h1>
      <p className="mt-2 text-sm text-white/50">
        Last updated: {new Date().toLocaleString()}
      </p>
      <div className="mt-6 rounded-lg border border-white/10 bg-slate-900/50 p-6">
        <p className="text-sm font-semibold text-white/70">Overall Status</p>
        <p className={`mt-1 text-lg font-bold ${overallColor[data?.overall ?? "OPERATIONAL"]}`}>
          {data?.overall ?? "OPERATIONAL"}
        </p>
      </div>
      <div className="mt-8 space-y-4">
        <h2 className="text-lg font-semibold text-white">Active Incidents</h2>
        {data?.incidents && data.incidents.length === 0 ? (
          <p className="text-sm text-white/50">No active incidents.</p>
        ) : (
          data?.incidents.map((incident) => (
            <div
              key={incident.id}
              className="rounded-lg border border-white/10 bg-slate-900/50 p-4"
            >
              <div className="flex items-center gap-2">
                <span className={`text-sm font-semibold ${severityColor[incident.severity]}`}>
                  {incident.severity.toUpperCase()}
                </span>
                <span className="text-sm text-white/50">{incident.status}</span>
              </div>
              <p className="mt-2 text-sm font-medium text-white">{incident.title}</p>
              <p className="mt-1 text-sm text-white/50">{incident.description}</p>
              {incident.updates.length > 0 && (
                <div className="mt-3 space-y-2">
                  {incident.updates.map((u) => (
                    <div key={u.id} className="flex items-start gap-2 text-sm">
                      <span className="mt-0.5 h-1.5 w-1.5 rounded-full bg-white/30" />
                      <span className="text-white/60">{u.message}</span>
                      <span className="text-white/30">{new Date(u.createdAt).toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
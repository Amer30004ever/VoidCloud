"use client";

import { useEffect, useState } from "react";
import api from "@/lib/api";

export default function AdminSecurityPage() {
  const [adoption, setAdoption] = useState<any[]>([]);
  const [alerts, setAlerts] = useState<any[]>([]);

  useEffect(() => {
    api.get("/monitoring/security/adoption").then((r) => setAdoption(r.data ?? [])).catch(() => setAdoption([]));
    api.get("/monitoring/security/alerts").then((r) => setAlerts(r.data ?? [])).catch(() => setAlerts([]));
  }, []);

  return (
    <div className="space-y-6">
      <h1 className="vc-h1">Security Overview</h1>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="vc-card p-6">
          <div className="text-sm text-white/60">WAF Enabled</div>
          <div className="mt-1 text-2xl font-bold">{adoption.filter((a) => a.wafEnabled).length}</div>
        </div>
        <div className="vc-card p-6">
          <div className="text-sm text-white/60">DDoS Advanced</div>
          <div className="mt-1 text-2xl font-bold">{adoption.filter((a) => a.ddosTier === 'advanced').length}</div>
        </div>
        <div className="vc-card p-6">
          <div className="text-sm text-white/60">FIM Enabled</div>
          <div className="mt-1 text-2xl font-bold">{adoption.filter((a) => a.fimEnabled).length}</div>
        </div>
      </div>

      <div className="vc-card p-6">
        <h2 className="text-lg font-semibold">FIM Alerts</h2>
        <div className="mt-4 space-y-2">
          {alerts.map((a) => (
            <div key={a.id} className="rounded-lg border border-white/5 bg-white/5 p-4 text-sm">
              <div className="font-medium">{a.vpsId} · {a.path}</div>
              <div className="text-xs text-white/60">{a.details} · {new Date(a.createdAt).toLocaleString()}</div>
            </div>
          ))}
          {alerts.length === 0 && <p className="text-center text-white/50 py-8">No FIM alerts.</p>}
        </div>
      </div>
    </div>
  );
}

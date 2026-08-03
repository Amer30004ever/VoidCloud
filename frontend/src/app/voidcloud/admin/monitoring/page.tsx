/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useState } from "react";
import { cloudApi, ServicesHealthSnapshot, MaintenanceState } from "@/features/vps/cloud";
import { WidgetBoundary } from "@workspace/ui-kit/widget-boundary";

export default function AdminMonitoringPage() {
  const [snap, setSnap] = useState<ServicesHealthSnapshot | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [maint, setMaint] = useState<MaintenanceState | null>(null);
  const [maintMsg, setMaintMsg] = useState("");
  const [maintBusy, setMaintBusy] = useState(false);

  async function poll() {
    setLoading(true);
    try {
      const s = await cloudApi.admin.servicesHealth();
      setSnap(s); setErr(null);
    } catch (e: any) {
      setErr(e?.response?.data?.message ?? e.message);
    } finally { setLoading(false); }
  }
  async function loadMaint() {
    try { const m = await cloudApi.admin.maintenance.get(); setMaint(m); setMaintMsg(m.message); } catch {}
  }
  useEffect(() => {
    poll(); loadMaint();
    const t = setInterval(poll, 30_000);
    return () => clearInterval(t);
  }, []);

  async function toggleMaint(enabled: boolean) {
    setMaintBusy(true);
    try {
      const m = await cloudApi.admin.maintenance.set({ enabled, message: maintMsg });
      setMaint(m);
    } finally { setMaintBusy(false); }
  }

  const bar = snap
    ? snap.healthPercent >= 90 ? "bg-emerald-500" : snap.healthPercent >= 60 ? "bg-yellow-500" : "bg-red-500"
    : "bg-white/20";

  return (
    <div className="space-y-6 p-6 text-white">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Platform Monitoring</h1>
          <p className="text-sm text-white/60">Auto-refreshes every 30 seconds. Probes all 13 microservices.</p>
        </div>
        <button onClick={poll} disabled={loading} className="rounded-xl border border-white/20 px-4 py-2 text-sm hover:bg-white/10 disabled:opacity-50">
          {loading ? "Pinging…" : "Refresh now"}
        </button>
      </div>

      {err && <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">Monitoring service unreachable: {err}</div>}

      {snap && (
        <WidgetBoundary title="Service health" className="space-y-6">

        <>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur">
            <div className="flex items-baseline justify-between">
              <div>
                <div className="text-xs uppercase tracking-wide text-white/60">Platform health</div>
                <div className="mt-1 text-5xl font-bold">{snap.healthPercent}%</div>
              </div>
              <div className="text-right text-sm text-white/70">
                <div><span className="text-emerald-300">{snap.up} up</span> · <span className="text-yellow-300">{snap.degraded} degraded</span> · <span className="text-red-300">{snap.down} down</span></div>
                <div className="text-xs text-white/50">Last check: {new Date(snap.checkedAt).toLocaleTimeString()}</div>
              </div>
            </div>
            <div className="mt-4 h-3 w-full overflow-hidden rounded-full bg-white/10">
              <div className={`h-full ${bar} transition-all`} style={{ width: `${snap.healthPercent}%` }} />
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {snap.services.map((s) => (
              <div key={s.name} className="rounded-xl border border-white/10 bg-white/5 p-4 backdrop-blur">
                <div className="flex items-center justify-between">
                  <div className="font-semibold capitalize">{s.name}</div>
                  <span className={`rounded-full px-2 py-0.5 text-xs ${
                    s.status === "UP" ? "bg-emerald-500/20 text-emerald-300"
                    : s.status === "DEGRADED" ? "bg-yellow-500/20 text-yellow-300"
                    : "bg-red-500/20 text-red-300"}`}>{s.status}</span>
                </div>
                <div className="mt-2 text-xs text-white/60">{s.url}</div>
                <div className="mt-2 flex justify-between text-xs">
                  <span className="text-white/60">Response</span>
                  <span className={s.responseTimeMs && s.responseTimeMs > 2000 ? "text-yellow-300" : "text-white/90"}>
                    {s.responseTimeMs != null ? `${s.responseTimeMs} ms` : "—"}
                  </span>
                </div>
                {s.error && <div className="mt-1 text-xs text-red-300">{s.error}</div>}
              </div>
            ))}
          </div>
        </>
        </WidgetBoundary>
      )}


      <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur">
        <h2 className="mb-3 text-lg font-semibold">Maintenance mode</h2>
        <p className="mb-3 text-sm text-white/60">Toggle a platform-wide banner. When enabled, all users see the message.</p>
        <textarea value={maintMsg} onChange={(e) => setMaintMsg(e.target.value)}
          placeholder="Scheduled maintenance in progress. Back in 15 minutes."
          className="mb-3 w-full rounded-lg border border-white/10 bg-slate-950/60 p-3 text-sm outline-none focus:border-cyan-400/50" rows={2} />
        <div className="flex items-center gap-3">
          <button disabled={maintBusy} onClick={() => toggleMaint(!(maint?.enabled))}
            className={`rounded-xl px-4 py-2 font-semibold ${maint?.enabled ? "bg-red-500 text-white" : "bg-emerald-500 text-slate-950"} disabled:opacity-50`}>
            {maint?.enabled ? "Disable maintenance mode" : "Enable maintenance mode"}
          </button>
          {maint && <span className="text-sm text-white/70">Current: <span className={maint.enabled ? "text-red-300" : "text-emerald-300"}>{maint.enabled ? "ON" : "OFF"}</span></span>}
        </div>
      </div>
    </div>
  );
}

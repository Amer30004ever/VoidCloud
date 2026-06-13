/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import { useEffect, useState } from "react";
import { cloudMigration, type MigrationTarget, type MigrationStorage, type MigrationRecord } from "@/lib/cloud";

export function VpsMigrationPanel({ vpsId }: { vpsId: string }) {
  const [nodes, setNodes] = useState<MigrationTarget[]>([]);
  const [storage, setStorage] = useState<MigrationStorage[]>([]);
  const [currentNode, setCurrentNode] = useState<string | null>(null);
  const [target, setTarget] = useState("");
  const [targetStorage, setTargetStorage] = useState("");
  const [scheduledFor, setScheduledFor] = useState("");
  const [history, setHistory] = useState<MigrationRecord[]>([]);
  const [active, setActive] = useState<{ id: string; progress: number; status: string; estimatedRemaining: number } | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function refresh() {
    try {
      const t = await cloudMigration.targets(vpsId);
      setNodes(t.nodes); setStorage(t.storage); setCurrentNode(t.current?.node ?? null);
    } catch { /* ignore */ }
    try { setHistory(await cloudMigration.history(vpsId)); } catch { /* ignore */ }
  }
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { refresh(); }, [vpsId]);
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => {
    if (!active || active.status !== "RUNNING") return;
    const t = setInterval(async () => {
      try {
        const s = await cloudMigration.status(active.id);
        setActive({ id: active.id, ...s });
        if (s.status !== "RUNNING") { await refresh(); }
      } catch { /* ignore */ }
    }, 2000);
    return () => clearInterval(t);
  }, [active?.id, active?.status]);

  async function start() {
    setErr(null); setBusy(true);
    try {
      const r = await cloudMigration.start(vpsId, target, targetStorage || undefined, scheduledFor || undefined);
      if (r.migrationId && !scheduledFor) {
        setActive({ id: r.migrationId, progress: 0, status: "RUNNING", estimatedRemaining: r.estimatedDowntime ?? 0 });
      }
      await refresh();
    } catch (e: any) {
      setErr(e?.response?.data?.message ?? e?.message ?? "Migration failed");
    }
    setBusy(false);
  }

  async function cancel() {
    if (!active) return;
    try { await cloudMigration.cancel(active.id); setActive(null); await refresh(); } catch { /* ignore */ }
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
        <p className="text-sm text-white/60">Current location: <span className="font-mono text-cyan-200">{currentNode ?? "unknown"}</span></p>
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/5 p-4 space-y-3">
        <h3 className="font-semibold">Migrate to another node</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-xs">
            <span className="mb-1 block text-white/50">Target node</span>
            <select className="w-full rounded-lg border border-white/10 bg-slate-950/60 px-3 py-2" value={target} onChange={(e) => setTarget(e.target.value)}>
              <option value="">Select node…</option>
              {nodes.map((n) => (
                <option key={n.name} value={n.name} disabled={!n.online}>
                  {n.name} — load {Math.round(n.currentLoad * 100)}% {n.online ? "" : "(offline)"}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs">
            <span className="mb-1 block text-white/50">Target storage (optional)</span>
            <select className="w-full rounded-lg border border-white/10 bg-slate-950/60 px-3 py-2" value={targetStorage} onChange={(e) => setTargetStorage(e.target.value)}>
              <option value="">Keep current</option>
              {storage.map((s) => (
                <option key={s.name} value={s.name}>
                  {s.name} — {Math.round(s.available / 1e9)} GB free / {Math.round(s.total / 1e9)} GB
                </option>
              ))}
            </select>
          </label>
        </div>
        <label className="block text-xs">
          <span className="mb-1 block text-white/50">Schedule for (leave empty to start now)</span>
          <input type="datetime-local" className="rounded-lg border border-white/10 bg-slate-950/60 px-3 py-2" value={scheduledFor} onChange={(e) => setScheduledFor(e.target.value)} />
        </label>
        <p className="text-xs text-white/50">Online migration keeps the VPS running; brief network blip (~few seconds) expected.</p>
        {err && <p className="text-sm text-red-300">{err}</p>}
        <button onClick={start} disabled={!target || busy} className="rounded-lg bg-gradient-to-r from-cyan-400 to-fuchsia-500 px-4 py-2 text-sm font-semibold text-slate-950 disabled:opacity-50">
          {busy ? "Starting…" : scheduledFor ? "Schedule migration" : "Start migration"}
        </button>
      </div>

      {active && (
        <div className="rounded-2xl border border-cyan-400/30 bg-cyan-400/5 p-4">
          <div className="flex items-center justify-between text-sm">
            <span>Migration <span className="font-mono text-cyan-200">{active.status}</span> — ~{active.estimatedRemaining}s remaining</span>
            {active.status === "RUNNING" && <button onClick={cancel} className="text-xs text-red-300 hover:underline">Cancel</button>}
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/10">
            <div className="h-full bg-gradient-to-r from-cyan-400 to-fuchsia-500 transition-all" style={{ width: `${active.progress}%` }} />
          </div>
        </div>
      )}

      <div className="rounded-2xl border border-white/10 bg-white/5">
        <div className="border-b border-white/5 p-3 text-sm font-semibold">Migration history</div>
        {history.length === 0 ? (
          <p className="p-6 text-center text-sm text-white/40">No previous migrations.</p>
        ) : (
          <table className="w-full text-xs">
            <thead className="text-left uppercase text-white/40">
              <tr><th className="p-2">When</th><th className="p-2">From</th><th className="p-2">To</th><th className="p-2">Status</th><th className="p-2">Notes</th></tr>
            </thead>
            <tbody>
              {history.map((h) => (
                <tr key={h.id} className="border-t border-white/5">
                  <td className="p-2 text-white/50">{new Date(h.createdAt).toLocaleString()}</td>
                  <td className="p-2 font-mono">{h.sourceNode}</td>
                  <td className="p-2 font-mono">{h.targetNode}</td>
                  <td className="p-2"><span className={`rounded px-2 py-0.5 ${h.status === "COMPLETED" ? "bg-emerald-500/20 text-emerald-300" : h.status === "FAILED" ? "bg-red-500/20 text-red-300" : "bg-white/10 text-white/60"}`}>{h.status}</span></td>
                  <td className="p-2 text-white/60">{h.errorMessage ?? (h.scheduledFor ? `Scheduled ${new Date(h.scheduledFor).toLocaleString()}` : "")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

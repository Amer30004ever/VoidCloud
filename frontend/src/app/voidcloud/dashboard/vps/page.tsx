"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { cloudApi, type CloudDeployment, type TenantQuota } from "@/features/vps/cloud";
import { VpsStatusBadge } from "@/features/vps/VpsStatusBadge";
import { useTrackPageView } from "@/hooks/useTrackPageView";
import { useToast } from "@/components/ui/Toast";
import { ErrorBoundary } from "@/components/ErrorBoundary";

type WithIp = CloudDeployment & { ipv4Address?: string };

function Gauge({ label, used, limit, unit }: { label: string; used: number; limit: number; unit: string }) {
  const pct = limit > 0 ? Math.min(100, (used / limit) * 100) : 0;
  const color = pct > 90 ? "from-red-500 to-orange-500" : pct > 70 ? "from-yellow-400 to-orange-500" : "from-cyan-400 to-fuchsia-500";
  return (
    <div className="rounded-lg border border-white/10 bg-white/5 p-4">
      <div className="text-xs uppercase text-white/50">{label}</div>
      <div className="mt-2 text-2xl font-bold">{used} / {limit} {unit}</div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
        <div className={`h-full bg-gradient-to-r ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export default function VpsListPage() {
  useTrackPageView();
  const { addToast } = useToast();
  const [items, setItems] = useState<WithIp[]>([]);
  const [quota, setQuota] = useState<TenantQuota | null>(null);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkAction, setBulkAction] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      cloudApi.deployments.list(),
      cloudApi.vps.quota().catch(() => null),
    ]).then(([d, q]) => {
      setItems(d as WithIp[]);
      setQuota(q);
    }).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!loading && items.length > 0) {
      addToast({ type: "info", title: "VPS list refreshed", message: `${items.length} instance(s) loaded.`, duration: 2000 });
    }
  }, [loading, items.length, addToast]);

  const toggleAll = () => {
    if (selected.size === items.length) setSelected(new Set());
    else setSelected(new Set(items.map((i) => i.id)));
  };

  const toggleOne = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const runBulk = async (action: "delete" | "stop" | "start" | "restart") => {
    if (!selected.size) return;
    setBulkAction(action);
    let ok = 0, fail = 0;
    for (const id of Array.from(selected)) {
      try {
        if (action === "delete") await cloudApi.deployments.remove(id);
        else if (action === "stop") await cloudApi.deployments.stop(id);
        else if (action === "start") await cloudApi.deployments.start(id);
        else if (action === "restart") await cloudApi.deployments.restart(id);
        ok++;
      } catch {
        fail++;
      }
    }
    addToast({ type: fail ? "warning" : "success", title: `Bulk ${action} complete`, message: `${ok} succeeded, ${fail} failed.` });
    setSelected(new Set());
    setBulkAction(null);
    setItems((prev) => prev.filter((i) => !selected.has(i.id)));
  };

  return (
    <ErrorBoundary>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-3xl font-bold">VPS Instances</h1>
        <Link href="/voidcloud/dashboard/vps/new" className="rounded-lg bg-gradient-to-r from-cyan-400 to-fuchsia-500 px-4 py-2 font-semibold text-slate-950">+ New VPS</Link>
      </div>

      {quota && (
        <div className="mb-6 rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl">
          <h2 className="mb-4 text-sm uppercase text-white/50">Resource quota</h2>
          <div className="grid gap-4 md:grid-cols-4">
            <Gauge label="VPS count" used={quota.currentVpsCount} limit={quota.maxVpsCount} unit="" />
            <Gauge label="CPU" used={quota.currentCpu} limit={quota.maxCpu} unit="cores" />
            <Gauge label="RAM" used={quota.currentRamMb} limit={quota.maxRamMb} unit="MB" />
            <Gauge label="Disk" used={quota.currentDiskGb} limit={quota.maxDiskGb} unit="GB" />
          </div>
        </div>
      )}

      {selected.size > 0 && (
        <div className="mb-4 flex flex-wrap items-center gap-2 rounded-xl border border-white/10 bg-white/5 p-3">
          <span className="text-xs text-white/60">{selected.size} selected</span>
          <button disabled={bulkAction === "stop"} onClick={() => runBulk("stop")} className="rounded-lg border border-yellow-500/40 px-3 py-1.5 text-xs text-yellow-300 hover:bg-yellow-500/10 disabled:opacity-50">{bulkAction === "stop" ? "Working…" : "Stop"}</button>
          <button disabled={bulkAction === "start"} onClick={() => runBulk("start")} className="rounded-lg border border-green-500/40 px-3 py-1.5 text-xs text-green-300 hover:bg-green-500/10 disabled:opacity-50">{bulkAction === "start" ? "Working…" : "Start"}</button>
          <button disabled={bulkAction === "restart"} onClick={() => runBulk("restart")} className="rounded-lg border border-cyan-500/40 px-3 py-1.5 text-xs text-cyan-300 hover:bg-cyan-500/10 disabled:opacity-50">{bulkAction === "restart" ? "Working…" : "Restart"}</button>
          <button disabled={bulkAction === "delete"} onClick={() => { if (!confirm(`Delete ${selected.size} VPS? This cannot be undone.`)) return; runBulk("delete"); }} className="rounded-lg border border-red-500/30 px-3 py-1.5 text-xs text-red-300 hover:bg-red-500/10 disabled:opacity-50">{bulkAction === "delete" ? "Working…" : "Delete"}</button>
          <button onClick={() => setSelected(new Set())} className="rounded-lg border border-white/10 px-3 py-1.5 text-xs hover:bg-white/10">Cancel</button>
        </div>
      )}

      <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl">
        {loading ? <p className="p-6 text-white/50">Loading…</p>
          : items.length === 0 ? <p className="p-12 text-center text-white/50">No VPS instances yet.</p>
          : (
            <table className="w-full text-sm">
              <thead className="border-b border-white/5 text-left text-xs uppercase text-white/40">
                <tr>
                  <th className="w-10 px-3"><input type="checkbox" checked={selected.size === items.length && items.length > 0} onChange={toggleAll} className="rounded border-border" aria-label="Select all" /></th>
                  <th className="p-4">Name</th><th>IP Address</th><th>Resources</th><th>Status</th><th></th>
                </tr>
              </thead>
              <tbody>
                {items.map((d) => (
                  <tr key={d.id} className={`border-b border-white/5 hover:bg-white/5 ${selected.has(d.id) ? "bg-primary/5" : ""}`}>
                    <td className="px-3"><input type="checkbox" checked={selected.has(d.id)} onChange={() => toggleOne(d.id)} className="rounded border-border" aria-label={`Select ${d.name}`} /></td>
                    <td className="p-4 font-medium">{d.name}</td>
                    <td className="font-mono text-cyan-300">{d.ipv4Address ?? "—"}</td>
                    <td className="text-white/60">{d.cpu} CPU · {d.memory}MB · {Math.ceil(d.storage/1024)}GB</td>
                    <td><VpsStatusBadge status={d.status} /></td>
                    <td className="p-4"><Link href={`/voidcloud/dashboard/vps/${d.id}`} className="text-cyan-300 hover:underline">Open →</Link></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
      </div>
    </ErrorBoundary>
  );
}

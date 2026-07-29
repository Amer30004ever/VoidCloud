/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { cloudApi, cloudBackups, type VpsBackup, type CloudDeployment } from "@/features/vps/cloud";

export default function GlobalBackupsPage() {
  const [list, setList] = useState<VpsBackup[]>([]);
  const [vpsList, setVpsList] = useState<CloudDeployment[]>([]);
  const [vpsId, setVpsId] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [msg, setMsg] = useState("");

  const refresh = useCallback(async () => {
    const b = await cloudBackups.listAll({ vpsId: vpsId || undefined, from: from || undefined, to: to || undefined });
    setList(b); setSelected(new Set());
  }, [vpsId, from, to]);
  useEffect(() => { cloudApi.deployments.list().then(setVpsList).catch(() => { }); }, []);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refresh().catch(() => { });
  }, [refresh]);

  function toggle(id: string) {
    const n = new Set(selected);
    if (n.has(id)) {
      n.delete(id);
    } else {
      n.add(id);
    }
    setSelected(n);
  }

  async function batchDelete() {
    if (!selected.size || !confirm(`Delete ${selected.size} backup(s)?`)) return;
    try { await cloudBackups.removeBatch([...selected]); setMsg(`Deleted ${selected.size}`); await refresh(); }
    catch (e: any) { setMsg(e?.response?.data?.message ?? "Failed"); }
  }

  const input = "rounded-lg border border-white/10 bg-slate-950/60 px-3 py-2 text-sm outline-none focus:border-cyan-400/50";

  return (
    <div>
      <h1 className="mb-6 text-3xl font-bold">Backups</h1>
      {msg && <div className="mb-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-2 text-xs text-emerald-200">{msg}</div>}

      <div className="mb-4 flex flex-wrap gap-2">
        <select className={input} value={vpsId} onChange={(e) => setVpsId(e.target.value)}>
          <option value="">All VPS</option>
          {vpsList.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
        </select>
        <input className={input} type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        <input className={input} type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        <button className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm hover:bg-white/10" onClick={refresh}>Refresh</button>
        <button disabled={!selected.size} onClick={batchDelete} className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300 hover:bg-red-500/20 disabled:opacity-40">Delete selected ({selected.size})</button>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl">
        <table className="w-full text-sm">
          <thead className="text-left text-xs uppercase text-white/50">
            <tr><th className="p-3"></th><th>Name</th><th>VPS</th><th>Type</th><th>Size</th><th>Status</th><th>Created</th><th className="text-right pr-3">Actions</th></tr>
          </thead>
          <tbody>
            {list.length === 0 && <tr><td colSpan={8} className="p-6 text-center text-white/50">No backups found.</td></tr>}
            {list.map((b) => (
              <tr key={b.id} className="border-t border-white/5">
                <td className="p-3"><input type="checkbox" checked={selected.has(b.id)} onChange={() => toggle(b.id)} /></td>
                <td className="font-mono">{b.name || b.id.slice(0, 8)}</td>
                <td><Link href={`/voidcloud/dashboard/vps/${b.deploymentId}`} className="text-cyan-300 hover:underline">{b.deployment?.name ?? b.deploymentId.slice(0, 8)}</Link></td>
                <td><span className="rounded bg-white/10 px-2 py-0.5 text-xs">{b.type}</span></td>
                <td>{b.sizeMB} MB</td>
                <td className={b.status === "COMPLETED" ? "text-emerald-300" : b.status === "FAILED" ? "text-red-300" : "text-amber-300"}>{b.status}</td>
                <td className="text-xs text-white/60">{new Date(b.createdAt).toLocaleString()}</td>
                <td className="pr-3 text-right">
                  <button className="rounded-lg border border-red-500/30 bg-red-500/10 px-2 py-1 text-xs text-red-300" onClick={async () => { if (confirm("Delete this backup?")) { await cloudBackups.remove(b.id); refresh(); } }}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

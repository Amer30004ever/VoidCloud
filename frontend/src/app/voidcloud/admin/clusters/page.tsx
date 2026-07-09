/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useCallback, useEffect, useState } from "react";
import { cloudApi, ProxmoxClusterRow, ClusterInput } from "@/lib/cloud";

const EMPTY: ClusterInput = { name: "", host: "", port: 8006, username: "root@pam", tokenId: "", tokenSecret: "" };

function fmtMB(mb: number) { return mb >= 1024 ? `${(mb / 1024).toFixed(1)} GB` : `${mb} MB`; }
function fmtGB(gb: number) { return gb >= 1024 ? `${(gb / 1024).toFixed(2)} TB` : `${gb} GB`; }

export default function AdminClustersPage() {
  const [rows, setRows] = useState<ProxmoxClusterRow[]>([]);
  const [creating, setCreating] = useState(false);
  const [draft, setDraft] = useState<ClusterInput>(EMPTY);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [scheduler, setScheduler] = useState({ cpu: 2, ramMB: 2048, diskGB: 20 });
  const [scheduled, setScheduled] = useState<any>(null);

  const load = useCallback(async () => {
    try { setRows(await cloudApi.admin.clusters.list()); } catch (e: any) { setMsg(e?.response?.data?.message ?? e.message); }
  }, []);
  useEffect(() => { load(); }, [load]);

  async function save() {
    if (!draft.name || !draft.host) { setMsg("Name and host are required"); return; }
    try {
      await cloudApi.admin.clusters.create(draft);
      setDraft(EMPTY); setCreating(false); setMsg("Cluster added");
      load();
    } catch (e: any) { setMsg(e?.response?.data?.message ?? e.message); }
  }
  async function testCluster(id: string) {
    setBusyId(id); setMsg(null);
    try {
      const r = await cloudApi.admin.clusters.test(id);
      setMsg(r.ok ? "Connection OK, metrics refreshed" : `Failed: ${r.error}`);
      load();
    } finally { setBusyId(null); }
  }
  async function remove(id: string, name: string) {
    if (!confirm(`Remove Proxmox cluster "${name}"?`)) return;
    await cloudApi.admin.clusters.remove(id); load();
  }
  async function runSchedule() {
    setMsg(null);
    try {
      const r = await cloudApi.admin.clusters.schedule(scheduler);
      setScheduled(r);
    } catch (e: any) { setMsg(e?.response?.data?.message ?? e.message); }
  }

  return (
    <div className="space-y-6 p-6 text-white">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Proxmox Clusters</h1>
          <p className="text-sm text-white/60">Register additional Proxmox hosts. New VPS scheduling picks the least-loaded cluster with enough free capacity.</p>
        </div>
        <button onClick={() => setCreating((v) => !v)} className="rounded-xl bg-gradient-to-r from-cyan-400 to-fuchsia-500 px-4 py-2 font-semibold text-slate-950">
          {creating ? "Cancel" : "+ Add cluster"}
        </button>
      </div>

      {msg && <div className="rounded-lg border border-cyan-400/30 bg-cyan-400/10 p-3 text-sm">{msg}</div>}

      {creating && (
        <div className="grid gap-3 rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur md:grid-cols-2">
          <Input label="Name" value={draft.name} onChange={(v) => setDraft({ ...draft, name: v })} placeholder="pve-eg-1" />
          <Input label="Host" value={draft.host} onChange={(v) => setDraft({ ...draft, host: v })} placeholder="10.0.0.10" />
          <Input label="Port" value={String(draft.port ?? 8006)} onChange={(v) => setDraft({ ...draft, port: Number(v) || 8006 })} />
          <Input label="Username" value={draft.username ?? ""} onChange={(v) => setDraft({ ...draft, username: v })} placeholder="root@pam" />
          <Input label="Token ID" value={draft.tokenId ?? ""} onChange={(v) => setDraft({ ...draft, tokenId: v })} placeholder="voidcloud@pve!api" />
          <Input label="Token secret" value={draft.tokenSecret ?? ""} onChange={(v) => setDraft({ ...draft, tokenSecret: v })} placeholder="uuid-secret" type="password" />
          <div className="md:col-span-2 flex justify-end">
            <button onClick={save} className="rounded-xl bg-cyan-500 px-4 py-2 font-semibold text-slate-950">Save cluster</button>
          </div>
        </div>
      )}

      <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/5 backdrop-blur">
        <table className="w-full text-sm">
          <thead className="bg-white/5 text-xs uppercase tracking-wide text-white/60">
            <tr>
              <th className="px-4 py-3 text-left">Name</th>
              <th className="px-4 py-3 text-left">Host</th>
              <th className="px-4 py-3 text-left">Status</th>
              <th className="px-4 py-3 text-left">Nodes</th>
              <th className="px-4 py-3 text-left">CPU free</th>
              <th className="px-4 py-3 text-left">RAM free</th>
              <th className="px-4 py-3 text-left">Disk free</th>
              <th className="px-4 py-3 text-left">VMs</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr><td colSpan={9} className="px-4 py-8 text-center text-white/50">No clusters registered.</td></tr>
            )}
            {rows.map((r) => (
              <tr key={r.id} className="border-t border-white/5">
                <td className="px-4 py-3 font-medium">{r.name}</td>
                <td className="px-4 py-3 text-white/80">{r.host}:{r.port}</td>
                <td className="px-4 py-3">
                  <span className={`rounded-full px-2 py-0.5 text-xs ${r.status === "ACTIVE" ? "bg-emerald-500/20 text-emerald-300" : r.status === "UNREACHABLE" ? "bg-red-500/20 text-red-300" : "bg-yellow-500/20 text-yellow-300"}`}>{r.status}</span>
                </td>
                <td className="px-4 py-3">{r.nodeCount}</td>
                <td className="px-4 py-3">{r.freeCpu}/{r.cpuTotal}</td>
                <td className="px-4 py-3">{fmtMB(r.freeRamMB)}/{fmtMB(r.ramTotal)}</td>
                <td className="px-4 py-3">{fmtGB(r.freeDiskGB)}/{fmtGB(r.diskTotal)}</td>
                <td className="px-4 py-3">{r.vmCount}</td>
                <td className="px-4 py-3 text-right">
                  <button disabled={busyId === r.id} onClick={() => testCluster(r.id)} className="mr-2 rounded-lg border border-white/20 px-3 py-1 text-xs hover:bg-white/10 disabled:opacity-50">
                    {busyId === r.id ? "Testing…" : "Test & refresh"}
                  </button>
                  <button onClick={() => remove(r.id, r.name)} className="rounded-lg border border-red-500/30 px-3 py-1 text-xs text-red-300 hover:bg-red-500/10">Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur">
        <h2 className="mb-3 text-lg font-semibold">Smart scheduler preview</h2>
        <p className="mb-3 text-sm text-white/60">Dry-run: which cluster would be picked for a given VPS size?</p>
        <div className="grid gap-3 md:grid-cols-4">
          <Input label="CPU cores" value={String(scheduler.cpu)} onChange={(v) => setScheduler({ ...scheduler, cpu: Number(v) || 1 })} />
          <Input label="RAM (MB)" value={String(scheduler.ramMB)} onChange={(v) => setScheduler({ ...scheduler, ramMB: Number(v) || 512 })} />
          <Input label="Disk (GB)" value={String(scheduler.diskGB)} onChange={(v) => setScheduler({ ...scheduler, diskGB: Number(v) || 10 })} />
          <div className="flex items-end">
            <button onClick={runSchedule} className="w-full rounded-xl bg-fuchsia-500 px-4 py-2 font-semibold text-white">Run scheduler</button>
          </div>
        </div>
        {scheduled && (
          <div className="mt-3 rounded-lg border border-white/10 bg-slate-950/60 p-3 text-sm">
            {scheduled.chosen ? (
              <>Chosen: <span className="font-semibold text-cyan-300">{scheduled.chosen.name}</span> ({scheduled.chosen.host}) — {scheduled.candidates} candidate cluster(s)</>
            ) : (
              <span className="text-red-300">No cluster fits: {scheduled.reason ?? "unknown"}</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function Input({ label, value, onChange, type = "text", placeholder }: { label: string; value: string; onChange: (v: string) => void; type?: string; placeholder?: string }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs uppercase tracking-wide text-white/60">{label}</span>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
        className="w-full rounded-lg border border-white/10 bg-slate-950/60 px-3 py-2 outline-none focus:border-cyan-400/50" />
    </label>
  );
}

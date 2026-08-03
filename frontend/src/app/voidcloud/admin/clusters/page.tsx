/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useCallback, useEffect, useState, useMemo } from "react";
import { cloudApi, ProxmoxClusterRow, ClusterInput } from "@/features/vps/cloud";
import { useToast } from "@/components/ui/Toast";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { CapacityBar } from "@/components/ui/CapacityBar";

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
  const { addToast } = useToast();
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const load = useCallback(async () => {
    try {
      const data = await cloudApi.admin.clusters.list();
      setRows(data);
      setLastUpdated(new Date());
    } catch (e: any) { setMsg(e?.response?.data?.message ?? e.message); }
  }, []);
  useEffect(() => { load(); }, [load]);

  async function save() {
    if (!draft.name || !draft.host) { setMsg("Name and host are required"); return; }
    try {
      await cloudApi.admin.clusters.create(draft);
      setDraft(EMPTY); setCreating(false); setMsg("Cluster added");
      load();
      addToast({ type: "success", title: "Cluster created", message: `${draft.name} registered successfully.` });
    } catch (e: any) { setMsg(e?.response?.data?.message ?? e.message); }
  }
  async function testCluster(id: string) {
    setBusyId(id); setMsg(null);
    try {
      const r = await cloudApi.admin.clusters.test(id);
      setMsg(r.ok ? "Connection OK, metrics refreshed" : `Failed: ${r.error}`);
      load();
      addToast({ type: r.ok ? "success" : "error", title: r.ok ? "Connection OK" : "Connection failed", message: r.error });
    } finally { setBusyId(null); }
  }
  async function disable(id: string, name: string) {
    const oldStatus = rows.find((r) => r.id === id)?.status;
    if (!confirm(`Disable cluster "${name}"?\nExisting VMs and history stay intact; the scheduler will stop placing new VMs here. You can re-enable at any time.\n\nCurrent status: ${oldStatus}`)) return;
    try { await cloudApi.admin.clusters.disable(id); setMsg(`Cluster "${name}" disabled`); load(); addToast({ type: "success", title: "Cluster disabled", message: `${name} removed from scheduler.` }); }
    catch (e: any) { setMsg(e?.response?.data?.message ?? e.message); }
  }
  async function enable(id: string, name: string) {
    try { await cloudApi.admin.clusters.enable(id); setMsg(`Cluster "${name}" re-enabled`); load(); addToast({ type: "success", title: "Cluster enabled", message: `${name} is back in the scheduler pool.` }); }
    catch (e: any) { setMsg(e?.response?.data?.message ?? e.message); }
  }
  async function remove(id: string, name: string) {
    const row = rows.find((r) => r.id === id);
    const vmCount = row?.vmCount ?? 0;
    if (!confirm(`PERMANENTLY delete cluster "${name}"?\nThis drops the cluster registry row (existing VMs keep their history but lose their cluster link). Prefer Disable for reversible removal.\n\nActive VMs: ${vmCount}`)) return;
    try {
      await cloudApi.admin.clusters.remove(id);
      setMsg(`Cluster "${name}" deleted`); load();
      addToast({ type: "success", title: "Cluster deleted", message: `${name} has been removed.` });
    } catch (e: any) {
      const m = e?.response?.data?.message ?? e.message;
      if (/active VPS deployment/i.test(String(m))) {
        const confirmName = prompt(`${m}\n\nType the cluster name to force-delete:`);
        if (!confirmName) return;
        try {
          await cloudApi.admin.clusters.remove(id, { force: true, confirmName });
          setMsg(`Cluster "${name}" force-deleted`); load();
          addToast({ type: "success", title: "Cluster force-deleted", message: `${name} removed with force.` });
        } catch (e2: any) { setMsg(e2?.response?.data?.message ?? e2.message); }
      } else { setMsg(m); }
    }
  }
  async function runSchedule() {
    setMsg(null);
    try {
      const r = await cloudApi.admin.clusters.schedule(scheduler);
      setScheduled(r);
      if (r.chosen) addToast({ type: "success", title: "Scheduler ran", message: `Chosen: ${r.chosen.name} (${r.candidates} candidates)` });
      else addToast({ type: "warning", title: "No fit", message: r.reason ?? "unknown" });
    } catch (e: any) { setMsg(e?.response?.data?.message ?? e.message); }
  }

  return (
    <ErrorBoundary>
      <div className="space-y-6 p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Proxmox Clusters</h1>
            <p className="text-sm text-white/60">Register additional Proxmox hosts. New VPS scheduling picks the least-loaded cluster with enough free capacity.</p>
            {lastUpdated && <p className="text-xs text-white/40 mt-1">Last updated: {lastUpdated.toLocaleTimeString()}</p>}
          </div>
          <button onClick={() => setCreating((v) => !v)} className="vc-btn vc-btn-primary">
            {creating ? "Cancel" : "+ Add cluster"}
          </button>
        </div>

        {msg && <div className="rounded-lg border border-cyan-400/30 bg-cyan-400/10 p-3 text-sm">{msg}</div>}

        {creating && (
          <div className="grid gap-3 vc-card p-4 md:grid-cols-2">
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

        <div className="overflow-hidden vc-card">
          <table className="w-full text-sm">
            <thead className="vc-label bg-white/5">
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
                  <td className="px-4 py-3"><CapacityBar used={r.freeCpu} total={r.cpuTotal} label="CPU" /></td>
                  <td className="px-4 py-3"><CapacityBar used={r.freeRamMB} total={r.ramTotal} label="RAM" format={fmtMB} /></td>
                  <td className="px-4 py-3"><CapacityBar used={r.freeDiskGB} total={r.diskTotal} label="Disk" format={fmtGB} /></td>
                  <td className="px-4 py-3">{r.vmCount}</td>
                  <td className="px-4 py-3 text-right space-x-2">
                    <button disabled={busyId === r.id} onClick={() => testCluster(r.id)} className="rounded-lg border border-white/20 px-3 py-1 text-xs hover:bg-white/10 disabled:opacity-50">
                      {busyId === r.id ? "Testing…" : "Test"}
                    </button>
                    {r.status === "DISABLED" ? (
                      <button onClick={() => enable(r.id, r.name)} className="rounded-lg border border-emerald-500/40 px-3 py-1 text-xs text-emerald-300 hover:bg-emerald-500/10">Enable</button>
                    ) : (
                      <button onClick={() => disable(r.id, r.name)} title="Stop scheduling new VMs here. Existing VMs untouched." className="rounded-lg border border-yellow-500/40 px-3 py-1 text-xs text-yellow-300 hover:bg-yellow-500/10">Disable</button>
                    )}
                    <button onClick={() => remove(r.id, r.name)} title="Permanently drop the cluster row" className="rounded-lg border border-red-500/30 px-3 py-1 text-xs text-red-300 hover:bg-red-500/10">Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="vc-card p-4">
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
    </ErrorBoundary>
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

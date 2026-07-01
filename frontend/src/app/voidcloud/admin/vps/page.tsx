"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";

interface ProxmoxVm {
  vmid: number;
  name: string;
  status: "running" | "stopped" | "paused";
  cpus: number;
  maxmem: number;
  maxdisk: number;
  uptime: number;
  node?: string;
}

interface ClusterConfig {
  id: string;
  name: string;
  node: string;
}

function fmtBytes(b: number) {
  if (b >= 1073741824) return `${(b / 1073741824).toFixed(1)} GB`;
  if (b >= 1048576) return `${(b / 1048576).toFixed(0)} MB`;
  return `${b} B`;
}

function fmtUptime(s: number) {
  if (!s) return "—";
  const d = Math.floor(s / 86400), h = Math.floor((s % 86400) / 3600), m = Math.floor((s % 3600) / 60);
  return d > 0 ? `${d}d ${h}h` : h > 0 ? `${h}h ${m}m` : `${m}m`;
}

function StatusChip({ s }: { s: string }) {
  const c = s === "running" ? "bg-emerald-500/10 text-emerald-300" : s === "stopped" ? "bg-slate-500/10 text-slate-400" : "bg-amber-500/10 text-amber-300";
  return <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${c}`}>
    <span className={`h-1.5 w-1.5 rounded-full ${s === "running" ? "bg-emerald-400 animate-pulse" : s === "stopped" ? "bg-slate-500" : "bg-amber-400"}`} />
    {s}
  </span>;
}

const DEFAULT_CLUSTERS: ClusterConfig[] = [
  { id: "default", name: "Primary Cluster", node: "proxmox" },
];

export default function AdminVpsPage() {
  const [clusters] = useState<ClusterConfig[]>(() => {
    if (typeof window === "undefined") return DEFAULT_CLUSTERS;
    try { return JSON.parse(localStorage.getItem("proxmox_clusters") ?? "null") ?? DEFAULT_CLUSTERS; } catch { return DEFAULT_CLUSTERS; }
  });
  const [selectedCluster, setSelectedCluster] = useState(clusters[0]?.id ?? "default");
  const [vms, setVms] = useState<ProxmoxVm[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionVm, setActionVm] = useState<number | null>(null);
  const [search, setSearch] = useState("");

  const cluster = clusters.find((c) => c.id === selectedCluster) ?? clusters[0];

  const fetchVms = useCallback(async () => {
    if (!cluster) return;
    setLoading(true); setError(null);
    try {
      const res = await fetch(`/api/proxmox/nodes/${cluster.node}/qemu`);
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? "Proxmox error");
      setVms((json?.data ?? []).sort((a: ProxmoxVm, b: ProxmoxVm) => a.vmid - b.vmid));
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally { setLoading(false); }
  }, [cluster]);

  useEffect(() => { fetchVms(); }, [fetchVms]);

  async function vmAction(vmid: number, action: "start" | "stop" | "reboot" | "reset") {
    setActionVm(vmid);
    await fetch(`/api/proxmox/nodes/${cluster?.node}/qemu/${vmid}/status/${action}`, { method: "POST" });
    await new Promise((r) => setTimeout(r, 2000));
    await fetchVms();
    setActionVm(null);
  }

  const filtered = vms.filter((v) =>
    !search || v.name?.toLowerCase().includes(search.toLowerCase()) || String(v.vmid).includes(search)
  );
  const running = vms.filter((v) => v.status === "running").length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white">VPS Instances <span className="text-white/30">— All Clusters</span></h1>
          <p className="mt-1 text-sm text-white/40">{vms.length} VMs · {running} running · Proxmox cluster view</p>
        </div>
        <div className="flex items-center gap-2">
          <select value={selectedCluster} onChange={(e) => setSelectedCluster(e.target.value)} className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white">
            {clusters.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search VMs…" className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-white/30 outline-none focus:border-red-400/50" />
          <Link href="/voidcloud/admin/settings" className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/60 hover:text-white">+ Cluster</Link>
        </div>
      </div>

      {error && <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-300">⚠ {error} <button onClick={fetchVms} className="ml-2 underline">Retry</button></div>}

      <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/5">
        {loading ? (
          <div className="space-y-0.5 p-3">{[1,2,3,4,5].map((i) => <div key={i} className="h-16 animate-pulse rounded-xl bg-white/5" />)}</div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-sm text-white/50">No VMs found</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-white/5">
              <tr className="text-[11px] uppercase tracking-wider text-white/30">
                <th className="px-5 py-3 text-left">VMID · Name</th>
                <th className="py-3">Status</th>
                <th className="hidden py-3 md:table-cell">CPU</th>
                <th className="hidden py-3 md:table-cell">Memory</th>
                <th className="hidden py-3 lg:table-cell">Disk</th>
                <th className="hidden py-3 lg:table-cell">Uptime</th>
                <th className="py-3 pr-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((vm) => (
                <tr key={vm.vmid} className="border-t border-white/5 hover:bg-white/[0.03]">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-white/5 text-lg">🖥️</div>
                      <div>
                        <p className="font-semibold text-white">{vm.name ?? `VM ${vm.vmid}`}</p>
                        <p className="text-xs text-white/30">ID: {vm.vmid}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-4"><StatusChip s={vm.status} /></td>
                  <td className="hidden py-4 text-xs text-white/50 md:table-cell">{vm.cpus ?? "—"} vCPU</td>
                  <td className="hidden py-4 text-xs text-white/50 md:table-cell">{vm.maxmem ? fmtBytes(vm.maxmem) : "—"}</td>
                  <td className="hidden py-4 text-xs text-white/50 lg:table-cell">{vm.maxdisk ? fmtBytes(vm.maxdisk) : "—"}</td>
                  <td className="hidden py-4 text-xs text-white/40 lg:table-cell">{fmtUptime(vm.uptime)}</td>
                  <td className="py-4 pr-5 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      {actionVm === vm.vmid ? (
                        <span className="text-xs text-white/30">…</span>
                      ) : (
                        <>
                          {vm.status === "stopped" && <button onClick={() => vmAction(vm.vmid, "start")} className="rounded-lg bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-400 hover:bg-emerald-500/20">Start</button>}
                          {vm.status === "running" && <>
                            <button onClick={() => vmAction(vm.vmid, "reboot")} className="rounded-lg bg-amber-500/10 px-2.5 py-1 text-xs font-medium text-amber-400 hover:bg-amber-500/20">Reboot</button>
                            <button onClick={() => vmAction(vm.vmid, "stop")} className="rounded-lg bg-red-500/10 px-2.5 py-1 text-xs font-medium text-red-400 hover:bg-red-500/20">Stop</button>
                          </>}
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

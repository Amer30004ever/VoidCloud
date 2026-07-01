"use client";

import { useEffect, useState, useCallback } from "react";

/* ── Types ─────────────────────────────────────────────────────── */
interface ProxmoxCluster {
  id: string;
  name: string;
  host: string;
  port: number;
  tokenId: string;
  tokenSecret: string;
  node: string;
  storage: string;
  bridge: string;
  gateway: string;
  isDefault: boolean;
  addedAt: string;
}

interface ClusterResources {
  cpu: { used: number; total: number };
  memory: { used: number; total: number };
  disk: { used: number; total: number };
  vms: { running: number; total: number };
  version?: string;
  status: "online" | "offline" | "fetching";
}

interface SchedulerResult {
  clusterId: string;
  clusterName: string;
  reason: string;
  score: number;
  cpuFree: number;
  memFreeGB: number;
  diskFreeGB: number;
}

const STORAGE_KEY = "proxmox_clusters";
const DEFAULT_CLUSTER: ProxmoxCluster = {
  id: "primary", name: "Primary Cluster", host: "10.51.100.10", port: 8006,
  tokenId: "root@pam!Amer-Cloud", tokenSecret: "",
  node: "proxmox", storage: "raid-vms", bridge: "vmbr1", gateway: "10.51.100.1",
  isDefault: true, addedAt: new Date().toISOString(),
};

/* ── Helpers ────────────────────────────────────────────────────── */
function loadClusters(): ProxmoxCluster[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /**/ }
  return [DEFAULT_CLUSTER];
}
function saveClusters(clusters: ProxmoxCluster[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(clusters));
}

function fmtGB(bytes: number) { return (bytes / 1073741824).toFixed(1) + " GB"; }
function pct(used: number, total: number) { return total === 0 ? 0 : Math.round((used / total) * 100); }

function ResourceBar({ label, used, total, fmt }: { label: string; used: number; total: number; fmt: (n: number) => string }) {
  const p = pct(used, total);
  const color = p < 60 ? "from-emerald-500 to-teal-500" : p < 80 ? "from-amber-500 to-yellow-500" : "from-red-500 to-orange-500";
  return (
    <div>
      <div className="mb-1 flex justify-between text-xs text-white/50">
        <span>{label}</span>
        <span>{fmt(used)} / {fmt(total)} <span className="text-white/30">({p}%)</span></span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-white/10">
        <div className={`h-full rounded-full bg-gradient-to-r ${color} transition-all duration-700`} style={{ width: `${p}%` }} />
      </div>
    </div>
  );
}

const EMPTY_FORM: Omit<ProxmoxCluster, "id" | "addedAt" | "isDefault"> = {
  name: "", host: "", port: 8006, tokenId: "", tokenSecret: "",
  node: "pve", storage: "local-lvm", bridge: "vmbr0", gateway: "",
};

/* ── Main page ──────────────────────────────────────────────────── */
export default function ClustersPage() {
  const [clusters, setClusters] = useState<ProxmoxCluster[]>([]);
  const [resources, setResources] = useState<Record<string, ClusterResources>>({});
  const [showAdd, setShowAdd] = useState(false);
  const [editCluster, setEditCluster] = useState<ProxmoxCluster | null>(null);
  const [form, setForm] = useState<Omit<ProxmoxCluster, "id" | "addedAt" | "isDefault">>(EMPTY_FORM);
  const [testing, setTesting] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<Record<string, { ok: boolean; msg: string }>>({});
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [scheduler, setScheduler] = useState<SchedulerResult | null>(null);
  const [schedulerVmCpu, setSchedulerVmCpu] = useState(2);
  const [schedulerVmMem, setSchedulerVmMem] = useState(4096);
  const [schedulerVmDisk, setSchedulerVmDisk] = useState(50);

  useEffect(() => { setClusters(loadClusters()); }, []);

  /* Fetch resources for a single cluster */
  const fetchClusterResources = useCallback(async (cluster: ProxmoxCluster) => {
    setResources((r) => ({ ...r, [cluster.id]: { ...r[cluster.id] ?? { cpu: { used: 0, total: 0 }, memory: { used: 0, total: 0 }, disk: { used: 0, total: 0 }, vms: { running: 0, total: 0 } }, status: "fetching" } }));
    try {
      const headers: Record<string, string> = {
        "X-Proxmox-Host": cluster.host,
        "X-Proxmox-Token-Id": cluster.tokenId,
        "X-Proxmox-Token-Secret": cluster.tokenSecret,
        "Content-Type": "application/json",
      };

      /* Fetch node status */
      const [nodeRes, vmRes, versionRes] = await Promise.all([
        fetch("/api/proxmox-cluster", { method: "POST", headers: { ...headers, "X-Proxmox-Path": `nodes/${cluster.node}/status`, "X-Proxmox-Method": "GET" } }),
        fetch("/api/proxmox-cluster", { method: "POST", headers: { ...headers, "X-Proxmox-Path": `nodes/${cluster.node}/qemu`, "X-Proxmox-Method": "GET" } }),
        fetch("/api/proxmox-cluster", { method: "POST", headers: { ...headers, "X-Proxmox-Path": "version", "X-Proxmox-Method": "GET" } }),
      ]);

      const [nodeJson, vmJson, versionJson] = await Promise.all([nodeRes.json(), vmRes.json(), versionRes.json()]);

      const node = nodeJson?.data?.data ?? nodeJson?.data ?? {};
      const vms: Array<{ status: string }> = vmJson?.data?.data ?? vmJson?.data ?? [];
      const version = versionJson?.data?.data?.version ?? versionJson?.data?.version;

      setResources((r) => ({
        ...r,
        [cluster.id]: {
          status: "online",
          cpu: { used: Math.round((node.cpu ?? 0) * (node.cpuinfo?.cpus ?? 4)), total: node.cpuinfo?.cpus ?? 4 },
          memory: { used: node.memory?.used ?? 0, total: node.memory?.total ?? 1 },
          disk: { used: node.rootfs?.used ?? 0, total: node.rootfs?.total ?? 1 },
          vms: { running: vms.filter((v) => v.status === "running").length, total: vms.length },
          version,
        },
      }));
    } catch {
      setResources((r) => ({ ...r, [cluster.id]: { cpu: { used: 0, total: 0 }, memory: { used: 0, total: 0 }, disk: { used: 0, total: 0 }, vms: { running: 0, total: 0 }, status: "offline" } }));
    }
  }, []);

  /* Fetch all on load + cluster change */
  useEffect(() => {
    clusters.forEach((c) => fetchClusterResources(c));
  }, [clusters, fetchClusterResources]);

  /* Smart scheduler */
  const runScheduler = useCallback(() => {
    const candidates: SchedulerResult[] = [];
    for (const cluster of clusters) {
      const r = resources[cluster.id];
      if (!r || r.status !== "online") continue;
      const cpuFree = r.cpu.total - r.cpu.used;
      const memFreeGB = (r.memory.total - r.memory.used) / 1073741824;
      const diskFreeGB = (r.disk.total - r.disk.used) / 1073741824;

      if (cpuFree < schedulerVmCpu) continue;
      if (memFreeGB < schedulerVmMem / 1024) continue;
      if (diskFreeGB < schedulerVmDisk) continue;

      const score = (cpuFree / r.cpu.total) * 40 + (memFreeGB / (r.memory.total / 1073741824)) * 40 + (diskFreeGB / (r.disk.total / 1073741824)) * 20;
      candidates.push({ clusterId: cluster.id, clusterName: cluster.name, reason: `${cpuFree} CPU free, ${memFreeGB.toFixed(1)} GB RAM free, ${diskFreeGB.toFixed(0)} GB disk free`, score, cpuFree, memFreeGB, diskFreeGB });
    }
    candidates.sort((a, b) => b.score - a.score);
    setScheduler(candidates[0] ?? null);
  }, [clusters, resources, schedulerVmCpu, schedulerVmMem, schedulerVmDisk]);

  /* Test connection */
  async function testConnection(cluster: ProxmoxCluster) {
    setTesting(cluster.id);
    setTestResult((r) => ({ ...r, [cluster.id]: { ok: false, msg: "Testing…" } }));
    try {
      const res = await fetch(`/api/proxmox-cluster?host=${encodeURIComponent(cluster.host)}&tokenId=${encodeURIComponent(cluster.tokenId)}&secret=${encodeURIComponent(cluster.tokenSecret)}`);
      const data = await res.json();
      setTestResult((r) => ({ ...r, [cluster.id]: data.ok ? { ok: true, msg: `PVE ${data.version ?? "?"} (${data.release ?? ""})` } : { ok: false, msg: data.error ?? "Connection failed" } }));
      if (data.ok) fetchClusterResources(cluster);
    } catch {
      setTestResult((r) => ({ ...r, [cluster.id]: { ok: false, msg: "Network error" } }));
    } finally { setTesting(null); }
  }

  /* Save form */
  function handleSave() {
    setSaving(true);
    const updated = editCluster
      ? clusters.map((c) => c.id === editCluster.id ? { ...c, ...form } : c)
      : [...clusters, { ...form, id: `cluster_${Date.now()}`, addedAt: new Date().toISOString(), isDefault: clusters.length === 0 }];
    saveClusters(updated);
    setClusters(updated);
    setShowAdd(false);
    setEditCluster(null);
    setForm(EMPTY_FORM);
    setSaving(false);
    if (!editCluster) {
      const newC = updated[updated.length - 1];
      fetchClusterResources(newC);
    }
  }

  function setDefault(id: string) {
    const updated = clusters.map((c) => ({ ...c, isDefault: c.id === id }));
    saveClusters(updated);
    setClusters(updated);
  }

  function handleDelete(id: string) {
    const updated = clusters.filter((c) => c.id !== id);
    if (updated.length > 0 && !updated.some((c) => c.isDefault)) updated[0].isDefault = true;
    saveClusters(updated);
    setClusters(updated);
    setDeleteConfirm(null);
  }

  function openEdit(cluster: ProxmoxCluster) {
    setEditCluster(cluster);
    setForm({ name: cluster.name, host: cluster.host, port: cluster.port, tokenId: cluster.tokenId, tokenSecret: cluster.tokenSecret, node: cluster.node, storage: cluster.storage, bridge: cluster.bridge, gateway: cluster.gateway });
    setShowAdd(true);
  }

  const inputCls = "w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/20 outline-none focus:border-red-400/50";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white">Proxmox Clusters</h1>
          <p className="mt-1 text-sm text-white/40">Manage hypervisor hosts · smart VPS scheduling across clusters</p>
        </div>
        <button
          onClick={() => { setEditCluster(null); setForm(EMPTY_FORM); setShowAdd(true); }}
          className="rounded-xl bg-gradient-to-r from-red-500 to-orange-500 px-5 py-2.5 text-sm font-semibold text-white shadow-lg hover:opacity-90"
        >
          + Add Cluster
        </button>
      </div>

      {/* Summary row */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
          <div className="text-2xl">🖥️</div>
          <div className="mt-1 text-3xl font-bold text-white">{clusters.length}</div>
          <div className="text-xs text-white/40">Total Clusters</div>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
          <div className="text-2xl">✅</div>
          <div className="mt-1 text-3xl font-bold text-emerald-400">
            {Object.values(resources).filter((r) => r.status === "online").length}
          </div>
          <div className="text-xs text-white/40">Online</div>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
          <div className="text-2xl">⚡</div>
          <div className="mt-1 text-3xl font-bold text-cyan-400">
            {Object.values(resources).reduce((s, r) => s + (r.vms?.running ?? 0), 0)}
          </div>
          <div className="text-xs text-white/40">Running VMs (total)</div>
        </div>
      </div>

      {/* Smart Scheduler panel */}
      <div className="rounded-2xl border border-purple-500/20 bg-purple-500/5 p-5">
        <p className="mb-3 text-sm font-semibold text-purple-300">🧠 Smart VPS Scheduler — Preview</p>
        <p className="mb-4 text-xs text-white/40">See which cluster would be auto-selected for a new VPS with the given specs:</p>
        <div className="flex flex-wrap gap-4 mb-4">
          {[
            { label: "vCPU", key: "cpu", value: schedulerVmCpu, setter: setSchedulerVmCpu, options: [1, 2, 4, 8, 16] },
            { label: "RAM (MB)", key: "mem", value: schedulerVmMem, setter: setSchedulerVmMem, options: [512, 1024, 2048, 4096, 8192, 16384] },
            { label: "Disk (GB)", key: "disk", value: schedulerVmDisk, setter: setSchedulerVmDisk, options: [20, 50, 100, 200, 500] },
          ].map((f) => (
            <div key={f.key} className="flex items-center gap-2">
              <span className="text-xs text-white/50">{f.label}</span>
              <select value={f.value} onChange={(e) => f.setter(Number(e.target.value))}
                className="rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-sm text-white">
                {f.options.map((o) => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>
          ))}
          <button onClick={runScheduler} className="rounded-xl bg-purple-500/20 border border-purple-500/30 px-4 py-1.5 text-sm text-purple-300 hover:bg-purple-500/30">
            Find Best Cluster
          </button>
        </div>
        {scheduler !== null && (
          <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4">
            <p className="text-sm font-semibold text-emerald-300">✅ Recommended: <span className="text-white">{scheduler.clusterName}</span></p>
            <p className="mt-1 text-xs text-emerald-200/60">{scheduler.reason}</p>
            <p className="mt-1 text-xs text-white/30">Score: {scheduler.score.toFixed(1)}</p>
          </div>
        )}
        {scheduler === null && resources && Object.keys(resources).length > 0 && (
          <p className="text-xs text-amber-300/60">⚠️ No cluster has enough free resources for the selected VM specs, or resources haven&apos;t loaded yet.</p>
        )}
      </div>

      {/* Cluster cards */}
      <div className="space-y-4">
        {clusters.map((cluster) => {
          const r = resources[cluster.id];
          const tr = testResult[cluster.id];

          return (
            <div key={cluster.id} className="rounded-2xl border border-white/10 bg-white/5 overflow-hidden">
              {/* Card header */}
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/5 px-5 py-4">
                <div className="flex items-center gap-3">
                  <div className={`h-3 w-3 rounded-full ${r?.status === "online" ? "bg-emerald-400 shadow-[0_0_6px_rgba(74,222,128,0.8)] animate-pulse" : r?.status === "fetching" ? "bg-amber-400 animate-pulse" : "bg-red-500"}`} />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-white">{cluster.name}</span>
                      {cluster.isDefault && <span className="rounded border border-red-500/30 bg-red-500/10 px-1.5 py-0.5 text-[10px] font-medium text-red-300">DEFAULT</span>}
                      {r?.version && <span className="text-xs text-white/30">PVE {r.version}</span>}
                    </div>
                    <p className="text-xs text-white/40">{cluster.host}:{cluster.port} · node: {cluster.node}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {r?.vms && (
                    <span className="text-xs text-white/40">{r.vms.running}/{r.vms.total} VMs running</span>
                  )}
                  {!cluster.isDefault && (
                    <button onClick={() => setDefault(cluster.id)} className="rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white/60 hover:text-white">
                      Set Default
                    </button>
                  )}
                  <button onClick={() => testConnection(cluster)} disabled={testing === cluster.id}
                    className="rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white/60 hover:text-white disabled:opacity-50">
                    {testing === cluster.id ? "Testing…" : "Test"}
                  </button>
                  <button onClick={() => fetchClusterResources(cluster)}
                    className="rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white/60 hover:text-white">
                    ↻
                  </button>
                  <button onClick={() => openEdit(cluster)} className="rounded-xl border border-blue-500/20 bg-blue-500/10 px-3 py-1.5 text-xs text-blue-300 hover:bg-blue-500/20">
                    Edit
                  </button>
                  {!cluster.isDefault && (
                    <button onClick={() => setDeleteConfirm(cluster.id)} className="rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-1.5 text-xs text-red-300 hover:bg-red-500/20">
                      Delete
                    </button>
                  )}
                </div>
              </div>

              {/* Test result */}
              {tr && (
                <div className={`px-5 py-2 text-xs ${tr.ok ? "bg-emerald-500/5 text-emerald-300" : "bg-red-500/5 text-red-300"}`}>
                  {tr.ok ? "✓" : "✗"} {tr.msg}
                </div>
              )}

              {/* Resources */}
              {r?.status === "fetching" && (
                <div className="px-5 py-4 text-xs text-white/30 animate-pulse">Fetching resources…</div>
              )}
              {r?.status === "offline" && (
                <div className="px-5 py-4 text-xs text-red-300/60">⚠ Cannot fetch resources — check credentials and host reachability</div>
              )}
              {r?.status === "online" && (
                <div className="grid gap-4 p-5 sm:grid-cols-3">
                  <ResourceBar label="CPU" used={r.cpu.used} total={r.cpu.total} fmt={(n) => `${n} cores`} />
                  <ResourceBar label="Memory" used={r.memory.used} total={r.memory.total} fmt={fmtGB} />
                  <ResourceBar label="Root Disk" used={r.disk.used} total={r.disk.total} fmt={fmtGB} />
                </div>
              )}

              {/* Config details */}
              <div className="border-t border-white/5 px-5 py-3 flex flex-wrap gap-x-6 gap-y-1 text-xs text-white/30">
                <span>Storage: <span className="text-white/50">{cluster.storage}</span></span>
                <span>Bridge: <span className="text-white/50">{cluster.bridge}</span></span>
                <span>Gateway: <span className="text-white/50">{cluster.gateway}</span></span>
                <span>Added: <span className="text-white/50">{new Date(cluster.addedAt).toLocaleDateString()}</span></span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Delete confirm */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="rounded-2xl border border-red-500/20 bg-slate-950 p-6 w-full max-w-sm shadow-2xl">
            <p className="text-lg font-semibold text-white mb-2">Delete Cluster?</p>
            <p className="text-sm text-white/50 mb-5">This removes the cluster from the platform. Existing VMs will not be affected.</p>
            <div className="flex gap-3">
              <button onClick={() => handleDelete(deleteConfirm)} className="flex-1 rounded-xl bg-red-500/20 border border-red-500/30 py-2 text-sm font-semibold text-red-300 hover:bg-red-500/30">Delete</button>
              <button onClick={() => setDeleteConfirm(null)} className="flex-1 rounded-xl border border-white/10 bg-white/5 py-2 text-sm text-white/60">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit modal */}
      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="relative w-full max-w-lg rounded-2xl border border-white/10 bg-slate-950 shadow-2xl overflow-y-auto max-h-[90vh]">
            <div className="sticky top-0 border-b border-white/5 bg-slate-950 px-6 py-4 flex items-center justify-between">
              <h2 className="font-semibold text-white">{editCluster ? "Edit Cluster" : "Add Proxmox Cluster"}</h2>
              <button onClick={() => { setShowAdd(false); setEditCluster(null); }} className="text-white/30 hover:text-white">✕</button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs text-white/40">Cluster Name *</label>
                  <input className={inputCls} placeholder="e.g. Primary DC" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-white/40">Host / IP *</label>
                  <input className={inputCls} placeholder="10.51.100.10" value={form.host} onChange={(e) => setForm((f) => ({ ...f, host: e.target.value }))} />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-white/40">Port</label>
                  <input className={inputCls} type="number" value={form.port} onChange={(e) => setForm((f) => ({ ...f, port: Number(e.target.value) }))} />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-white/40">Proxmox Node Name</label>
                  <input className={inputCls} placeholder="pve" value={form.node} onChange={(e) => setForm((f) => ({ ...f, node: e.target.value }))} />
                </div>
              </div>

              <div className="rounded-xl border border-amber-500/10 bg-amber-500/5 p-4 space-y-3">
                <p className="text-xs font-semibold text-amber-300">🔑 API Token</p>
                <p className="text-[11px] text-white/30">Create via Proxmox UI: Datacenter → API Tokens → Add. Grant PVEVMAdmin + PVEDatastoreAdmin roles.</p>
                <div>
                  <label className="mb-1 block text-xs text-white/40">Token ID *</label>
                  <input className={inputCls} placeholder="root@pam!mytoken" value={form.tokenId} onChange={(e) => setForm((f) => ({ ...f, tokenId: e.target.value }))} />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-white/40">Token Secret *</label>
                  <input className={inputCls} type="password" placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" value={form.tokenSecret} onChange={(e) => setForm((f) => ({ ...f, tokenSecret: e.target.value }))} />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <label className="mb-1 block text-xs text-white/40">Storage</label>
                  <input className={inputCls} placeholder="local-lvm" value={form.storage} onChange={(e) => setForm((f) => ({ ...f, storage: e.target.value }))} />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-white/40">Network Bridge</label>
                  <input className={inputCls} placeholder="vmbr0" value={form.bridge} onChange={(e) => setForm((f) => ({ ...f, bridge: e.target.value }))} />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-white/40">Gateway</label>
                  <input className={inputCls} placeholder="10.0.0.1" value={form.gateway} onChange={(e) => setForm((f) => ({ ...f, gateway: e.target.value }))} />
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={handleSave}
                  disabled={saving || !form.name || !form.host || !form.tokenId}
                  className="flex-1 rounded-xl bg-gradient-to-r from-red-500 to-orange-500 py-2.5 text-sm font-semibold text-white disabled:opacity-40"
                >
                  {saving ? "Saving…" : editCluster ? "Save Changes" : "Add Cluster"}
                </button>
                <button onClick={() => { setShowAdd(false); setEditCluster(null); }} className="rounded-xl border border-white/10 bg-white/5 px-5 py-2.5 text-sm text-white/60">
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

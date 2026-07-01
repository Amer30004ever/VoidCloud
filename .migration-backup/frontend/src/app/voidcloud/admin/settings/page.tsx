"use client";

import { useState, useEffect } from "react";
import api from "@/lib/api";

interface ProxmoxCluster {
  id: string;
  name: string;
  host: string;
  tokenId: string;
  tokenSecret: string;
  node: string;
  storage: string;
  bridge: string;
  ipPool: string;
  gateway: string;
  isDefault: boolean;
}

const DEFAULT_CLUSTER: ProxmoxCluster = {
  id: "primary",
  name: "Primary Cluster",
  host: "10.51.100.10",
  tokenId: "root@pam!Amer-Cloud",
  tokenSecret: "",
  node: "proxmox",
  storage: "raid-vms",
  bridge: "vmbr1",
  ipPool: "10.51.100.0/24",
  gateway: "10.51.100.1",
  isDefault: true,
};

const inp = "w-full rounded-lg border border-white/10 bg-slate-950/60 px-3 py-2 text-sm outline-none focus:border-red-400/50";

function loadClusters(): ProxmoxCluster[] {
  if (typeof window === "undefined") return [DEFAULT_CLUSTER];
  try {
    const saved = localStorage.getItem("proxmox_clusters");
    return saved ? JSON.parse(saved) : [DEFAULT_CLUSTER];
  } catch { return [DEFAULT_CLUSTER]; }
}

export default function AdminSettingsPage() {
  const [tab, setTab] = useState<"proxmox" | "smtp" | "system">("proxmox");
  const [clusters, setClusters] = useState<ProxmoxCluster[]>(loadClusters);
  const [editingCluster, setEditingCluster] = useState<ProxmoxCluster | null>(null);
  const [addingCluster, setAddingCluster] = useState(false);
  const [newCluster, setNewCluster] = useState<ProxmoxCluster>({ ...DEFAULT_CLUSTER, id: crypto.randomUUID?.() ?? Date.now().toString(), name: "", isDefault: false });
  const [testResult, setTestResult] = useState<Record<string, string>>({});
  const [smtpStatus, setSmtpStatus] = useState<{ status: string; host?: string; error?: string } | null>(null);
  const [smtpTesting, setSmtpTesting] = useState(false);
  const [systemInfo, setSystemInfo] = useState<{ version?: string; env?: string; nodeVersion?: string } | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    api.get("/admin/smtp/status").catch(() => null).then((r) => r && setSmtpStatus(r.data));
    api.get("/admin/system/info").catch(() => null).then((r) => r && setSystemInfo(r.data));
  }, []);

  function saveClusters(updated: ProxmoxCluster[]) {
    setClusters(updated);
    localStorage.setItem("proxmox_clusters", JSON.stringify(updated));
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  function addCluster() {
    if (!newCluster.name || !newCluster.host) { alert("Name and host required"); return; }
    const cluster: ProxmoxCluster = { ...newCluster, id: Date.now().toString() };
    saveClusters([...clusters, cluster]);
    setAddingCluster(false);
    setNewCluster({ ...DEFAULT_CLUSTER, id: "", name: "", isDefault: false });
  }

  function updateCluster(updated: ProxmoxCluster) {
    saveClusters(clusters.map((c) => c.id === updated.id ? updated : c));
    setEditingCluster(null);
  }

  function deleteCluster(id: string) {
    if (!confirm("Remove this Proxmox cluster?")) return;
    saveClusters(clusters.filter((c) => c.id !== id));
  }

  function setDefault(id: string) {
    saveClusters(clusters.map((c) => ({ ...c, isDefault: c.id === id })));
  }

  async function testCluster(cluster: ProxmoxCluster) {
    setTestResult((r) => ({ ...r, [cluster.id]: "testing…" }));
    try {
      const res = await fetch(`/api/proxmox/nodes/${cluster.node}/status`);
      if (res.ok) {
        setTestResult((r) => ({ ...r, [cluster.id]: "✓ Connected" }));
      } else {
        setTestResult((r) => ({ ...r, [cluster.id]: `✗ HTTP ${res.status}` }));
      }
    } catch (e: unknown) {
      setTestResult((r) => ({ ...r, [cluster.id]: `✗ ${e instanceof Error ? e.message : "Error"}` }));
    }
  }

  async function testSmtp() {
    setSmtpTesting(true);
    try {
      await api.post("/admin/smtp/test", {});
      const s = await api.get("/admin/smtp/status");
      setSmtpStatus(s.data);
    } finally { setSmtpTesting(false); }
  }

  const TABS = [
    { id: "proxmox", label: "Proxmox Clusters" },
    { id: "smtp", label: "Email / SMTP" },
    { id: "system", label: "System Info" },
  ] as const;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white">System Settings</h1>
        <p className="mt-1 text-sm text-white/40">Platform configuration — Proxmox clusters, email, system</p>
      </div>

      {saved && <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3 text-sm text-emerald-300">✓ Settings saved</div>}

      <div className="flex gap-1 rounded-xl border border-white/10 bg-white/5 p-1">
        {TABS.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)} className={`flex-1 rounded-lg py-2 text-sm font-medium transition ${tab === t.id ? "bg-white/10 text-white" : "text-white/40 hover:text-white"}`}>{t.label}</button>
        ))}
      </div>

      {tab === "proxmox" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-white/60">Configure Proxmox clusters for VPS provisioning. Add multiple clusters for scalability.</p>
            <button onClick={() => setAddingCluster(true)} className="rounded-xl bg-gradient-to-r from-red-500 to-orange-500 px-4 py-2 text-sm font-semibold text-white">+ Add Cluster</button>
          </div>

          <div className="space-y-3">
            {clusters.map((cluster) => (
              <div key={cluster.id} className={`rounded-2xl border p-5 ${cluster.isDefault ? "border-red-500/30 bg-red-500/5" : "border-white/10 bg-white/5"}`}>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-white">{cluster.name}</h3>
                      {cluster.isDefault && <span className="rounded-full bg-red-500/20 px-2 py-0.5 text-[10px] font-semibold text-red-300">DEFAULT</span>}
                    </div>
                    <div className="mt-1 space-y-0.5">
                      <p className="font-mono text-xs text-white/50">Host: {cluster.host}:8006</p>
                      <p className="font-mono text-xs text-white/50">Node: {cluster.node} · Storage: {cluster.storage} · Bridge: {cluster.bridge}</p>
                      <p className="font-mono text-xs text-white/50">IP Pool: {cluster.ipPool} · GW: {cluster.gateway}</p>
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-2">
                    <div className="flex gap-2">
                      {!cluster.isDefault && <button onClick={() => setDefault(cluster.id)} className="rounded-lg border border-white/10 px-2.5 py-1 text-xs text-white/40 hover:text-white">Set default</button>}
                      <button onClick={() => testCluster(cluster)} className="rounded-lg border border-white/10 px-2.5 py-1 text-xs text-white/40 hover:text-white">Test</button>
                      <button onClick={() => setEditingCluster({ ...cluster })} className="rounded-lg border border-white/10 px-2.5 py-1 text-xs text-cyan-400">Edit</button>
                      {!cluster.isDefault && <button onClick={() => deleteCluster(cluster.id)} className="rounded-lg border border-red-500/20 px-2.5 py-1 text-xs text-red-400">Remove</button>}
                    </div>
                    {testResult[cluster.id] && (
                      <span className={`text-xs ${testResult[cluster.id].startsWith("✓") ? "text-emerald-400" : testResult[cluster.id] === "testing…" ? "text-white/40" : "text-red-400"}`}>
                        {testResult[cluster.id]}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {addingCluster && (
            <ClusterForm
              title="Add Proxmox Cluster"
              value={newCluster}
              onChange={setNewCluster}
              onSave={addCluster}
              onCancel={() => setAddingCluster(false)}
            />
          )}

          {editingCluster && (
            <ClusterForm
              title={`Edit: ${editingCluster.name}`}
              value={editingCluster}
              onChange={setEditingCluster}
              onSave={() => updateCluster(editingCluster)}
              onCancel={() => setEditingCluster(null)}
            />
          )}
        </div>
      )}

      {tab === "smtp" && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white">SMTP Status</h3>
              <button onClick={testSmtp} disabled={smtpTesting} className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm disabled:opacity-50 hover:bg-white/10">
                {smtpTesting ? "Testing…" : "Send Test Email"}
              </button>
            </div>
            <div className="flex items-center gap-3">
              <span className={`h-3 w-3 rounded-full ${smtpStatus?.status === "connected" ? "bg-emerald-400 shadow-[0_0_8px_rgba(74,222,128,0.6)]" : "bg-red-400"}`} />
              <div>
                <p className="font-medium text-white">{smtpStatus?.status === "connected" ? "Connected" : "Disconnected"}</p>
                <p className="text-xs text-white/40">{smtpStatus?.host ?? "smtp.gmail.com:587"}</p>
                {smtpStatus?.error && <p className="text-xs text-red-300">{smtpStatus.error}</p>}
              </div>
            </div>
            <div className="mt-4 space-y-2 text-sm">
              {[
                { label: "Host", value: "smtp.gmail.com" },
                { label: "Port", value: "587" },
                { label: "User", value: "support.voidcloud@gmail.com" },
                { label: "From", value: "VoidCloud <support.voidcloud@gmail.com>" },
              ].map((row) => (
                <div key={row.label} className="flex items-center justify-between rounded-lg border border-white/5 bg-white/5 px-3 py-2">
                  <span className="text-white/50">{row.label}</span>
                  <span className="font-mono text-xs text-cyan-300">{row.value}</span>
                </div>
              ))}
            </div>
            <p className="mt-3 text-xs text-white/30">Credentials are managed via Kubernetes secrets (voidcloud-app-secret). Update them via kubectl or your CI/CD pipeline.</p>
          </div>
        </div>
      )}

      {tab === "system" && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
            <h3 className="mb-4 text-lg font-semibold text-white">Platform Info</h3>
            <div className="space-y-2 text-sm">
              {[
                { label: "Platform", value: "Void Cloud" },
                { label: "Version", value: systemInfo?.version ?? "—" },
                { label: "Environment", value: systemInfo?.env ?? "production" },
                { label: "Node.js", value: systemInfo?.nodeVersion ?? "—" },
                { label: "Cluster", value: "10.51.100.21 (master) · 10.51.100.31 (worker)" },
                { label: "Domain", value: "voidcloud.cc.cd" },
                { label: "Namespace", value: "voidcloud" },
              ].map((row) => (
                <div key={row.label} className="flex items-center justify-between rounded-lg border border-white/5 bg-white/5 px-3 py-2">
                  <span className="text-white/50">{row.label}</span>
                  <span className="font-mono text-xs text-cyan-300">{row.value}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
            <h3 className="mb-3 text-lg font-semibold text-white">Quick Actions</h3>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {[
                { label: "View Audit Logs", href: "/voidcloud/admin/audit" },
                { label: "Manage Users", href: "/voidcloud/admin/users" },
                { label: "Monitoring", href: "/voidcloud/admin/monitoring" },
                { label: "View Tenants", href: "/voidcloud/admin/tenants" },
                { label: "Billing Overview", href: "/voidcloud/admin/billing" },
                { label: "VPS Instances", href: "/voidcloud/admin/vps" },
              ].map((a) => (
                <a key={a.label} href={a.href} className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/70 transition hover:border-white/20 hover:text-white">{a.label} →</a>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ClusterForm({ title, value, onChange, onSave, onCancel }: {
  title: string;
  value: ProxmoxCluster;
  onChange: (c: ProxmoxCluster) => void;
  onSave: () => void;
  onCancel: () => void;
}) {
  const inp2 = "w-full rounded-lg border border-white/10 bg-slate-950/60 px-3 py-2 text-sm outline-none focus:border-red-400/50";
  const fields: Array<{ key: keyof ProxmoxCluster; label: string; placeholder?: string; type?: string }> = [
    { key: "name", label: "Cluster name", placeholder: "e.g. Secondary DC" },
    { key: "host", label: "Proxmox host IP", placeholder: "10.51.100.10" },
    { key: "tokenId", label: "API Token ID", placeholder: "root@pam!token-name" },
    { key: "tokenSecret", label: "Token secret", placeholder: "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx", type: "password" },
    { key: "node", label: "Node name", placeholder: "proxmox" },
    { key: "storage", label: "Storage", placeholder: "raid-vms" },
    { key: "bridge", label: "Bridge", placeholder: "vmbr1" },
    { key: "ipPool", label: "IP Pool CIDR", placeholder: "10.51.100.0/24" },
    { key: "gateway", label: "Gateway", placeholder: "10.51.100.1" },
  ];
  return (
    <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-6">
      <h3 className="mb-4 text-lg font-semibold text-white">{title}</h3>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {fields.map((f) => (
          <div key={f.key}>
            <label className="mb-1 block text-xs text-white/50 uppercase tracking-wide">{f.label}</label>
            <input
              className={inp2}
              type={f.type ?? "text"}
              placeholder={f.placeholder}
              value={String(value[f.key] ?? "")}
              onChange={(e) => onChange({ ...value, [f.key]: e.target.value })}
            />
          </div>
        ))}
      </div>
      <div className="mt-4 flex justify-end gap-2">
        <button onClick={onCancel} className="rounded-xl border border-white/10 px-4 py-2 text-sm">Cancel</button>
        <button onClick={onSave} className="rounded-xl bg-gradient-to-r from-red-500 to-orange-500 px-6 py-2 text-sm font-semibold text-white">Save</button>
      </div>
    </div>
  );
}

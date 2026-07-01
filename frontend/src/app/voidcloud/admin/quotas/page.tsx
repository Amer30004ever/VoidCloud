"use client";

import { useCallback, useEffect, useState } from "react";
import api from "@/lib/api";

interface TenantQuota {
  tenantId: string;
  name: string;
  plan: string;
  quotas: { cpu: number; memory: number; disk: number; vms: number };
  usage: { cpu: number; memory: number; disk: number; vms: number };
  status: "ok" | "warning" | "exceeded";
}

const PLAN_DEFAULTS: Record<string, { cpu: number; memory: number; disk: number; vms: number }> = {
  Starter: { cpu: 4, memory: 8192, disk: 200, vms: 2 },
  Pro: { cpu: 16, memory: 32768, disk: 1000, vms: 10 },
  Business: { cpu: 64, memory: 131072, disk: 5000, vms: 50 },
  Enterprise: { cpu: 256, memory: 524288, disk: 20000, vms: 200 },
};

const MOCK: TenantQuota[] = [
  { tenantId: "t1", name: "Acme Corp", plan: "Enterprise", quotas: { cpu: 256, memory: 524288, disk: 20000, vms: 200 }, usage: { cpu: 128, memory: 262144, disk: 8000, vms: 85 }, status: "ok" },
  { tenantId: "t2", name: "TechStart Ltd", plan: "Pro", quotas: { cpu: 16, memory: 32768, disk: 1000, vms: 10 }, usage: { cpu: 14, memory: 28000, disk: 850, vms: 9 }, status: "warning" },
  { tenantId: "t3", name: "Digital Agency", plan: "Business", quotas: { cpu: 64, memory: 131072, disk: 5000, vms: 50 }, usage: { cpu: 70, memory: 131072, disk: 5200, vms: 52 }, status: "exceeded" },
  { tenantId: "t4", name: "ShopPlus", plan: "Starter", quotas: { cpu: 4, memory: 8192, disk: 200, vms: 2 }, usage: { cpu: 1, memory: 2048, disk: 50, vms: 1 }, status: "ok" },
];

function QuotaBar({ label, used, total, unit }: { label: string; used: number; total: number; unit: string }) {
  const pct = total === 0 ? 0 : Math.min(100, Math.round((used / total) * 100));
  const color = pct >= 100 ? "from-red-500 to-red-600" : pct >= 80 ? "from-amber-500 to-orange-500" : "from-emerald-500 to-teal-500";
  const fmt = (n: number) => n >= 1024 ? `${(n / 1024).toFixed(1)}GB` : `${n}${unit}`;
  return (
    <div>
      <div className="flex justify-between text-xs text-white/50 mb-1">
        <span>{label}</span>
        <span>{fmt(used)} / {fmt(total)} <span className="text-white/25">({pct}%)</span></span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
        <div className={`h-full rounded-full bg-gradient-to-r ${color} transition-all`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export default function QuotasPage() {
  const [tenants, setTenants] = useState<TenantQuota[]>(MOCK);
  const [loading, setLoading] = useState(true);
  const [editModal, setEditModal] = useState<TenantQuota | null>(null);
  const [form, setForm] = useState({ cpu: 0, memory: 0, disk: 0, vms: 0 });
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "ok" | "warning" | "exceeded">("all");

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get("/admin/tenant-quotas");
      if (res.data?.length) setTenants(res.data);
    } catch { /**/ } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  function openEdit(t: TenantQuota) {
    setEditModal(t);
    setForm({ cpu: t.quotas.cpu, memory: t.quotas.memory, disk: t.quotas.disk, vms: t.quotas.vms });
  }

  async function saveQuotas() {
    if (!editModal) return;
    setSaving(true);
    try {
      await api.patch(`/admin/tenant-quotas/${editModal.tenantId}`, form);
      setTenants((ts) => ts.map((t) => t.tenantId === editModal.tenantId ? { ...t, quotas: form } : t));
      setEditModal(null);
    } catch { /**/ } finally { setSaving(false); }
  }

  function applyPlanDefaults(plan: string) {
    const d = PLAN_DEFAULTS[plan];
    if (d) setForm(d);
  }

  const filtered = tenants.filter((t) =>
    (filter === "all" || t.status === filter) &&
    (!search || t.name.toLowerCase().includes(search.toLowerCase()))
  );

  const exceeded = tenants.filter((t) => t.status === "exceeded").length;
  const warning = tenants.filter((t) => t.status === "warning").length;

  const inputCls = "w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-red-400/40";

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white">Tenant Resource Quotas</h1>
          <p className="mt-1 text-sm text-white/40">CPU · Memory · Disk · VM limits per tenant</p>
        </div>
        <button onClick={fetchData} disabled={loading} className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/60 hover:text-white disabled:opacity-40">
          {loading ? "…" : "↻"}
        </button>
      </div>

      {/* KPIs */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
          <div className="text-2xl">✅</div>
          <div className="text-3xl font-bold text-emerald-400 mt-1">{tenants.filter((t) => t.status === "ok").length}</div>
          <div className="text-xs text-white/40">Tenants within quota</div>
        </div>
        <div className="rounded-2xl border border-amber-500/15 bg-amber-500/5 p-5">
          <div className="text-2xl">⚠️</div>
          <div className="text-3xl font-bold text-amber-400 mt-1">{warning}</div>
          <div className="text-xs text-white/40">Near limit (&gt;80%)</div>
        </div>
        <div className="rounded-2xl border border-red-500/15 bg-red-500/5 p-5">
          <div className="text-2xl">🚨</div>
          <div className="text-3xl font-bold text-red-400 mt-1">{exceeded}</div>
          <div className="text-xs text-white/40">Quota exceeded</div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        {(["all", "ok", "warning", "exceeded"] as const).map((f) => (
          <button key={f} onClick={() => setFilter(f)}
            className={`rounded-xl border px-3 py-1.5 text-xs font-medium capitalize transition ${filter === f ? "border-red-500/30 bg-red-500/10 text-red-300" : "border-white/10 bg-white/5 text-white/40 hover:text-white"}`}>
            {f}
          </button>
        ))}
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search tenant…"
          className="flex-1 min-w-[140px] rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white placeholder:text-white/20 outline-none" />
      </div>

      {/* Tenant cards */}
      <div className="space-y-3">
        {filtered.map((t) => (
          <div key={t.tenantId} className={`rounded-2xl border p-5 ${
            t.status === "exceeded" ? "border-red-500/20 bg-red-500/5" :
            t.status === "warning" ? "border-amber-500/15 bg-amber-500/5" :
            "border-white/10 bg-white/5"
          }`}>
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <div className="flex items-center gap-3">
                <div>
                  <p className="font-semibold text-white">{t.name}</p>
                  <p className="text-xs text-white/40">{t.plan} plan · ID: {t.tenantId}</p>
                </div>
                <span className={`rounded border px-2 py-0.5 text-[10px] font-bold ${
                  t.status === "exceeded" ? "border-red-500/30 bg-red-500/10 text-red-300" :
                  t.status === "warning" ? "border-amber-500/30 bg-amber-500/10 text-amber-300" :
                  "border-emerald-500/20 bg-emerald-500/10 text-emerald-300"
                }`}>{t.status.toUpperCase()}</span>
              </div>
              <button onClick={() => openEdit(t)} className="rounded-xl border border-blue-500/20 bg-blue-500/10 px-3 py-1.5 text-xs text-blue-300 hover:bg-blue-500/20">
                Edit Quotas
              </button>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <QuotaBar label="vCPU" used={t.usage.cpu} total={t.quotas.cpu} unit=" cores" />
              <QuotaBar label="Memory" used={t.usage.memory} total={t.quotas.memory} unit="MB" />
              <QuotaBar label="Disk" used={t.usage.disk} total={t.quotas.disk} unit="GB" />
              <QuotaBar label="VMs" used={t.usage.vms} total={t.quotas.vms} unit="" />
            </div>
          </div>
        ))}
      </div>

      {/* Edit modal */}
      {editModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-slate-950 shadow-2xl">
            <div className="border-b border-white/5 px-6 py-4 flex items-center justify-between">
              <div>
                <h2 className="font-semibold text-white">Edit Quotas</h2>
                <p className="text-xs text-white/40">{editModal.name}</p>
              </div>
              <button onClick={() => setEditModal(null)} className="text-white/30 hover:text-white">✕</button>
            </div>
            <div className="p-6 space-y-4">
              {/* Plan presets */}
              <div>
                <p className="mb-2 text-xs text-white/40">Apply plan defaults:</p>
                <div className="flex flex-wrap gap-1">
                  {Object.keys(PLAN_DEFAULTS).map((plan) => (
                    <button key={plan} onClick={() => applyPlanDefaults(plan)}
                      className="rounded-lg border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/60 hover:text-white">
                      {plan}
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {[
                  { key: "cpu" as const, label: "vCPU cores", min: 1, max: 1024 },
                  { key: "memory" as const, label: "Memory (MB)", min: 512, max: 1048576 },
                  { key: "disk" as const, label: "Disk (GB)", min: 10, max: 100000 },
                  { key: "vms" as const, label: "Max VMs", min: 1, max: 1000 },
                ].map((f) => (
                  <div key={f.key}>
                    <label className="mb-1 block text-xs text-white/40">{f.label}</label>
                    <input type="number" min={f.min} max={f.max} value={form[f.key]}
                      onChange={(e) => setForm((x) => ({ ...x, [f.key]: Number(e.target.value) }))}
                      className={inputCls} />
                  </div>
                ))}
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={saveQuotas} disabled={saving} className="flex-1 rounded-xl bg-gradient-to-r from-red-500 to-orange-500 py-2.5 text-sm font-semibold text-white disabled:opacity-40">
                  {saving ? "Saving…" : "Save Quotas"}
                </button>
                <button onClick={() => setEditModal(null)} className="rounded-xl border border-white/10 bg-white/5 px-5 py-2.5 text-sm text-white/60">Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

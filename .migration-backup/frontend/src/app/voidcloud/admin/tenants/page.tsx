"use client";

import { useEffect, useState, useCallback } from "react";
import api from "@/lib/api";

interface Tenant {
  id: string;
  name: string;
  subdomain: string;
  planName?: string;
  userCount?: number;
  vpsCount?: number;
  status: "ACTIVE" | "SUSPENDED" | "TRIAL";
  createdAt: string;
  settings?: Record<string, unknown>;
}

const inp = "w-full rounded-lg border border-white/10 bg-slate-950/60 px-3 py-2 text-sm outline-none focus:border-red-400/50";

export default function TenantsPage() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [creating, setCreating] = useState(false);
  const [draft, setDraft] = useState({ name: "", subdomain: "", ownerEmail: "" });
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await api.get(`/admin/tenants${search ? `?q=${search}` : ""}`);
      setTenants(Array.isArray(r.data) ? r.data : (r.data?.tenants ?? []));
    } catch {
      setTenants([]);
    } finally { setLoading(false); }
  }, [search]);

  useEffect(() => { load(); }, [load]);

  async function create() {
    if (!draft.name || !draft.subdomain) { alert("Name and subdomain required."); return; }
    await api.post("/admin/tenants", draft);
    setCreating(false);
    setDraft({ name: "", subdomain: "", ownerEmail: "" });
    load();
  }

  async function suspend(id: string) {
    await api.post(`/admin/tenants/${id}/suspend`);
    load();
  }

  async function activate(id: string) {
    await api.post(`/admin/tenants/${id}/activate`);
    load();
  }

  async function deleteTenant(id: string, name: string) {
    if (!confirm(`Delete tenant "${name}"? This is irreversible.`)) return;
    await api.delete(`/admin/tenants/${id}`);
    load();
  }

  const statusColor: Record<string, string> = {
    ACTIVE: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
    SUSPENDED: "border-red-500/30 bg-red-500/10 text-red-300",
    TRIAL: "border-amber-500/30 bg-amber-500/10 text-amber-300",
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white">Tenants</h1>
          <p className="mt-1 text-sm text-white/40">Multi-tenant isolation — each business owner is a tenant</p>
        </div>
        <div className="flex gap-2">
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search tenants…" className="w-64 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-white/30 outline-none focus:border-red-400/50" />
          <button onClick={() => setCreating(true)} className="rounded-xl bg-gradient-to-r from-red-500 to-orange-500 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-red-500/20">+ New Tenant</button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: "Total", value: tenants.length, color: "text-white" },
          { label: "Active", value: tenants.filter(t => t.status === "ACTIVE").length, color: "text-emerald-400" },
          { label: "Trial", value: tenants.filter(t => t.status === "TRIAL").length, color: "text-amber-400" },
          { label: "Suspended", value: tenants.filter(t => t.status === "SUSPENDED").length, color: "text-red-400" },
        ].map((s) => (
          <div key={s.label} className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <p className="text-xs text-white/40">{s.label}</p>
            <p className={`mt-1 text-2xl font-bold ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/5">
        {loading ? (
          <div className="space-y-0.5 p-3">{[1,2,3].map(i => <div key={i} className="h-16 animate-pulse rounded-xl bg-white/5" />)}</div>
        ) : tenants.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-3xl mb-3">🏢</p>
            <p className="text-sm text-white/50">No tenants found</p>
            <button onClick={() => setCreating(true)} className="mt-4 rounded-xl bg-gradient-to-r from-red-500 to-orange-500 px-4 py-2 text-sm font-semibold text-white">Create first tenant</button>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-white/5">
              <tr className="text-[11px] uppercase tracking-wider text-white/30">
                <th className="px-5 py-3 text-left">Tenant</th>
                <th className="py-3">Subdomain</th>
                <th className="hidden py-3 md:table-cell">Users</th>
                <th className="hidden py-3 md:table-cell">VPS</th>
                <th className="py-3">Status</th>
                <th className="py-3">Created</th>
                <th className="py-3 pr-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {tenants.map((t) => (
                <tr key={t.id} className="border-t border-white/5 hover:bg-white/[0.03] cursor-pointer" onClick={() => setSelectedTenant(t)}>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-gradient-to-br from-red-500/20 to-orange-500/20 text-lg font-bold text-white">
                        {t.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-semibold text-white">{t.name}</p>
                        <p className="text-xs text-white/30">{t.id.slice(0, 8)}…</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-4 font-mono text-xs text-cyan-300">{t.subdomain}.voidcloud.cc.cd</td>
                  <td className="hidden py-4 text-center text-white/60 md:table-cell">{t.userCount ?? "—"}</td>
                  <td className="hidden py-4 text-center text-white/60 md:table-cell">{t.vpsCount ?? "—"}</td>
                  <td className="py-4"><span className={`rounded-full border px-2.5 py-1 text-xs font-medium ${statusColor[t.status] ?? statusColor.TRIAL}`}>{t.status}</span></td>
                  <td className="py-4 text-xs text-white/40">{new Date(t.createdAt).toLocaleDateString()}</td>
                  <td className="py-4 pr-5 text-right" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-end gap-2">
                      {t.status === "SUSPENDED"
                        ? <button onClick={() => activate(t.id)} className="text-xs text-emerald-300 hover:underline">Activate</button>
                        : <button onClick={() => suspend(t.id)} className="text-xs text-amber-300 hover:underline">Suspend</button>}
                      <button onClick={() => deleteTenant(t.id, t.name)} className="text-xs text-red-300 hover:underline">Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {creating && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4" onClick={() => setCreating(false)}>
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-slate-900 p-6" onClick={(e) => e.stopPropagation()}>
            <h2 className="mb-4 text-xl font-bold">New Tenant</h2>
            <div className="space-y-3">
              <input className={inp} placeholder="Company / business name" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
              <div className="relative">
                <input className={inp} placeholder="subdomain" value={draft.subdomain} onChange={(e) => setDraft({ ...draft, subdomain: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "") })} />
                <span className="absolute inset-y-0 right-3 flex items-center text-xs text-white/30">.voidcloud.cc.cd</span>
              </div>
              <input className={inp} type="email" placeholder="Owner email (optional)" value={draft.ownerEmail} onChange={(e) => setDraft({ ...draft, ownerEmail: e.target.value })} />
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button onClick={() => setCreating(false)} className="rounded-lg border border-white/10 px-4 py-2 text-sm">Cancel</button>
              <button onClick={create} className="rounded-xl bg-gradient-to-r from-red-500 to-orange-500 px-6 py-2 text-sm font-semibold text-white">Create</button>
            </div>
          </div>
        </div>
      )}

      {selectedTenant && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4" onClick={() => setSelectedTenant(null)}>
          <div className="w-full max-w-lg rounded-2xl border border-white/10 bg-slate-900 p-6" onClick={(e) => e.stopPropagation()}>
            <h2 className="mb-2 text-xl font-bold">{selectedTenant.name}</h2>
            <p className="mb-4 text-sm text-white/40">Tenant details</p>
            <div className="space-y-2 text-sm">
              <Row label="ID" value={selectedTenant.id} mono />
              <Row label="Subdomain" value={`${selectedTenant.subdomain}.voidcloud.cc.cd`} mono />
              <Row label="Status" value={selectedTenant.status} />
              <Row label="Created" value={new Date(selectedTenant.createdAt).toLocaleString()} />
              <Row label="Users" value={String(selectedTenant.userCount ?? "—")} />
              <Row label="VPS" value={String(selectedTenant.vpsCount ?? "—")} />
            </div>
            <button onClick={() => setSelectedTenant(null)} className="mt-4 w-full rounded-xl border border-white/10 py-2 text-sm hover:bg-white/5">Close</button>
          </div>
        </div>
      )}
    </div>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-white/5 bg-white/5 px-3 py-2">
      <span className="text-white/50">{label}</span>
      <span className={mono ? "font-mono text-xs text-cyan-300" : "text-white"}>{value}</span>
    </div>
  );
}

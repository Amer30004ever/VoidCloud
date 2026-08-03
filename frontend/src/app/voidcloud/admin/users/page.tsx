/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import { useEffect, useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Users } from "lucide-react";
import { cloudApi, CloudPlan, TenantQuota } from "@/features/vps/cloud";
import { useToast } from "@/components/ui/Toast";
import { EmptyState } from "@workspace/ui-kit/empty-state";
import { TableSkeleton } from "@workspace/ui-kit/skeleton";
import { ErrorBoundary } from "@/components/ErrorBoundary";

export default function AdminUsersPage() {
  const router = useRouter();
  const { addToast } = useToast();
  const [users, setUsers] = useState<any[]>([]);
  const [plans, setPlans] = useState<CloudPlan[]>([]);
  const [q, setQ] = useState("");
  const [creating, setCreating] = useState(false);
  const [draft, setDraft] = useState({ email: "", name: "", password: "", role: "USER", planId: "" });
  const [quotaUser, setQuotaUser] = useState<any | null>(null);
  const [quota, setQuota] = useState<TenantQuota | null>(null);
  const [loadingQuota, setLoadingQuota] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkLoading, setBulkLoading] = useState(false);
  const [showColMenu, setShowColMenu] = useState(false);
  const [showFilterSave, setShowFilterSave] = useState(false);
  const [filterName, setFilterName] = useState("");
  const [savedFilters, setSavedFilters] = useState<{ id: string; name: string; query: string }[]>([]);
  const [columnVisibility, setColumnVisibility] = useState({
    name: true, plan: true, status: true, vps: true, joined: true, actions: true,
  });
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const raw = localStorage.getItem("userTableFilters");
    if (raw) { try { setSavedFilters(JSON.parse(raw)); } catch {} }
  }, []);

  const load = useCallback(async (query?: string) => {
    setLoading(true);
    setLastUpdated(new Date());
    try {
      setUsers(await cloudApi.admin.users(query ?? q));
    } finally {
      setLoading(false);
    }
  }, [q]);
  useEffect(() => { load(); }, [load]);
  useEffect(() => { cloudApi.admin.plans().then(setPlans).catch(() => {}); }, []);

  const filtered = useMemo(() => {
    if (!q.trim()) return users;
    const needle = q.toLowerCase();
    return users.filter((u) => u.name.toLowerCase().includes(needle) || u.email.toLowerCase().includes(needle));
  }, [users, q]);

  const bulkSuspend = async () => {
    setBulkLoading(true);
    for (const id of selectedIds) {
      const u = users.find((x) => x.id === id);
      await cloudApi.admin.suspend(id, "bulk");
    }
    addToast({ type: "success", title: `Suspended ${selectedIds.size} users`, message: "All selected users have been suspended." });
    setSelectedIds(new Set());
    load();
    setBulkLoading(false);
  };

  const bulkDelete = async () => {
    if (!confirm(`Permanently delete ${selectedIds.size} users? This cannot be undone.`)) return;
    setBulkLoading(true);
    for (const id of selectedIds) {
      await cloudApi.admin.deleteUser(id);
    }
    addToast({ type: "success", title: `Deleted ${selectedIds.size} users`, message: "All selected users have been removed." });
    setSelectedIds(new Set());
    load();
    setBulkLoading(false);
  };

  const saveFilter = () => {
    if (!filterName.trim()) return;
    const next = [...savedFilters, { id: Date.now().toString(), name: filterName.trim(), query: q }];
    setSavedFilters(next);
    localStorage.setItem("userTableFilters", JSON.stringify(next));
    setFilterName("");
    setShowFilterSave(false);
    addToast({ type: "success", title: "Filter saved", message: `"${filterName.trim()}" saved for reuse.` });
  };

  const applyFilter = (query: string) => { setQ(query); };

  const exportCSV = () => {
    const selected = users.filter((u) => selectedIds.has(u.id));
    if (!selected.length) return;
    const headers = ["Name", "Email", "Plan", "Status", "VPS", "Joined"];
    const rows = selected.map((u) => [u.name, u.email, u.cloudPlanId ?? "", u.suspendedAt ? "SUSPENDED" : u.subscriptionStatus, u._count?.cloudDeployments ?? 0, new Date(u.createdAt).toLocaleDateString()]);
    const csv = [headers, ...rows].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `users-${Date.now()}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  async function suspend(id: string) { const r = prompt("Suspension reason?") ?? "manual"; await cloudApi.admin.suspend(id, r); load(); addToast({ type: "success", title: "User suspended" }); }
  async function activate(id: string) { await cloudApi.admin.activate(id); load(); addToast({ type: "success", title: "User activated" }); }
  async function del(id: string, email: string) {
    if (!confirm(`Permanently delete ${email}? This cannot be undone.`)) return;
    await cloudApi.admin.deleteUser(id); load();
    addToast({ type: "success", title: "User deleted" });
  }
  async function changePlan(id: string, planId: string) {
    await cloudApi.admin.setPlan(id, planId || null); load();
    addToast({ type: "success", title: "Plan updated" });
  }
  async function resetPw(id: string, email: string) {
    if (!confirm(`Send password reset email to ${email}?`)) return;
    await cloudApi.admin.resetPassword(id);
    addToast({ type: "success", title: "Reset email sent", message: `Password reset email sent to ${email}.` });
  }
  async function impersonate(id: string, email: string) {
    if (!confirm(`Impersonate ${email}? You will be logged in as this user.`)) return;
    const r = await cloudApi.admin.impersonate(id);
    localStorage.setItem("amer_token", r.access_token);
    localStorage.setItem("amer_user", JSON.stringify(r.user));
    router.push("/voidcloud/user/dashboard");
  }
  async function create() {
    if (!draft.email || !draft.name || draft.password.length < 8) { addToast({ type: "error", title: "Validation error", message: "Email, name, and 8+ char password required." }); return; }
    await cloudApi.admin.createUser({ ...draft, planId: draft.planId || null });
    setCreating(false); setDraft({ email: "", name: "", password: "", role: "USER", planId: "" });
    load(); addToast({ type: "success", title: "User created" });
  }

  async function openQuota(u: any) {
    setQuotaUser(u); setLoadingQuota(true); setQuota(null);
    try {
      const tenantId = u.tenantId || u.id;
      const q = await cloudApi.admin.quota(tenantId);
      setQuota(q);
    } catch (e) { setQuota(null); }
    finally { setLoadingQuota(false); }
  }

  const toggleAll = () => {
    if (selectedIds.size === filtered.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(filtered.map((u) => u.id)));
  };

  return (
    <ErrorBoundary>
      <div>
        <div className="mb-6 flex items-center justify-between gap-3">
          <div>
            <h1 className="vc-h1">Users</h1>
            {lastUpdated && (
              <p className="text-xs text-white/50 mt-1">Last updated: {lastUpdated.toLocaleTimeString()}</p>
            )}
          </div>
          <div className="flex gap-2">
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name or email…" className="w-80 rounded-lg border border-white/10 bg-slate-950/60 px-3 py-2" aria-label="Search users" />
            <button onClick={() => setCreating(true)} className="vc-btn vc-btn-primary"><Plus className="size-4" />New user</button>
          </div>
        </div>

        <div className="mb-3 flex flex-wrap items-center gap-2">
          {selectedIds.size > 0 && (
            <>
              <span className="text-xs text-white/60">{selectedIds.size} selected</span>
              <button disabled={bulkLoading} onClick={bulkSuspend} className="rounded-lg border border-yellow-500/40 px-3 py-1.5 text-xs text-yellow-300 hover:bg-yellow-500/10 disabled:opacity-50">{bulkLoading ? "Working…" : "Bulk suspend"}</button>
              <button disabled={bulkLoading} onClick={bulkDelete} className="rounded-lg border border-red-500/30 px-3 py-1.5 text-xs text-red-300 hover:bg-red-500/10 disabled:opacity-50">{bulkLoading ? "Working…" : "Bulk delete"}</button>
              <button onClick={exportCSV} className="rounded-lg border border-white/10 px-3 py-1.5 text-xs hover:bg-white/10">Export CSV</button>
            </>
          )}
          <div className="ml-auto flex items-center gap-2">
            <button onClick={() => setShowFilterSave((s) => !s)} className="rounded-lg border border-white/10 px-3 py-1.5 text-xs hover:bg-white/10">Save filter</button>
            {savedFilters.map((f) => (
              <button key={f.id} onClick={() => applyFilter(f.query)} className="rounded-lg border border-white/10 px-3 py-1.5 text-xs hover:bg-white/10">{f.name}</button>
            ))}
          </div>
          <div className="relative">
            <button onClick={() => setShowColMenu((s) => !s)} className="rounded-lg border border-white/10 px-3 py-1.5 text-xs hover:bg-white/10">Columns</button>
            {showColMenu && (
              <div className="absolute right-0 top-full z-50 mt-1 w-48 rounded-xl border border-border bg-card p-2 shadow-lg">
                {Object.entries({ name: "Name / Email", plan: "Plan", status: "Status", vps: "VPS", joined: "Joined", actions: "Actions" }).map(([key, label]) => (
                  <label key={key} className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-muted cursor-pointer">
                    <input type="checkbox" checked={!!columnVisibility[key as keyof typeof columnVisibility]} onChange={() => setColumnVisibility((v) => ({ ...v, [key]: !v[key as keyof typeof columnVisibility] }))} className="rounded border-border" />
                    <span>{label}</span>
                  </label>
                ))}
              </div>
            )}
          </div>
        </div>

        {showFilterSave && (
          <div className="mb-3 flex items-center gap-2">
            <input value={filterName} onChange={(e) => setFilterName(e.target.value)} placeholder="Filter name" className="rounded-md border border-border bg-background px-3 py-1.5 text-sm" />
            <button onClick={saveFilter} className="rounded-lg border border-white/10 px-3 py-1.5 text-xs hover:bg-white/10">Save</button>
            <button onClick={() => setShowFilterSave(false)} className="rounded-lg border border-white/10 px-3 py-1.5 text-xs hover:bg-white/10">Cancel</button>
          </div>
        )}

        <div className="overflow-x-auto vc-card">
          <table className="w-full text-sm" role="grid" aria-label="Users table">
            <thead className="vc-label border-b border-white/10 text-left">
              <tr>
                <th className="w-10 px-3"><input type="checkbox" checked={selectedIds.size === filtered.length && filtered.length > 0} onChange={toggleAll} className="rounded border-border" aria-label="Select all" /></th>
                {columnVisibility.name && <th className="p-4">Name / Email</th>}
                {columnVisibility.plan && <th>Plan</th>}
                {columnVisibility.status && <th>Status</th>}
                {columnVisibility.vps && <th>VPS</th>}
                {columnVisibility.joined && <th>Joined</th>}
                {columnVisibility.actions && <th className="p-4">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {loading && <TableSkeleton rows={6} cols={7} />}
              {!loading && filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-6">
                    <EmptyState
                      icon={<Users className="size-6" />}
                      title={q ? "No users match your search" : "No users yet"}
                      description={q ? "Try a different name or email, or clear the search filter." : "Create the first account to start onboarding tenants."}
                      action={
                        q
                          ? <button onClick={() => setQ("")} className="vc-btn vc-btn-secondary">Clear search</button>
                          : <button onClick={() => setCreating(true)} className="vc-btn vc-btn-primary">New user</button>
                      }
                      className="py-6"
                    />
                  </td>
                </tr>
              )}
              {filtered.map((u) => (
                <tr key={u.id} className={`border-b border-white/5 ${selectedIds.has(u.id) ? "bg-primary/5" : ""}`}>
                  <td className="px-3"><input type="checkbox" checked={selectedIds.has(u.id)} onChange={() => { const next = new Set(selectedIds); if (next.has(u.id)) next.delete(u.id); else next.add(u.id); setSelectedIds(next); }} className="rounded border-border" aria-label={`Select ${u.name}`} /></td>
                  {columnVisibility.name && <td className="p-4"><div className="font-medium">{u.name}</div><div className="text-xs text-white/50">{u.email}</div></td>}
                  {columnVisibility.plan && (
                    <td>
                      <select value={u.cloudPlanId ?? ""} onChange={(e) => changePlan(u.id, e.target.value)} className="rounded border border-white/10 bg-slate-950/60 px-2 py-1 text-xs" aria-label={`Plan for ${u.name}`}>
                        <option value="">— none —</option>
                        {plans.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                      </select>
                    </td>
                  )}
                  {columnVisibility.status && (
                    <td>
                      <span className={`rounded-full border px-2 py-0.5 text-xs ${u.subscriptionStatus === "ACTIVE" ? "border-green-500/30 bg-green-500/10 text-green-300" : u.suspendedAt ? "border-red-500/30 bg-red-500/10 text-red-300" : "border-yellow-500/30 bg-yellow-500/10 text-yellow-300"}`}>{u.suspendedAt ? "SUSPENDED" : u.subscriptionStatus}</span>
                    </td>
                  )}
                  {columnVisibility.vps && <td>{u._count?.cloudDeployments ?? 0}</td>}
                  {columnVisibility.joined && <td className="text-white/60">{new Date(u.createdAt).toLocaleDateString()}</td>}
                  {columnVisibility.actions && (
                    <td className="space-x-3 whitespace-nowrap p-4 text-xs">
                      <button onClick={() => u.suspendedAt ? activate(u.id) : suspend(u.id)} className={`${u.suspendedAt ? "text-green-300" : "text-yellow-300"} hover:underline`}>{u.suspendedAt ? "Activate" : "Suspend"}</button>
                      <button onClick={() => resetPw(u.id, u.email)} className="text-cyan-300 hover:underline">Reset PW</button>
                      <button onClick={() => impersonate(u.id, u.email)} className="text-fuchsia-300 hover:underline">Impersonate</button>
                      <button onClick={() => openQuota(u)} className="text-emerald-300 hover:underline">Quota</button>
                      <button onClick={() => del(u.id, u.email)} className="text-red-300 hover:underline">Delete</button>
                      <button onClick={() => router.push(`/voidcloud/admin/users/${u.id}`)} className="text-white/70 hover:underline">Activity</button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {quotaUser && (
          <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4" onClick={() => { setQuotaUser(null); setQuota(null); }}>
            <div className="w-full max-w-lg rounded-2xl border border-white/10 bg-slate-900 p-6" onClick={(e) => e.stopPropagation()}>
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-xl font-bold">Quota — {quotaUser.name}</h2>
                <button onClick={() => { setQuotaUser(null); setQuota(null); }} className="text-white/50 hover:text-white">✕</button>
              </div>
              {loadingQuota ? <p className="text-sm text-white/50">Loading quota…</p> : quota ? (
                <div className="space-y-3">
                  <QRow label="VPS count" used={quota.currentVpsCount} limit={quota.maxVpsCount} unit="" />
                  <QRow label="CPU" used={quota.currentCpu} limit={quota.maxCpu} unit="cores" />
                  <QRow label="RAM" used={quota.currentRamMb} limit={quota.maxRamMb} unit="MB" />
                  <QRow label="Disk" used={quota.currentDiskGb} limit={quota.maxDiskGb} unit="GB" />
                </div>
              ) : <p className="text-sm text-white/50">No quota record found.</p>}
            </div>
          </div>
        )}

        {creating && (
          <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4" onClick={() => setCreating(false)}>
            <div className="w-full max-w-lg rounded-2xl border border-white/10 bg-slate-900 p-6" onClick={(e) => e.stopPropagation()}>
              <h2 className="mb-4 text-xl font-bold">New user</h2>
              <div className="space-y-3">
                <input className={inp} placeholder="Email" value={draft.email} onChange={(e) => setDraft({ ...draft, email: e.target.value })} />
                <input className={inp} placeholder="Full name" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
                <input className={inp} type="password" placeholder="Password (8+ chars)" value={draft.password} onChange={(e) => setDraft({ ...draft, password: e.target.value })} />
                <select className={inp} value={draft.role} onChange={(e) => setDraft({ ...draft, role: e.target.value })}>
                  <option value="USER">USER</option>
                  <option value="ADMIN">ADMIN</option>
                  <option value="SUPER_ADMIN">SUPER_ADMIN</option>
                </select>
                <select className={inp} value={draft.planId} onChange={(e) => setDraft({ ...draft, planId: e.target.value })}>
                  <option value="">— no plan (trial) —</option>
                  {plans.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div className="mt-4 flex justify-end gap-2">
                <button onClick={() => setCreating(false)} className="vc-btn vc-btn-secondary">Cancel</button>
                <button onClick={create} className="vc-btn vc-btn-primary">Create</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </ErrorBoundary>
  );
}

function QRow({ label, used, limit, unit }: { label: string; used: number; limit: number; unit: string }) {
  const pct = limit > 0 ? Math.min(100, (used / limit) * 100) : 0;
  const color = pct > 90 ? "from-red-500 to-orange-500" : pct > 70 ? "from-yellow-400 to-orange-500" : "from-cyan-400 to-fuchsia-500";
  return (
    <div>
      <div className="flex justify-between text-sm"><span className="text-white/60">{label}</span><span className="font-mono">{used} / {limit} {unit}</span></div>
      <div className="mt-1 h-2 overflow-hidden rounded-full bg-white/10">
        <div className={`h-full bg-gradient-to-r ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
const inp = "w-full rounded-lg border border-white/10 bg-slate-950/60 px-3 py-2";

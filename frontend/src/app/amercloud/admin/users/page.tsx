/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { cloudApi, CloudPlan } from "@/lib/cloud";

export default function AdminUsersPage() {
  const router = useRouter();
  const [users, setUsers] = useState<any[]>([]);
  const [plans, setPlans] = useState<CloudPlan[]>([]);
  const [q, setQ] = useState("");
  const [creating, setCreating] = useState(false);
  const [draft, setDraft] = useState({ email: "", name: "", password: "", role: "USER", planId: "" });

  const load = useCallback(async () => { setUsers(await cloudApi.admin.users(q)); }, [q]);
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => { load(); }, [load]);
  /* eslint-enable react-hooks/set-state-in-effect */
  useEffect(() => { cloudApi.admin.plans().then(setPlans).catch(() => {}); }, []);

  async function suspend(id: string) { const r = prompt("Suspension reason?") ?? "manual"; await cloudApi.admin.suspend(id, r); load(); }
  async function activate(id: string) { await cloudApi.admin.activate(id); load(); }
  async function del(id: string, email: string) {
    if (!confirm(`Permanently delete ${email}? This cannot be undone.`)) return;
    await cloudApi.admin.deleteUser(id); load();
  }
  async function changePlan(id: string, planId: string) {
    await cloudApi.admin.setPlan(id, planId || null); load();
  }
  async function resetPw(id: string, email: string) {
    if (!confirm(`Send password reset email to ${email}?`)) return;
    await cloudApi.admin.resetPassword(id);
    alert("Reset email sent.");
  }
  async function impersonate(id: string, email: string) {
    if (!confirm(`Impersonate ${email}? You will be logged in as this user.`)) return;
    const r = await cloudApi.admin.impersonate(id);
    localStorage.setItem("amer_token", r.access_token);
    localStorage.setItem("amer_user", JSON.stringify(r.user));
    router.push("/amercloud/user/dashboard");
  }
  async function create() {
    if (!draft.email || !draft.name || draft.password.length < 8) { alert("Email, name, and 8+ char password required."); return; }
    await cloudApi.admin.createUser({ ...draft, planId: draft.planId || null });
    setCreating(false); setDraft({ email: "", name: "", password: "", role: "USER", planId: "" });
    load();
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between gap-3">
        <h1 className="text-3xl font-bold">Users</h1>
        <div className="flex gap-2">
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name or email…" className="w-80 rounded-lg border border-white/10 bg-slate-950/60 px-3 py-2" />
          <button onClick={() => setCreating(true)} className="rounded-lg bg-gradient-to-r from-cyan-400 to-fuchsia-500 px-4 py-2 font-semibold text-slate-950">+ New user</button>
        </div>
      </div>
      <div className="overflow-x-auto rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl">
        <table className="w-full text-sm">
          <thead className="border-b border-white/5 text-left text-xs uppercase text-white/40">
            <tr><th className="p-4">Name / Email</th><th>Plan</th><th>Status</th><th>VPS</th><th>Joined</th><th className="p-4">Actions</th></tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-b border-white/5">
                <td className="p-4"><div className="font-medium">{u.name}</div><div className="text-xs text-white/50">{u.email}</div></td>
                <td>
                  <select value={u.cloudPlanId ?? ""} onChange={(e) => changePlan(u.id, e.target.value)} className="rounded border border-white/10 bg-slate-950/60 px-2 py-1 text-xs">
                    <option value="">— none —</option>
                    {plans.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </td>
                <td><span className={`rounded-full border px-2 py-0.5 text-xs ${u.subscriptionStatus === "ACTIVE" ? "border-green-500/30 bg-green-500/10 text-green-300" : u.suspendedAt ? "border-red-500/30 bg-red-500/10 text-red-300" : "border-yellow-500/30 bg-yellow-500/10 text-yellow-300"}`}>{u.suspendedAt ? "SUSPENDED" : u.subscriptionStatus}</span></td>
                <td>{u._count?.cloudDeployments ?? 0}</td>
                <td className="text-white/60">{new Date(u.createdAt).toLocaleDateString()}</td>
                <td className="space-x-3 whitespace-nowrap p-4 text-xs">
                  {u.suspendedAt
                    ? <button onClick={() => activate(u.id)} className="text-green-300 hover:underline">Activate</button>
                    : <button onClick={() => suspend(u.id)} className="text-yellow-300 hover:underline">Suspend</button>}
                  <button onClick={() => resetPw(u.id, u.email)} className="text-cyan-300 hover:underline">Reset PW</button>
                  <button onClick={() => impersonate(u.id, u.email)} className="text-fuchsia-300 hover:underline">Impersonate</button>
                  <button onClick={() => del(u.id, u.email)} className="text-red-300 hover:underline">Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

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
              <button onClick={() => setCreating(false)} className="rounded-lg border border-white/10 px-4 py-2">Cancel</button>
              <button onClick={create} className="rounded-lg bg-gradient-to-r from-cyan-400 to-fuchsia-500 px-6 py-2 font-semibold text-slate-950">Create</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
const inp = "w-full rounded-lg border border-white/10 bg-slate-950/60 px-3 py-2";

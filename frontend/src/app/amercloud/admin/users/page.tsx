/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars, react-hooks/set-state-in-effect, react-hooks/exhaustive-deps, react/no-unescaped-entities */
"use client";
import { useEffect, useState } from "react";
import { cloudApi } from "@/lib/cloud";

export default function AdminUsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [q, setQ] = useState("");
  const [sel, setSel] = useState<any>(null);

  async function load() { setUsers(await cloudApi.admin.users(q)); }
  useEffect(() => { load(); }, [q]);

  async function suspend(id: string) { const r = prompt("Suspension reason?") ?? "manual"; await cloudApi.admin.suspend(id, r); load(); }
  async function activate(id: string) { await cloudApi.admin.activate(id); load(); }
  async function extend(id: string) { const d = +(prompt("Extend trial by how many days?", "7") || "0"); if (d) { await cloudApi.admin.extendTrial(id, d); load(); } }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-3xl font-bold">Users</h1>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name or email…" className="w-80 rounded-lg border border-white/10 bg-slate-950/60 px-3 py-2" />
      </div>
      <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl">
        <table className="w-full text-sm">
          <thead className="border-b border-white/5 text-left text-xs uppercase text-white/40">
            <tr><th className="p-4">Name / Email</th><th>Plan</th><th>Status</th><th>Deploys</th><th>Joined</th><th></th></tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-b border-white/5">
                <td className="p-4"><div className="font-medium">{u.name}</div><div className="text-xs text-white/50">{u.email}</div></td>
                <td>{u.cloudPlan?.name ?? "—"}</td>
                <td><span className={`rounded-full border px-2 py-0.5 text-xs ${u.subscriptionStatus === "ACTIVE" ? "border-green-500/30 bg-green-500/10 text-green-300" : "border-yellow-500/30 bg-yellow-500/10 text-yellow-300"}`}>{u.subscriptionStatus}</span></td>
                <td>{u._count?.cloudDeployments ?? 0}</td>
                <td className="text-white/60">{new Date(u.createdAt).toLocaleDateString()}</td>
                <td className="space-x-2 p-4">
                  {u.suspendedAt ? <button onClick={() => activate(u.id)} className="text-green-300 hover:underline">Activate</button>
                                 : <button onClick={() => suspend(u.id)} className="text-red-300 hover:underline">Suspend</button>}
                  <button onClick={() => extend(u.id)} className="text-cyan-300 hover:underline">Extend</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

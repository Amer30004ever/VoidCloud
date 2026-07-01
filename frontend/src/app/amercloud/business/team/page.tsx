"use client";

import { useEffect, useState, useCallback } from "react";
import api from "@/lib/api";

interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: string;
  status: "ACTIVE" | "SUSPENDED" | "INVITED";
  conversationCount?: number;
  createdAt: string;
}

const ROLE_COLORS: Record<string, string> = {
  ADMIN: "bg-blue-500/10 text-blue-300 border-blue-500/20",
  AGENT: "bg-violet-500/10 text-violet-300 border-violet-500/20",
  USER: "bg-slate-500/10 text-slate-400 border-slate-500/20",
};

const inp = "w-full rounded-lg border border-white/10 bg-slate-950/60 px-3 py-2 text-sm outline-none focus:border-blue-400/50";

export default function BusinessTeamPage() {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviting, setInviting] = useState(false);
  const [draft, setDraft] = useState({ email: "", name: "", role: "AGENT" });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await api.get("/business/team");
      setMembers(Array.isArray(r.data) ? r.data : (r.data?.members ?? []));
    } catch { setMembers([]); } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function invite() {
    if (!draft.email || !draft.name) { alert("Email and name required."); return; }
    setSaving(true);
    try {
      await api.post("/business/team/invite", draft);
      setInviting(false);
      setDraft({ email: "", name: "", role: "AGENT" });
      load();
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      alert(err?.response?.data?.message ?? "Failed to invite");
    } finally { setSaving(false); }
  }

  async function removeMember(id: string, name: string) {
    if (!confirm(`Remove ${name} from your team?`)) return;
    await api.delete(`/business/team/${id}`);
    load();
  }

  async function toggleStatus(id: string, current: string) {
    await api.patch(`/business/team/${id}`, { status: current === "ACTIVE" ? "SUSPENDED" : "ACTIVE" });
    load();
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white">Team</h1>
          <p className="mt-1 text-sm text-white/40">Manage your agents and administrators</p>
        </div>
        <button onClick={() => setInviting(true)} className="rounded-xl bg-gradient-to-r from-blue-500 to-violet-500 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-blue-500/20">+ Invite Member</button>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Total Members", value: members.length },
          { label: "Active", value: members.filter(m => m.status === "ACTIVE").length },
          { label: "Agents", value: members.filter(m => m.role === "AGENT").length },
        ].map((s) => (
          <div key={s.label} className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <p className="text-xs text-white/40">{s.label}</p>
            <p className="mt-1 text-2xl font-bold">{s.value}</p>
          </div>
        ))}
      </div>

      <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/5">
        {loading ? (
          <div className="space-y-0.5 p-3">{[1,2,3].map(i => <div key={i} className="h-16 animate-pulse rounded-xl bg-white/5" />)}</div>
        ) : members.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-3xl mb-3">👥</p>
            <p className="text-sm text-white/50">No team members yet</p>
            <button onClick={() => setInviting(true)} className="mt-4 rounded-xl bg-gradient-to-r from-blue-500 to-violet-500 px-4 py-2 text-sm font-semibold text-white">Invite first agent</button>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-white/5">
              <tr className="text-[11px] uppercase tracking-wider text-white/30">
                <th className="px-5 py-3 text-left">Member</th>
                <th className="py-3">Role</th>
                <th className="hidden py-3 md:table-cell">Conversations</th>
                <th className="py-3">Status</th>
                <th className="py-3">Joined</th>
                <th className="py-3 pr-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {members.map((m) => (
                <tr key={m.id} className="border-t border-white/5 hover:bg-white/[0.03]">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-gradient-to-br from-blue-500/20 to-violet-500/20 text-sm font-bold text-white">
                        {m.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-semibold text-white">{m.name}</p>
                        <p className="text-xs text-white/40">{m.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-4">
                    <span className={`rounded border px-2 py-0.5 text-xs font-medium ${ROLE_COLORS[m.role] ?? ROLE_COLORS.USER}`}>{m.role}</span>
                  </td>
                  <td className="hidden py-4 text-center text-sm text-white/60 md:table-cell">{m.conversationCount ?? 0}</td>
                  <td className="py-4">
                    <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${m.status === "ACTIVE" ? "bg-emerald-500/10 text-emerald-300" : m.status === "INVITED" ? "bg-amber-500/10 text-amber-300" : "bg-red-500/10 text-red-300"}`}>
                      {m.status}
                    </span>
                  </td>
                  <td className="py-4 text-xs text-white/40">{new Date(m.createdAt).toLocaleDateString()}</td>
                  <td className="py-4 pr-5 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={() => toggleStatus(m.id, m.status)} className={`text-xs hover:underline ${m.status === "ACTIVE" ? "text-amber-400" : "text-emerald-400"}`}>
                        {m.status === "ACTIVE" ? "Suspend" : "Activate"}
                      </button>
                      <button onClick={() => removeMember(m.id, m.name)} className="text-xs text-red-400 hover:underline">Remove</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {inviting && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4" onClick={() => setInviting(false)}>
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-slate-900 p-6" onClick={(e) => e.stopPropagation()}>
            <h2 className="mb-4 text-xl font-bold">Invite Team Member</h2>
            <div className="space-y-3">
              <input className={inp} placeholder="Full name" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
              <input className={inp} type="email" placeholder="Email address" value={draft.email} onChange={(e) => setDraft({ ...draft, email: e.target.value })} />
              <select className={inp} value={draft.role} onChange={(e) => setDraft({ ...draft, role: e.target.value })}>
                <option value="AGENT">Agent</option>
                <option value="ADMIN">Admin</option>
              </select>
            </div>
            <p className="mt-3 text-xs text-white/40">An invitation email will be sent with login instructions.</p>
            <div className="mt-4 flex justify-end gap-2">
              <button onClick={() => setInviting(false)} className="rounded-lg border border-white/10 px-4 py-2 text-sm">Cancel</button>
              <button onClick={invite} disabled={saving} className="rounded-xl bg-gradient-to-r from-blue-500 to-violet-500 px-6 py-2 text-sm font-semibold text-white disabled:opacity-60">
                {saving ? "Sending…" : "Send Invite"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

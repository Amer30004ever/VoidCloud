/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { cloudOrgs, type OrgMember, type OrgRole } from "@/lib/cloud";

const ROLES: OrgRole[] = ["ADMIN", "MEMBER", "VIEWER"];

export default function OrgPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [org, setOrg] = useState<any>(null);
  const [members, setMembers] = useState<OrgMember[]>([]);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<OrgRole>("MEMBER");
  const [msg, setMsg] = useState("");

  const refresh = useCallback(async () => {
    try {
      const [o, m] = await Promise.all([cloudOrgs.get(id), cloudOrgs.members(id)]);
      setOrg(o); setMembers(m);
    } catch (e: any) { setMsg(e?.response?.data?.message ?? "Failed to load"); }
  }, [id]);
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { if (id) refresh(); }, [id, refresh]);

  async function run(fn: () => Promise<any>, ok: string) {
    setMsg("");
    try { await fn(); setMsg(ok); await refresh(); }
    catch (e: any) { setMsg(e?.response?.data?.message ?? "Failed"); }
  }

  if (!org) return <p className="text-white/50">Loading…</p>;

  const myRole: OrgRole | undefined = org.members?.find((m: any) => m.user)?.role;

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold">{org.name}</h1>
          <p className="text-sm text-white/50">/{org.slug} · {org._count?.vps ?? 0} VPS · {members.length} members</p>
        </div>
        <button
          onClick={async () => { const name = prompt("Rename organization", org.name); if (name) run(() => cloudOrgs.update(id, { name }), "Renamed"); }}
          className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm">Rename</button>
      </div>

      {msg && <div className="rounded-lg border border-cyan-400/30 bg-cyan-400/10 p-2 text-xs">{msg}</div>}

      <section className="rounded-2xl border border-white/10 bg-white/5 p-5">
        <h2 className="mb-3 font-semibold">Invite member</h2>
        <div className="flex gap-2 flex-wrap">
          <input className="flex-1 min-w-[200px] rounded-lg border border-white/10 bg-slate-950/60 px-3 py-2 text-sm" placeholder="email@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
          <select className="rounded-lg border border-white/10 bg-slate-950/60 px-3 py-2 text-sm" value={role} onChange={(e) => setRole(e.target.value as OrgRole)}>
            {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
          <button onClick={() => run(() => cloudOrgs.invite(id, email, role).then(() => setEmail("")), "Invitation sent")} className="rounded-lg bg-gradient-to-r from-cyan-400 to-fuchsia-500 px-4 py-2 text-sm font-semibold text-slate-950">Invite</button>
        </div>
      </section>

      <section className="rounded-2xl border border-white/10 bg-white/5 p-5">
        <h2 className="mb-3 font-semibold">Members ({members.length})</h2>
        <div className="space-y-2">
          {members.map((m) => (
            <div key={m.userId} className="flex items-center justify-between gap-3 rounded-lg border border-white/10 bg-slate-950/40 p-3">
              <div>
                <div className="font-semibold text-sm">{m.user.name || m.user.email}</div>
                <div className="text-xs text-white/50">{m.user.email}</div>
              </div>
              <div className="flex items-center gap-2">
                {m.role === "OWNER" ? (
                  <span className="rounded bg-amber-400/20 px-2 py-1 text-xs text-amber-200">OWNER</span>
                ) : (
                  <select disabled={myRole !== "OWNER"} value={m.role} onChange={(e) => run(() => cloudOrgs.setRole(id, m.userId, e.target.value as OrgRole), "Role updated")}
                    className="rounded border border-white/10 bg-slate-950 px-2 py-1 text-xs">
                    {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                  </select>
                )}
                {m.role !== "OWNER" && (
                  <button onClick={() => { if (confirm("Remove member?")) run(() => cloudOrgs.removeMember(id, m.userId), "Removed"); }}
                    className="rounded border border-red-500/30 bg-red-500/10 px-2 py-1 text-xs text-red-300">×</button>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      {org.invitations?.length > 0 && (
        <section className="rounded-2xl border border-white/10 bg-white/5 p-5">
          <h2 className="mb-3 font-semibold">Pending invitations</h2>
          <div className="space-y-2">
            {org.invitations.map((inv: any) => (
              <div key={inv.id} className="flex items-center justify-between rounded-lg border border-white/10 bg-slate-950/40 p-3 text-sm">
                <div>{inv.email} <span className="text-xs text-white/50">· {inv.role}</span></div>
                <button onClick={() => run(() => cloudOrgs.revokeInvite(inv.id), "Revoked")} className="rounded border border-red-500/30 bg-red-500/10 px-2 py-1 text-xs text-red-300">Revoke</button>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="rounded-2xl border border-red-500/30 bg-red-500/5 p-5">
        <h2 className="mb-2 font-semibold text-red-300">Danger zone</h2>
        <button
          onClick={() => { if (confirm(`Delete ${org.name}? This cannot be undone.`)) cloudOrgs.remove(id).then(() => router.push("/amercloud/dashboard")); }}
          className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">Delete organization</button>
      </section>
    </div>
  );
}

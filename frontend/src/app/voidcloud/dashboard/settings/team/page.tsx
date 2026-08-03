"use client";
import { useEffect, useState } from "react";
import api from "@/lib/api";
import { cloudBusiness, cloudApiKeys, type TeamMember } from "@/features/vps/cloud";
import { useTrackPageView } from "@/hooks/useTrackPageView";

export default function TeamPage() {
  useTrackPageView();
  const [role, setRole] = useState<string | null>(null);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api.get("/auth/me").then((r) => setRole(r.data?.role ?? null)).catch(() => setRole(null));
    refresh();
  }, []);

  async function refresh() {
    try {
      const data = await cloudBusiness.listTeam();
      setMembers(data);
    } catch {
      setMembers([]);
    }
  }

  async function invite(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;
    setMsg(null); setBusy(true);
    try {
      await cloudBusiness.inviteTeamMember(email);
      setMsg({ kind: "ok", text: "Invitation sent" });
      setEmail("");
      refresh();
    } catch (err: any) {
      setMsg({ kind: "err", text: err?.response?.data?.message ?? "Failed to send invite" });
    } finally { setBusy(false); }
  }

  async function deactivate(userId: string) {
    if (!confirm("Remove this member?")) return;
    setMsg(null);
    try {
      await cloudBusiness.deactivateMember(userId);
      setMsg({ kind: "ok", text: "Member removed" });
      refresh();
    } catch (err: any) {
      setMsg({ kind: "err", text: err?.response?.data?.message ?? "Failed to remove member" });
    }
  }

  if (role && role !== "ADMIN" && role !== "SUPER_ADMIN") {
    return <div className="p-8 text-center text-white/60">Access denied</div>;
  }

  return (
    <div>
      <h1 className="mb-6 vc-h1">Team</h1>
      {msg && <div className={`mb-4 rounded-lg p-3 text-sm ${msg.kind === "ok" ? "bg-emerald-500/10 text-emerald-300" : "bg-red-500/10 text-red-300"}`}>{msg.text}</div>}
      <form onSubmit={invite} className="mb-6 flex gap-2">
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="teammate@example.com"
          className="flex-1 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm"
        />
        <button disabled={busy} className="vc-btn vc-btn-primary disabled:opacity-50">
          Send Invite
        </button>
      </form>
      <div className="vc-card">
        <table className="w-full text-sm">
          <thead className="vc-label border-b border-white/10 text-left">
            <tr>
              <th className="p-4">Name</th>
              <th>Email</th>
              <th>Role</th>
              <th>Status</th>
              <th>Joined</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {members.map((m) => (
              <tr key={m.userId} className="border-b border-white/5">
                <td className="p-4">{m.name}</td>
                <td>{m.email}</td>
                <td className="capitalize">{m.role.toLowerCase()}</td>
                <td>{m.isActive ? "Active" : "Inactive"}</td>
                <td>{new Date(m.joinedAt).toLocaleDateString()}</td>
                <td className="p-4">
                  {m.isActive && (
                    <button onClick={() => deactivate(m.userId)} className="text-red-400 hover:underline">Remove</button>
                  )}
                </td>
              </tr>
            ))}
            {members.length === 0 && (
              <tr><td colSpan={6} className="p-8 text-center text-white/50">No team members yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

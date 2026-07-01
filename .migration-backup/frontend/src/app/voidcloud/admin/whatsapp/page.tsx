"use client";

import { useEffect, useState, useCallback } from "react";
import api from "@/lib/api";

interface Conversation {
  id: string;
  tenantName?: string;
  contactName: string;
  contactPhone: string;
  agentName?: string;
  status: "OPEN" | "CLOSED" | "PENDING" | "ESCALATED";
  lastMessage?: string;
  unreadCount?: number;
  createdAt: string;
  updatedAt: string;
}

interface CrmStats {
  totalConversations?: number;
  openConversations?: number;
  totalLeads?: number;
  totalTenants?: number;
}

const STATUS_COLORS: Record<string, string> = {
  OPEN: "bg-emerald-500/10 text-emerald-300 border-emerald-500/20",
  CLOSED: "bg-slate-500/10 text-slate-400 border-slate-500/20",
  PENDING: "bg-amber-500/10 text-amber-300 border-amber-500/20",
  ESCALATED: "bg-red-500/10 text-red-300 border-red-500/20",
};

export default function AdminWhatsappPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [stats, setStats] = useState<CrmStats>({});
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("ALL");
  const [search, setSearch] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [convRes, statsRes] = await Promise.allSettled([
        api.get("/admin/crm/conversations?limit=200"),
        api.get("/admin/crm/stats"),
      ]);
      if (convRes.status === "fulfilled") {
        const d = convRes.value.data;
        setConversations(Array.isArray(d) ? d : (d?.conversations ?? []));
      }
      if (statsRes.status === "fulfilled") setStats(statsRes.value.data ?? {});
    } catch {
      setConversations([]);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function closeConversation(id: string) {
    await api.patch(`/admin/crm/conversations/${id}`, { status: "CLOSED" });
    load();
  }

  async function escalate(id: string) {
    await api.patch(`/admin/crm/conversations/${id}`, { status: "ESCALATED" });
    load();
  }

  const filtered = conversations.filter((c) => {
    if (filter !== "ALL" && c.status !== filter) return false;
    if (search && !c.contactName.toLowerCase().includes(search.toLowerCase()) &&
      !c.contactPhone.includes(search) && !c.tenantName?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const FILTERS = ["ALL", "OPEN", "PENDING", "ESCALATED", "CLOSED"];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white">WhatsApp CRM Oversight</h1>
          <p className="mt-1 text-sm text-white/40">All conversations across all tenants</p>
        </div>
        <button onClick={load} className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/60 hover:bg-white/10">↻ Refresh</button>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: "Total Conversations", value: stats.totalConversations ?? conversations.length, color: "text-white" },
          { label: "Open", value: stats.openConversations ?? conversations.filter(c => c.status === "OPEN").length, color: "text-emerald-400" },
          { label: "Escalated", value: conversations.filter(c => c.status === "ESCALATED").length, color: "text-red-400" },
          { label: "Total Leads", value: stats.totalLeads ?? "—", color: "text-cyan-400" },
        ].map((s) => (
          <div key={s.label} className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <p className="text-xs text-white/40">{s.label}</p>
            <p className={`mt-1 text-2xl font-bold ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="flex gap-1 rounded-xl border border-white/10 bg-white/5 p-1">
          {FILTERS.map((f) => (
            <button key={f} onClick={() => setFilter(f)} className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${filter === f ? "bg-white/10 text-white" : "text-white/40 hover:text-white"}`}>{f}</button>
          ))}
        </div>
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search contact, phone, tenant…" className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-white/30 outline-none focus:border-red-400/50" />
      </div>

      <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/5">
        {loading ? (
          <div className="space-y-0.5 p-3">{[1,2,3,4].map(i => <div key={i} className="h-16 animate-pulse rounded-xl bg-white/5" />)}</div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-sm text-white/50">No conversations found</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-white/5">
              <tr className="text-[11px] uppercase tracking-wider text-white/30">
                <th className="px-5 py-3 text-left">Contact</th>
                <th className="hidden py-3 text-left md:table-cell">Tenant</th>
                <th className="hidden py-3 text-left lg:table-cell">Agent</th>
                <th className="py-3">Status</th>
                <th className="hidden py-3 text-left lg:table-cell">Last message</th>
                <th className="py-3">Updated</th>
                <th className="py-3 pr-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => (
                <tr key={c.id} className="border-t border-white/5 hover:bg-white/[0.03]">
                  <td className="px-5 py-3">
                    <div className="font-medium text-white">{c.contactName}</div>
                    <div className="font-mono text-xs text-white/40">{c.contactPhone}</div>
                  </td>
                  <td className="hidden py-3 text-xs text-white/50 md:table-cell">{c.tenantName ?? "—"}</td>
                  <td className="hidden py-3 text-xs text-white/50 lg:table-cell">{c.agentName ?? "Unassigned"}</td>
                  <td className="py-3">
                    <div className="flex items-center gap-1.5">
                      <span className={`rounded border px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[c.status] ?? STATUS_COLORS.OPEN}`}>{c.status}</span>
                      {(c.unreadCount ?? 0) > 0 && <span className="rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] font-bold text-white">{c.unreadCount}</span>}
                    </div>
                  </td>
                  <td className="hidden max-w-[200px] truncate py-3 text-xs text-white/40 lg:table-cell">{c.lastMessage ?? "—"}</td>
                  <td className="py-3 text-xs text-white/40 whitespace-nowrap">{new Date(c.updatedAt).toLocaleString()}</td>
                  <td className="py-3 pr-5 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {c.status !== "CLOSED" && <button onClick={() => closeConversation(c.id)} className="text-xs text-slate-400 hover:underline">Close</button>}
                      {c.status === "OPEN" && <button onClick={() => escalate(c.id)} className="text-xs text-red-400 hover:underline">Escalate</button>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

"use client";

import { useEffect, useState, useCallback } from "react";
import api from "@/lib/api";

interface Conversation {
  id: string;
  contactName: string;
  contactPhone: string;
  agentName?: string;
  status: "OPEN" | "CLOSED" | "PENDING" | "ESCALATED";
  lastMessage?: string;
  unreadCount?: number;
  updatedAt: string;
}

interface Lead {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  stage: "NEW" | "CONTACTED" | "QUALIFIED" | "PROPOSAL" | "WON" | "LOST";
  value?: number;
  assignedAgentName?: string;
  createdAt: string;
}

const STAGE_COLORS: Record<string, string> = {
  NEW: "bg-slate-500/10 text-slate-300",
  CONTACTED: "bg-blue-500/10 text-blue-300",
  QUALIFIED: "bg-violet-500/10 text-violet-300",
  PROPOSAL: "bg-amber-500/10 text-amber-300",
  WON: "bg-emerald-500/10 text-emerald-300",
  LOST: "bg-red-500/10 text-red-300",
};

const STATUS_COLORS: Record<string, string> = {
  OPEN: "text-emerald-300",
  PENDING: "text-amber-300",
  ESCALATED: "text-red-300",
  CLOSED: "text-slate-400",
};

export default function BusinessCrmPage() {
  const [tab, setTab] = useState<"conversations" | "leads">("conversations");
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [convR, leadsR] = await Promise.allSettled([
        api.get("/crm/conversations?limit=100"),
        api.get("/crm/leads?limit=100"),
      ]);
      if (convR.status === "fulfilled") {
        const d = convR.value.data;
        setConversations(Array.isArray(d) ? d : (d?.conversations ?? []));
      }
      if (leadsR.status === "fulfilled") {
        const d = leadsR.value.data;
        setLeads(Array.isArray(d) ? d : (d?.leads ?? []));
      }
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filteredConv = conversations.filter((c) =>
    !search || c.contactName.toLowerCase().includes(search.toLowerCase()) || c.contactPhone.includes(search)
  );
  const filteredLeads = leads.filter((l) =>
    !search || l.name.toLowerCase().includes(search.toLowerCase()) || (l.email ?? "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white">WhatsApp CRM</h1>
          <p className="mt-1 text-sm text-white/40">Conversations and leads for your business</p>
        </div>
        <button onClick={load} className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/60 hover:bg-white/10">↻ Refresh</button>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: "Total Conv.", value: conversations.length },
          { label: "Open", value: conversations.filter(c => c.status === "OPEN").length },
          { label: "Total Leads", value: leads.length },
          { label: "Won Deals", value: leads.filter(l => l.stage === "WON").length },
        ].map((s) => (
          <div key={s.label} className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <p className="text-xs text-white/40">{s.label}</p>
            <p className="mt-1 text-2xl font-bold">{s.value}</p>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-3">
        <div className="flex gap-1 rounded-xl border border-white/10 bg-white/5 p-1">
          <button onClick={() => setTab("conversations")} className={`rounded-lg px-4 py-1.5 text-sm font-medium transition ${tab === "conversations" ? "bg-white/10 text-white" : "text-white/40 hover:text-white"}`}>Conversations</button>
          <button onClick={() => setTab("leads")} className={`rounded-lg px-4 py-1.5 text-sm font-medium transition ${tab === "leads" ? "bg-white/10 text-white" : "text-white/40 hover:text-white"}`}>Leads</button>
        </div>
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search…" className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-white/30 outline-none focus:border-blue-400/50" />
      </div>

      {tab === "conversations" && (
        <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/5">
          {loading ? (
            <div className="space-y-0.5 p-3">{[1,2,3,4].map(i => <div key={i} className="h-16 animate-pulse rounded-xl bg-white/5" />)}</div>
          ) : filteredConv.length === 0 ? (
            <div className="p-12 text-center text-sm text-white/50">No conversations found</div>
          ) : (
            <div className="divide-y divide-white/5">
              {filteredConv.map((c) => (
                <div key={c.id} className="flex items-center gap-4 px-5 py-4 hover:bg-white/[0.03]">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-500/20 to-violet-500/20 text-sm font-bold">
                    {c.contactName.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-white">{c.contactName}</span>
                      {(c.unreadCount ?? 0) > 0 && <span className="rounded-full bg-blue-500 px-1.5 py-0.5 text-[10px] font-bold text-white">{c.unreadCount}</span>}
                    </div>
                    <div className="font-mono text-xs text-white/40">{c.contactPhone}</div>
                    {c.lastMessage && <div className="truncate text-xs text-white/30 mt-0.5">{c.lastMessage}</div>}
                  </div>
                  <div className="shrink-0 text-right">
                    <span className={`text-xs font-medium ${STATUS_COLORS[c.status]}`}>{c.status}</span>
                    <div className="mt-1 text-xs text-white/30">{new Date(c.updatedAt).toLocaleDateString()}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === "leads" && (
        <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/5">
          {loading ? (
            <div className="space-y-0.5 p-3">{[1,2,3].map(i => <div key={i} className="h-16 animate-pulse rounded-xl bg-white/5" />)}</div>
          ) : filteredLeads.length === 0 ? (
            <div className="p-12 text-center text-sm text-white/50">No leads found</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="border-b border-white/5">
                <tr className="text-[11px] uppercase tracking-wider text-white/30">
                  <th className="px-5 py-3 text-left">Lead</th>
                  <th className="py-3">Stage</th>
                  <th className="hidden py-3 md:table-cell">Agent</th>
                  <th className="hidden py-3 md:table-cell">Value</th>
                  <th className="py-3">Date</th>
                </tr>
              </thead>
              <tbody>
                {filteredLeads.map((l) => (
                  <tr key={l.id} className="border-t border-white/5 hover:bg-white/[0.03]">
                    <td className="px-5 py-3">
                      <p className="font-medium text-white">{l.name}</p>
                      <p className="text-xs text-white/40">{l.email ?? l.phone ?? "—"}</p>
                    </td>
                    <td className="py-3"><span className={`rounded-full px-2.5 py-1 text-xs font-medium ${STAGE_COLORS[l.stage]}`}>{l.stage}</span></td>
                    <td className="hidden py-3 text-xs text-white/50 md:table-cell">{l.assignedAgentName ?? "Unassigned"}</td>
                    <td className="hidden py-3 text-xs text-white/60 md:table-cell">{l.value ? `$${l.value.toLocaleString()}` : "—"}</td>
                    <td className="py-3 text-xs text-white/40">{new Date(l.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}

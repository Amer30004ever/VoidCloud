"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import api from "@/lib/api";

interface AgentStats {
  assignedConversations?: number;
  openConversations?: number;
  resolvedToday?: number;
  assignedLeads?: number;
  avgResponseTime?: string;
}

interface RecentConv {
  id: string;
  contactName: string;
  contactPhone: string;
  status: string;
  lastMessage?: string;
  updatedAt: string;
}

export default function AgentDashboard() {
  const [stats, setStats] = useState<AgentStats>({});
  const [recent, setRecent] = useState<RecentConv[]>([]);
  const [me, setMe] = useState<{ name?: string } | null>(null);

  useEffect(() => {
    api.get("/auth/me").then((r) => setMe(r.data)).catch(() => {});
    Promise.allSettled([
      api.get("/crm/conversations?limit=5&sort=updatedAt_desc"),
      api.get("/agent/stats"),
    ]).then(([convRes, statsRes]) => {
      if (convRes.status === "fulfilled") {
        const d = convRes.value.data;
        const list = Array.isArray(d) ? d : (d?.conversations ?? []);
        setRecent(list.slice(0, 5));
        setStats((s) => ({
          ...s,
          assignedConversations: d?.total ?? list.length,
          openConversations: list.filter((c: RecentConv) => c.status === "OPEN").length,
        }));
      }
      if (statsRes.status === "fulfilled") setStats((s) => ({ ...s, ...statsRes.value.data }));
    });
  }, []);

  const STATUS_COLORS: Record<string, string> = {
    OPEN: "text-emerald-400",
    PENDING: "text-amber-400",
    ESCALATED: "text-red-400",
    CLOSED: "text-slate-500",
  };

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-violet-500/20 bg-gradient-to-r from-violet-500/10 to-fuchsia-500/10 p-8 backdrop-blur-xl">
        <h1 className="text-3xl font-bold">
          {me?.name ? `Welcome, ${me.name.split(" ")[0]} 👋` : "Agent Dashboard 👋"}
        </h1>
        <p className="mt-2 text-white/60">Here&#39;s your conversation queue and today&#39;s activity.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Assigned Conversations", value: stats.assignedConversations ?? "—", icon: "💬", href: "/voidcloud/agent/conversations" },
          { label: "Open Now", value: stats.openConversations ?? "—", icon: "🟢", href: "/voidcloud/agent/conversations" },
          { label: "Resolved Today", value: stats.resolvedToday ?? "—", icon: "✅" },
          { label: "Assigned Leads", value: stats.assignedLeads ?? "—", icon: "🎯", href: "/voidcloud/agent/leads" },
        ].map((c) => {
          const inner = (
            <div className="rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-xl transition hover:border-violet-400/30 hover:bg-white/10">
              <div className="text-2xl">{c.icon}</div>
              <div className="mt-2 text-3xl font-bold">{c.value}</div>
              <div className="mt-1 text-xs uppercase text-white/50">{c.label}</div>
            </div>
          );
          return c.href ? <Link key={c.label} href={c.href}>{inner}</Link> : <div key={c.label}>{inner}</div>;
        })}
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Recent Conversations</h2>
          <Link href="/voidcloud/agent/conversations" className="text-xs text-violet-300 hover:underline">View all →</Link>
        </div>
        {recent.length === 0 ? (
          <p className="py-8 text-center text-sm text-white/40">No conversations assigned yet</p>
        ) : (
          <div className="divide-y divide-white/5">
            {recent.map((c) => (
              <Link key={c.id} href={`/voidcloud/agent/conversations?id=${c.id}`} className="flex items-center gap-4 py-3 hover:bg-white/[0.03] transition">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-500/20 to-fuchsia-500/20 text-sm font-bold">
                  {c.contactName.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-white">{c.contactName}</span>
                    <span className={`text-xs font-medium ${STATUS_COLORS[c.status] ?? "text-white/40"}`}>{c.status}</span>
                  </div>
                  <p className="truncate text-xs text-white/40">{c.lastMessage ?? c.contactPhone}</p>
                </div>
                <div className="shrink-0 text-xs text-white/30">{new Date(c.updatedAt).toLocaleDateString()}</div>
              </Link>
            ))}
          </div>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Link href="/voidcloud/agent/conversations" className="flex items-start gap-4 rounded-2xl border border-white/10 bg-white/5 p-5 transition hover:border-violet-400/30 hover:bg-white/10">
          <span className="text-2xl">💬</span>
          <div>
            <div className="font-semibold">Conversations</div>
            <div className="text-xs text-white/50">Manage your WhatsApp conversations queue</div>
          </div>
        </Link>
        <Link href="/voidcloud/agent/leads" className="flex items-start gap-4 rounded-2xl border border-white/10 bg-white/5 p-5 transition hover:border-violet-400/30 hover:bg-white/10">
          <span className="text-2xl">🎯</span>
          <div>
            <div className="font-semibold">Leads</div>
            <div className="text-xs text-white/50">Follow up on your assigned leads</div>
          </div>
        </Link>
      </div>
    </div>
  );
}

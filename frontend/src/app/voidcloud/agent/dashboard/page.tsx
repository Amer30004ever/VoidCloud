"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import { cloudAgent } from "@/features/vps/cloud";

type AgentKpis = {
  assignedConversations: number;
  openConversations: number;
  assignedLeads: number;
  leadStatusSummary: Record<string, number>;
};

const EMPTY: AgentKpis = { assignedConversations: 0, openConversations: 0, assignedLeads: 0, leadStatusSummary: {} };

export default function AgentDashboard() {
  const router = useRouter();
  const [role, setRole] = useState<string | null>(null);
  const [kpis, setKpis] = useState<AgentKpis>(EMPTY);

  useEffect(() => {
    api.get("/auth/me").then((r) => {
      setRole(r.data?.role ?? null);
      if (r.data?.role !== "AGENT") { router.replace("/voidcloud/dashboard"); return; }
      // Server-computed, agent-scoped KPIs — no client-side filtering of tenant-wide data.
      cloudAgent.dashboard().then((d) => setKpis({ ...EMPTY, ...(d ?? {}) })).catch(() => setKpis(EMPTY));
    }).catch(() => router.replace("/voidcloud/dashboard"));
  }, [router]);

  if (role !== "AGENT") return null;

  const cards = [
    { label: "Assigned Conversations", value: kpis.assignedConversations },
    { label: "Assigned Leads", value: kpis.assignedLeads },
    { label: "Open Conversations", value: kpis.openConversations },
  ];

  return (
    <div className="space-y-6">
      <h1 className="vc-h1">Agent Dashboard</h1>
      <div className="grid gap-4 md:grid-cols-3">
        {cards.map((c) => (
          <div key={c.label} className="vc-card p-6">
            <div className="vc-h1">{c.value}</div>
            <div className="text-sm text-white/60">{c.label}</div>
          </div>
        ))}
      </div>

      <div className="vc-card p-6">
        <h2 className="vc-h2 mb-3">Lead pipeline</h2>
        {Object.keys(kpis.leadStatusSummary).length === 0 ? (
          <p className="text-sm text-white/50">No leads assigned yet.</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {Object.entries(kpis.leadStatusSummary).map(([status, count]) => (
              <div key={status} className="rounded-lg border border-white/10 bg-white/5 p-3">
                <div className="text-lg font-semibold">{count}</div>
                <div className="text-xs text-white/60">{status}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

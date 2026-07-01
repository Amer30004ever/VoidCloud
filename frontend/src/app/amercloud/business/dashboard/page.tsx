"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import api from "@/lib/api";

interface BizStats {
  teamSize?: number;
  openConversations?: number;
  totalLeads?: number;
  vpsCount?: number;
  monthlyBill?: number;
  currency?: string;
}

function StatCard({ label, value, icon, href, color = "border-white/10 bg-white/5" }: { label: string; value: string | number; icon: string; href?: string; color?: string }) {
  const inner = (
    <div className={`rounded-2xl border p-5 backdrop-blur-xl ${color}`}>
      <div className="text-2xl">{icon}</div>
      <div className="mt-2 text-3xl font-bold">{value}</div>
      <div className="mt-1 text-xs uppercase text-white/50">{label}</div>
    </div>
  );
  return href ? <Link href={href}>{inner}</Link> : inner;
}

function QuickLink({ href, icon, label, desc }: { href: string; icon: string; label: string; desc: string }) {
  return (
    <Link href={href} className="flex items-start gap-4 rounded-2xl border border-white/10 bg-white/5 p-5 transition hover:border-blue-400/30 hover:bg-white/10">
      <span className="text-2xl">{icon}</span>
      <div>
        <div className="font-semibold">{label}</div>
        <div className="text-xs text-white/50">{desc}</div>
      </div>
    </Link>
  );
}

export default function BusinessDashboard() {
  const [stats, setStats] = useState<BizStats>({});
  const [me, setMe] = useState<{ name?: string; tenantName?: string } | null>(null);

  useEffect(() => {
    api.get("/auth/me").then((r) => setMe(r.data)).catch(() => {});
    Promise.allSettled([
      api.get("/business/stats"),
      api.get("/crm/conversations?limit=1&status=OPEN"),
      api.get("/crm/leads?limit=1"),
    ]).then(([statsRes, convRes, leadsRes]) => {
      const s: BizStats = {};
      if (statsRes.status === "fulfilled") Object.assign(s, statsRes.value.data);
      if (convRes.status === "fulfilled") {
        const d = convRes.value.data;
        s.openConversations = d?.total ?? (Array.isArray(d) ? d.length : 0);
      }
      if (leadsRes.status === "fulfilled") {
        const d = leadsRes.value.data;
        s.totalLeads = d?.total ?? (Array.isArray(d) ? d.length : 0);
      }
      setStats(s);
    });
  }, []);

  const tenantName = me?.tenantName ?? "Your Business";
  const firstName = me?.name?.split(" ")[0] ?? "there";

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-blue-500/20 bg-gradient-to-r from-blue-500/10 to-violet-500/10 p-8 backdrop-blur-xl">
        <h1 className="text-3xl font-bold">Welcome back, {firstName} 👋</h1>
        <p className="mt-2 text-white/60">{tenantName} · Business Admin Panel</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Team Members" value={stats.teamSize ?? "—"} icon="👥" href="/amercloud/business/team" />
        <StatCard label="Open Conversations" value={stats.openConversations ?? "—"} icon="💬" href="/amercloud/business/crm" color="border-blue-500/20 bg-blue-500/5" />
        <StatCard label="Total Leads" value={stats.totalLeads ?? "—"} icon="🎯" href="/amercloud/business/crm" />
        <StatCard label="VPS Instances" value={stats.vpsCount ?? "—"} icon="🖥️" href="/amercloud/business/vps" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <QuickLink href="/amercloud/business/crm" icon="💬" label="WhatsApp CRM" desc="Manage customer conversations & leads" />
        <QuickLink href="/amercloud/business/team" icon="👥" label="Team Management" desc="Invite agents, assign conversations" />
        <QuickLink href="/amercloud/business/vps" icon="🖥️" label="VPS Instances" desc="Your provisioned servers" />
        <QuickLink href="/amercloud/business/billing" icon="💳" label="Billing" desc="Invoices and subscription" />
        <QuickLink href="/amercloud/business/settings" icon="⚙️" label="Settings" desc="Business profile and configuration" />
      </div>
    </div>
  );
}

"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { cloudApi } from "@/lib/cloud";




export default function AdminOverview() {
  const [stats, setStats] = useState<any>(null);
  useEffect(() => { cloudApi.admin.stats().then(setStats); }, []);
  const cards = [
    { label: "Total users", value: stats?.users, icon: "👤" },
    { label: "Active plans", value: stats?.plans, icon: "💎" },
    { label: "Deployments", value: stats?.deployments, icon: "🚀" },
    { label: "Invoices", value: stats?.invoices, icon: "🧾" },
    { label: "Revenue (USD)", value: `$${(stats?.revenueUSD ?? 0).toFixed(2)}`, icon: "💵" },
    { label: "Revenue (EGP)", value: `${(stats?.revenueEGP ?? 0).toFixed(0)} EGP`, icon: "🪙" },
  ];
  return (
    <div>
      <h1 className="mb-6 text-3xl font-bold">🛡️ Admin Overview</h1>
      <div className="grid gap-4 md:grid-cols-3">
        {cards.map((c) => (
          <div key={c.label} className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl">
            <div className="text-2xl">{c.icon}</div>
            <div className="mt-2 text-3xl font-bold">{c.value ?? "—"}</div>
            <div className="mt-1 text-xs uppercase text-white/50">{c.label}</div>
          </div>
        ))}
      </div>
      <div className="mt-6 grid gap-4 md:grid-cols-3">
        <Link href="/amercloud/admin/users" className="rounded-2xl border border-white/10 bg-white/5 p-5 hover:bg-white/10">→ Manage users</Link>
        <Link href="/amercloud/admin/plans" className="rounded-2xl border border-white/10 bg-white/5 p-5 hover:bg-white/10">→ Configure plans</Link>
        <Link href="/amercloud/admin/billing" className="rounded-2xl border border-white/10 bg-white/5 p-5 hover:bg-white/10">→ Transactions</Link>
      </div>
    </div>
  );
}

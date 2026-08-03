/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { cloudApi } from "@/features/vps/cloud";




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
      <h1 className="mb-6 vc-h1">🛡️ Admin Overview</h1>
      <div className="grid gap-4 md:grid-cols-3">
        {cards.map((c) => (
          <div key={c.label} className="vc-card p-6">
            <div className="text-2xl">{c.icon}</div>
            <div className="mt-2 vc-h1">{c.value ?? "—"}</div>
            <div className="mt-1 text-xs uppercase text-white/50">{c.label}</div>
          </div>
        ))}
      </div>
      <div className="mt-6 grid gap-4 md:grid-cols-3">
        <Link href="/voidcloud/admin/users" className="vc-card p-5 hover:bg-white/10">→ Manage users</Link>
        <Link href="/voidcloud/admin/plans" className="vc-card p-5 hover:bg-white/10">→ Configure plans</Link>
        <Link href="/voidcloud/admin/billing" className="vc-card p-5 hover:bg-white/10">→ Transactions</Link>
      </div>
    </div>
  );
}

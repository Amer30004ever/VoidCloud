"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState, useCallback } from "react";
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import api from "@/lib/api";

interface RevenueMonth { month: string; mrr: number; newRevenue: number; churn: number }
interface TopTenant { id: string; name: string; plan: string; monthlyRevenue: number; currency: string; status: string }
interface FailedPayment { id: string; tenant: string; amount: number; currency: string; reason: string; date: string; attempts: number }
interface PlanSplit { name: string; count: number; revenue: number }

const COLORS = ["#ef4444", "#f97316", "#eab308", "#22c55e", "#3b82f6", "#a855f7"];

const MOCK_MONTHS: RevenueMonth[] = [
  { month: "Jan", mrr: 4200, newRevenue: 1200, churn: 340 },
  { month: "Feb", mrr: 5100, newRevenue: 1400, churn: 500 },
  { month: "Mar", mrr: 5800, newRevenue: 1900, churn: 1200 },
  { month: "Apr", mrr: 6400, newRevenue: 1100, churn: 500 },
  { month: "May", mrr: 7200, newRevenue: 2100, churn: 1300 },
  { month: "Jun", mrr: 8100, newRevenue: 2400, churn: 1500 },
  { month: "Jul", mrr: 9300, newRevenue: 3000, churn: 1800 },
];
const MOCK_PLANS: PlanSplit[] = [
  { name: "Starter", count: 45, revenue: 2250 },
  { name: "Pro", count: 28, revenue: 4200 },
  { name: "Business", count: 12, revenue: 2400 },
  { name: "Enterprise", count: 4, revenue: 400 },
];
const MOCK_TOP: TopTenant[] = [
  { id: "1", name: "Acme Corp", plan: "Enterprise", monthlyRevenue: 1200, currency: "USD", status: "active" },
  { id: "2", name: "TechStart Ltd", plan: "Business", monthlyRevenue: 450, currency: "USD", status: "active" },
  { id: "3", name: "Digital Agency", plan: "Pro", monthlyRevenue: 200, currency: "USD", status: "active" },
  { id: "4", name: "ShopPlus", plan: "Pro", monthlyRevenue: 200, currency: "USD", status: "active" },
  { id: "5", name: "CloudBiz", plan: "Starter", monthlyRevenue: 50, currency: "USD", status: "past_due" },
];
const MOCK_FAILED: FailedPayment[] = [
  { id: "1", tenant: "CloudBiz", amount: 50, currency: "USD", reason: "Card declined", date: "2026-07-01", attempts: 2 },
  { id: "2", tenant: "OldCo", amount: 200, currency: "USD", reason: "Insufficient funds", date: "2026-06-28", attempts: 3 },
];

const fmt = (n: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);

function ChartTip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-white/10 bg-slate-900 p-3 text-xs shadow-xl">
      <p className="mb-1 font-semibold text-white">{label}</p>
      {payload.map((p: any) => <p key={p.name} style={{ color: p.color }}>{p.name}: {fmt(p.value)}</p>)}
    </div>
  );
}

export default function BillingRevenuePage() {
  const [months, setMonths] = useState<RevenueMonth[]>(MOCK_MONTHS);
  const [topTenants, setTopTenants] = useState<TopTenant[]>(MOCK_TOP);
  const [failed, setFailed] = useState<FailedPayment[]>(MOCK_FAILED);
  const [plans, setPlans] = useState<PlanSplit[]>(MOCK_PLANS);
  const [loading, setLoading] = useState(true);
  const [retrying, setRetrying] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [rev, top, fail] = await Promise.allSettled([
        api.get("/billing/admin/revenue-summary"),
        api.get("/billing/admin/top-tenants?limit=10"),
        api.get("/billing/admin/failed-payments?limit=20"),
      ]);
      if (rev.status === "fulfilled") {
        const d = rev.value.data;
        if (d?.months?.length) setMonths(d.months);
        if (d?.plans?.length) setPlans(d.plans);
      }
      if (top.status === "fulfilled" && top.value.data?.length) setTopTenants(top.value.data);
      if (fail.status === "fulfilled" && fail.value.data?.length) setFailed(fail.value.data);
    } catch { /**/ } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  async function retryPayment(id: string) {
    setRetrying(id);
    try { await api.post(`/billing/admin/payments/${id}/retry`, {}); fetchData(); }
    catch { /**/ } finally { setRetrying(null); }
  }

  const currentMrr = months[months.length - 1]?.mrr ?? 0;
  const prevMrr = months[months.length - 2]?.mrr ?? 0;
  const mrrGrowth = prevMrr ? (((currentMrr - prevMrr) / prevMrr) * 100).toFixed(1) : "0";
  const lastChurn = months[months.length - 1]?.churn ?? 0;
  const churnRate = currentMrr ? ((lastChurn / currentMrr) * 100).toFixed(1) : "0";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white">Revenue Dashboard</h1>
          <p className="mt-1 text-sm text-white/40">MRR · ARR · churn · failed payments</p>
        </div>
        <button onClick={fetchData} disabled={loading} className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/60 hover:text-white disabled:opacity-40">
          {loading ? "Loading…" : "↻ Refresh"}
        </button>
      </div>

      {/* KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Current MRR", value: fmt(currentMrr), sub: `+${mrrGrowth}% vs last month`, color: "text-emerald-400", icon: "📈" },
          { label: "ARR", value: fmt(currentMrr * 12), sub: "Annualized run rate", color: "text-cyan-400", icon: "📊" },
          { label: "Churn Rate", value: `${churnRate}%`, sub: `${fmt(lastChurn)} churned this month`, color: "text-red-400", icon: "📉" },
          { label: "Failed Payments", value: String(failed.length), sub: `${fmt(failed.reduce((s, f) => s + f.amount, 0))} at risk`, color: "text-amber-400", icon: "⚠️" },
        ].map((k) => (
          <div key={k.label} className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <div className="text-2xl">{k.icon}</div>
            <div className={`mt-1 text-3xl font-bold ${k.color}`}>{k.value}</div>
            <div className="text-xs text-white/40 mt-0.5">{k.label}</div>
            <div className="text-[10px] text-white/25">{k.sub}</div>
          </div>
        ))}
      </div>

      {/* MRR trend */}
      <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
        <h2 className="mb-4 font-semibold text-white">MRR Trend & Churn</h2>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={months} margin={{ left: 0, right: 8, top: 4, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
            <XAxis dataKey="month" tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${v / 1000}k`} />
            <Tooltip content={<ChartTip />} />
            <Legend wrapperStyle={{ fontSize: 11, color: "rgba(255,255,255,0.5)" }} />
            <Line type="monotone" dataKey="mrr" stroke="#22c55e" strokeWidth={2.5} dot={false} name="MRR" />
            <Line type="monotone" dataKey="newRevenue" stroke="#3b82f6" strokeWidth={2} dot={false} name="New Revenue" strokeDasharray="4 2" />
            <Line type="monotone" dataKey="churn" stroke="#ef4444" strokeWidth={2} dot={false} name="Churned" strokeDasharray="4 2" />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Plan split */}
        <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
          <h2 className="mb-4 font-semibold text-white">Revenue by Plan</h2>
          <div className="flex items-center gap-6">
            <ResponsiveContainer width={160} height={160}>
              <PieChart>
                <Pie data={plans} dataKey="revenue" innerRadius={45} outerRadius={70} paddingAngle={3}>
                  {plans.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v: any) => fmt(v)} contentStyle={{ background: "#0f172a", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex-1 space-y-2">
              {plans.map((p, i) => (
                <div key={p.name} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
                    <span className="text-white/70">{p.name}</span>
                    <span className="text-white/30 text-xs">({p.count})</span>
                  </div>
                  <span className="font-medium text-white">{fmt(p.revenue)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Top tenants bar */}
        <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
          <h2 className="mb-4 font-semibold text-white">Top Tenants by Revenue</h2>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={topTenants.slice(0, 6)} layout="vertical" margin={{ left: 0, right: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" horizontal={false} />
              <XAxis type="number" tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 10 }} tickFormatter={(v) => `$${v}`} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="name" tick={{ fill: "rgba(255,255,255,0.5)", fontSize: 11 }} width={90} axisLine={false} tickLine={false} />
              <Tooltip formatter={(v: any) => fmt(v)} contentStyle={{ background: "#0f172a", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, fontSize: 11 }} />
              <Bar dataKey="monthlyRevenue" fill="#ef4444" radius={[0, 6, 6, 0]} name="Monthly Revenue" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Top tenants table */}
      <div className="rounded-2xl border border-white/10 overflow-hidden">
        <div className="border-b border-white/5 bg-white/5 px-5 py-3">
          <h2 className="font-semibold text-white">Top Paying Tenants</h2>
        </div>
        <table className="w-full text-sm">
          <thead className="border-b border-white/5">
            <tr className="text-[11px] uppercase tracking-wider text-white/30">
              <th className="px-5 py-3 text-left">Tenant</th>
              <th className="py-3">Plan</th>
              <th className="py-3">MRR</th>
              <th className="py-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {topTenants.map((t) => (
              <tr key={t.id} className="border-t border-white/5 hover:bg-white/[0.02]">
                <td className="px-5 py-3 font-medium text-white">{t.name}</td>
                <td className="py-3 text-center text-xs text-white/50">{t.plan}</td>
                <td className="py-3 text-center font-mono font-semibold text-emerald-400">{fmt(t.monthlyRevenue)}</td>
                <td className="py-3 text-center">
                  <span className={`rounded border px-2 py-0.5 text-[10px] font-medium ${t.status === "active" ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-300" : "border-red-500/20 bg-red-500/10 text-red-300"}`}>
                    {t.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Failed payments */}
      <div className="rounded-2xl border border-amber-500/15 overflow-hidden">
        <div className="border-b border-amber-500/10 bg-amber-500/5 px-5 py-3">
          <h2 className="font-semibold text-amber-300">⚠ Failed Payments ({failed.length})</h2>
        </div>
        {failed.length === 0 ? (
          <p className="py-8 text-center text-sm text-white/30">No failed payments 🎉</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-white/5">
              <tr className="text-[11px] uppercase tracking-wider text-white/30">
                <th className="px-5 py-3 text-left">Tenant</th>
                <th className="py-3">Amount</th>
                <th className="py-3 hidden md:table-cell">Reason</th>
                <th className="py-3 hidden lg:table-cell">Attempts</th>
                <th className="py-3">Date</th>
                <th className="py-3">Action</th>
              </tr>
            </thead>
            <tbody>
              {failed.map((f) => (
                <tr key={f.id} className="border-t border-white/5 hover:bg-white/[0.02]">
                  <td className="px-5 py-3 font-medium text-white">{f.tenant}</td>
                  <td className="py-3 text-center font-mono text-red-300">{fmt(f.amount)}</td>
                  <td className="hidden py-3 text-center text-xs text-white/40 md:table-cell">{f.reason}</td>
                  <td className="hidden py-3 text-center text-xs text-amber-300 lg:table-cell">{f.attempts}x</td>
                  <td className="py-3 text-center text-xs text-white/40">{f.date}</td>
                  <td className="py-3 text-center">
                    <button onClick={() => retryPayment(f.id)} disabled={retrying === f.id}
                      className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-xs text-emerald-300 hover:bg-emerald-500/20 disabled:opacity-40">
                      {retrying === f.id ? "…" : "Retry"}
                    </button>
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

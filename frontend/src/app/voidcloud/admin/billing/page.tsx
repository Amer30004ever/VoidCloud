"use client";

import { useEffect, useMemo, useState } from "react";
import { BarChart, Bar, Cell, LineChart, Line, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis, Legend } from "recharts";
import { cloudApi } from "@/features/vps/cloud";
import { useTrackPageView } from "@/hooks/useTrackPageView";

const COLORS = ["#22d3ee", "#a78bfa", "#f472b6", "#facc15", "#34d399", "#fb923c"];

export default function AdminBillingPage() {
  useTrackPageView();
  const [stats, setStats] = useState<any>(null);
  const [tx, setTx] = useState<any[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadStats();
    loadTransactions();
  }, []);

  async function loadStats() {
    try {
      setStats(await cloudApi.admin.billingStats());
    } catch (err) {
      setError((err as Error)?.message ?? "Failed to load billing stats");
    }
  }

  async function loadTransactions() {
    try {
      setTx(await cloudApi.admin.transactions());
    } catch (err) {
      setError((err as Error)?.message ?? "Failed to load transactions");
    }
  }

  async function confirmPay(id: string) {
    setBusy(id);
    try { await cloudApi.admin.confirm(id); await loadTransactions(); } finally { setBusy(null); }
  }

  async function rejectPay(id: string) {
    const reason = window.prompt("Reason for rejection (sent to user):", "Could not verify payment");
    if (!reason) return;
    setBusy(id);
    try { await cloudApi.admin.rejectInvoice(id, reason); await loadTransactions(); } finally { setBusy(null); }
  }

  async function refund(id: string) {
    if (!window.confirm("Refund full amount?")) return;
    setBusy(id);
    try { await cloudApi.admin.refund(id); await loadTransactions(); } finally { setBusy(null); }
  }

  const pendingCash = tx.filter((i) => i.provider === "cash" && i.status === "PENDING");
  const otherPending = tx.filter((i) => i.provider !== "cash" && i.status === "PENDING");
  const rest = tx.filter((i) => i.status !== "PENDING");

  const mrrData = stats?.mrrMonthly ?? [];
  const churnData = stats?.churnMonthly ?? [];
  const topTenants = stats?.topTenants ?? [];
  const revenueByPlan = stats?.revenueByPlan ?? [];
  const failedPayments = stats?.failedPayments ?? [];
  const [tenantSort, setTenantSort] = useState<'revenue' | 'invoices' | 'email'>('revenue');
  const [tenantSortAsc, setTenantSortAsc] = useState(false);

  const sortedTenants = useMemo(() => {
    return [...topTenants].sort((a: any, b: any) => {
      const compare = tenantSort === 'invoices'
        ? a.invoiceCount - b.invoiceCount
        : tenantSort === 'email'
          ? a.email.localeCompare(b.email)
          : (a.totalUSD + a.totalEGP) - (b.totalUSD + b.totalEGP);
      return tenantSortAsc ? compare : -compare;
    });
  }, [topTenants, tenantSort, tenantSortAsc]);

  const totalRevenue = useMemo(() => {
    return mrrData.reduce((sum: number, item: any) => sum + (item.total ?? 0), 0);
  }, [mrrData]);

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="vc-h1">Billing dashboard</h1>
          <p className="text-sm text-white/60">Revenue, churn, failed payments, and top-paying tenants.</p>
        </div>
        <button onClick={() => { loadStats(); loadTransactions(); }} className="vc-btn vc-btn-secondary hover:bg-white/10">Refresh</button>
      </div>

      {error && <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-100">{error}</div>}

      <div className="grid gap-4 md:grid-cols-4">
        <MetricCard label="Trailing 12mo revenue" value={totalRevenue ? `$${totalRevenue.toFixed(2)}` : "—"} />
        <MetricCard label="Current MRR" value={mrrData.length ? `$${mrrData[mrrData.length - 1].total.toFixed(2)}` : "—"} />
        <MetricCard label="Active subs (latest)" value={mrrData.length ? String(mrrData[mrrData.length - 1].activeSubscriptions) : "—"} />
        <MetricCard label="Failed payments" value={String(failedPayments.length)} />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Panel title="MRR (12 months)">
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={mrrData}>
              <XAxis dataKey="month" stroke="#94a3b8" fontSize={12} />
              <YAxis stroke="#94a3b8" fontSize={12} />
              <Tooltip contentStyle={{ background: "#0f172a", border: "1px solid #334155" }} formatter={(value: any) => [`$${value}`, "Amount"]} />
              <Line type="monotone" dataKey="total" stroke="#38bdf8" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </Panel>

        <Panel title="Churn rate (12 months)">
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={churnData}>
              <XAxis dataKey="month" stroke="#94a3b8" fontSize={12} />
              <YAxis stroke="#94a3b8" fontSize={12} tickFormatter={(value) => `${Number(value) * 100}%`} />
              <Tooltip contentStyle={{ background: "#0f172a", border: "1px solid #334155" }} formatter={(value: any) => [`${(value * 100).toFixed(2)}%`, "Churn"]} />
              <Bar dataKey="churnRate" fill="#f97316" />
            </BarChart>
          </ResponsiveContainer>
        </Panel>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Panel title="Revenue by plan type">
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie data={revenueByPlan} dataKey="total" nameKey="planName" outerRadius={100} label>
                {revenueByPlan.map((entry: any, index: number) => (
                  <Cell key={entry.planName} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ background: "#0f172a", border: "1px solid #334155" }} formatter={(value: any) => [`$${value}`, "Revenue"]} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </Panel>

        <Panel title="Top-paying tenants">
          <div className="space-y-3">
            {topTenants.length === 0 ? (
              <div className="rounded-xl border border-white/10 bg-slate-950/50 p-4 text-sm text-white/60">No top-paying tenant data yet.</div>
            ) : (
              <div className="overflow-hidden rounded-2xl border border-white/10 bg-slate-950/50">
                <table className="w-full text-sm">
                  <thead className="vc-label border-b border-white/10 text-left">
                    <tr>
                      <th className="p-3 cursor-pointer" onClick={() => {
                        setTenantSort('email');
                        setTenantSortAsc(tenantSort === 'email' ? !tenantSortAsc : false);
                      }}>
                        Tenant
                      </th>
                      <th className="p-3 cursor-pointer" onClick={() => {
                        setTenantSort('revenue');
                        setTenantSortAsc(tenantSort === 'revenue' ? !tenantSortAsc : false);
                      }}>
                        Revenue
                      </th>
                      <th className="p-3 cursor-pointer" onClick={() => {
                        setTenantSort('invoices');
                        setTenantSortAsc(tenantSort === 'invoices' ? !tenantSortAsc : false);
                      }}>
                        Invoices
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedTenants.map((tenant: any) => (
                      <tr key={tenant.userId} className="border-b border-white/10 last:border-0">
                        <td className="p-3">{tenant.email}</td>
                        <td className="p-3">{tenant.totalUSD || tenant.totalEGP ? `${tenant.totalUSD ? `$${tenant.totalUSD.toFixed(2)}` : ''}${tenant.totalUSD && tenant.totalEGP ? ' / ' : ''}${tenant.totalEGP ? `${tenant.totalEGP.toFixed(0)} EGP` : ''}` : '—'}</td>
                        <td className="p-3">{tenant.invoiceCount}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </Panel>
      </div>

      <Panel title="Failed payments alerts">
        <div className="overflow-hidden rounded-2xl border border-white/10 bg-slate-950/50">
          <table className="w-full text-sm">
            <thead className="vc-label border-b border-white/10 text-left">
              <tr>
                <th className="p-3">Invoice</th>
                <th className="p-3">Tenant</th>
                <th className="p-3">Amount</th>
                <th className="p-3">Provider</th>
                <th className="p-3">Date</th>
              </tr>
            </thead>
            <tbody>
              {failedPayments.length === 0 ? (
                <tr><td colSpan={5} className="p-4 text-sm text-white/60">No recent failed payments.</td></tr>
              ) : failedPayments.map((invoice: any) => (
                <tr key={invoice.id} className="border-b border-white/10 last:border-0">
                  <td className="p-3 font-mono text-xs">{invoice.number}</td>
                  <td className="p-3">{invoice.email}</td>
                  <td className="p-3">{invoice.currency === 'USD' ? `$${invoice.amount}` : `${invoice.amount} EGP`}</td>
                  <td className="p-3">{invoice.provider}</td>
                  <td className="p-3">{new Date(invoice.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      {pendingCash.length > 0 && (
        <section>
          <h2 className="mb-3 text-lg font-semibold text-yellow-300">⏳ Pending Cash Payments ({pendingCash.length})</h2>
          <div className="overflow-hidden rounded-2xl border border-yellow-500/30 bg-yellow-500/5">
            <table className="w-full text-sm">
              <thead className="border-b border-yellow-500/20 text-left text-xs uppercase text-yellow-200/80">
                <tr><th className="p-4">Invoice</th><th>User</th><th>Amount</th><th>Requested</th><th></th></tr>
              </thead>
              <tbody>
                {pendingCash.map((i) => (
                  <tr key={i.id} className="border-b border-yellow-500/10">
                    <td className="p-4 font-mono text-xs">{i.number}</td>
                    <td>{i.user?.email}</td>
                    <td>{i.amountEGP} EGP</td>
                    <td className="text-white/60">{new Date(i.createdAt).toLocaleString()}</td>
                    <td className="space-x-3 p-4">
                      <button disabled={busy === i.id} onClick={() => confirmPay(i.id)} className="rounded bg-green-500/20 px-3 py-1 text-xs font-semibold text-green-300 hover:bg-green-500/30 disabled:opacity-50">Approve</button>
                      <button disabled={busy === i.id} onClick={() => rejectPay(i.id)} className="rounded bg-red-500/20 px-3 py-1 text-xs font-semibold text-red-300 hover:bg-red-500/30 disabled:opacity-50">Reject</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <section>
        <h2 className="mb-3 text-lg font-semibold">All transactions</h2>
        <div className="overflow-hidden vc-card">
          <table className="w-full text-sm">
            <thead className="vc-label border-b border-white/10 text-left">
              <tr><th className="p-4">Invoice</th><th>User</th><th>Amount</th><th>Provider</th><th>Status</th><th>Date</th><th></th></tr>
            </thead>
            <tbody>
              {[...otherPending, ...rest].map((i) => (
                <tr key={i.id} className="border-b border-white/5">
                  <td className="p-4 font-mono text-xs">{i.number}</td>
                  <td>{i.user?.email}</td>
                  <td>{i.currency === "USD" ? `$${i.amountUSD}` : `${i.amountEGP} EGP`}</td>
                  <td className="capitalize">{i.provider}</td>
                  <td><StatusBadge status={i.status} /></td>
                  <td className="text-white/60">{new Date(i.createdAt).toLocaleDateString()}</td>
                  <td className="space-x-2 p-4">
                    {i.status === "PENDING" && i.provider !== "cash" && <button onClick={() => confirmPay(i.id)} className="text-green-300 hover:underline">Confirm</button>}
                    {i.status === "PAID" && <button onClick={() => refund(i.id)} className="text-red-300 hover:underline">Refund</button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-5">
      <div className="text-xs text-white/50">{label}</div>
      <div className="mt-3 text-2xl font-semibold">{value}</div>
    </div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-5">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-base font-semibold">{title}</h2>
      </div>
      {children}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const c: Record<string, string> = {
    PAID: "border-green-500/30 bg-green-500/10 text-green-300",
    PENDING: "border-yellow-500/30 bg-yellow-500/10 text-yellow-300",
    FAILED: "border-red-500/30 bg-red-500/10 text-red-300",
    REFUNDED: "border-gray-500/30 bg-gray-500/10 text-gray-300",
  };
  return <span className={`rounded-full border px-2 py-1 text-xs ${c[status] ?? c.PENDING}`}>{status}</span>;
}

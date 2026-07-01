"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import api from "@/lib/api";

interface Invoice {
  id: string;
  number: string;
  amount: number;
  currency: string;
  status: "PAID" | "UNPAID" | "OVERDUE" | "CANCELLED";
  dueDate?: string;
  paidAt?: string;
  createdAt: string;
}

interface Subscription {
  planName: string;
  status: string;
  renewalDate?: string;
  amount?: number;
  currency?: string;
}

const STATUS_COLORS: Record<string, string> = {
  PAID: "bg-emerald-500/10 text-emerald-300 border-emerald-500/20",
  UNPAID: "bg-amber-500/10 text-amber-300 border-amber-500/20",
  OVERDUE: "bg-red-500/10 text-red-300 border-red-500/20",
  CANCELLED: "bg-slate-500/10 text-slate-400 border-slate-500/20",
};

export default function BusinessBillingPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.allSettled([
      api.get("/billing/invoices"),
      api.get("/billing/subscription"),
    ]).then(([invRes, subRes]) => {
      if (invRes.status === "fulfilled") {
        const d = invRes.value.data;
        setInvoices(Array.isArray(d) ? d : (d?.invoices ?? []));
      }
      if (subRes.status === "fulfilled") setSubscription(subRes.value.data);
    }).finally(() => setLoading(false));
  }, []);

  const totalPaid = invoices.filter(i => i.status === "PAID").reduce((a, i) => a + i.amount, 0);
  const totalDue = invoices.filter(i => i.status === "UNPAID" || i.status === "OVERDUE").reduce((a, i) => a + i.amount, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Billing</h1>
          <p className="mt-1 text-sm text-white/40">Invoices and subscription management</p>
        </div>
        <Link href="/voidcloud/dashboard/billing" className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/60 hover:bg-white/10">Full billing →</Link>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
          <p className="text-xs text-white/40">Current Plan</p>
          <p className="mt-1 text-xl font-bold text-white">{subscription?.planName ?? "—"}</p>
          <p className={`mt-1 text-xs font-medium ${subscription?.status === "ACTIVE" ? "text-emerald-400" : "text-amber-400"}`}>{subscription?.status ?? "—"}</p>
          {subscription?.renewalDate && <p className="mt-1 text-xs text-white/30">Renews {new Date(subscription.renewalDate).toLocaleDateString()}</p>}
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
          <p className="text-xs text-white/40">Total Paid</p>
          <p className="mt-1 text-2xl font-bold text-emerald-400">${totalPaid.toFixed(2)}</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
          <p className="text-xs text-white/40">Outstanding</p>
          <p className={`mt-1 text-2xl font-bold ${totalDue > 0 ? "text-red-400" : "text-white"}`}>${totalDue.toFixed(2)}</p>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/5">
        <div className="flex items-center justify-between border-b border-white/5 px-5 py-4">
          <h2 className="text-lg font-semibold text-white">Invoices</h2>
        </div>
        {loading ? (
          <div className="space-y-0.5 p-3">{[1,2,3].map(i => <div key={i} className="h-14 animate-pulse rounded-xl bg-white/5" />)}</div>
        ) : invoices.length === 0 ? (
          <div className="p-12 text-center text-sm text-white/50">No invoices yet</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-white/5">
              <tr className="text-[11px] uppercase tracking-wider text-white/30">
                <th className="px-5 py-3 text-left">Invoice #</th>
                <th className="py-3">Amount</th>
                <th className="py-3">Status</th>
                <th className="hidden py-3 md:table-cell">Due Date</th>
                <th className="py-3">Date</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((inv) => (
                <tr key={inv.id} className="border-t border-white/5 hover:bg-white/[0.03]">
                  <td className="px-5 py-3 font-mono text-xs text-cyan-300">{inv.number}</td>
                  <td className="py-3 font-semibold text-white">${inv.amount.toFixed(2)} {inv.currency}</td>
                  <td className="py-3"><span className={`rounded border px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[inv.status] ?? STATUS_COLORS.UNPAID}`}>{inv.status}</span></td>
                  <td className="hidden py-3 text-xs text-white/40 md:table-cell">{inv.dueDate ? new Date(inv.dueDate).toLocaleDateString() : "—"}</td>
                  <td className="py-3 text-xs text-white/40">{new Date(inv.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

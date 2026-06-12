/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import { useEffect, useState } from "react";
import { cloudApi } from "@/lib/cloud";

export default function AdminBillingPage() {
  const [tx, setTx] = useState<any[]>([]);
  const [busy, setBusy] = useState<string | null>(null);

  async function load() { setTx(await cloudApi.admin.transactions()); }
  useEffect(() => { load(); }, []);

  async function confirmPay(id: string) {
    setBusy(id);
    try { await cloudApi.admin.confirm(id); await load(); } finally { setBusy(null); }
  }
  async function rejectPay(id: string) {
    const reason = window.prompt("Reason for rejection (sent to user):", "Could not verify payment");
    if (!reason) return;
    setBusy(id);
    try { await cloudApi.admin.rejectInvoice(id, reason); await load(); } finally { setBusy(null); }
  }
  async function refund(id: string) {
    if (!window.confirm("Refund full amount?")) return;
    setBusy(id);
    try { await cloudApi.admin.refund(id); await load(); } finally { setBusy(null); }
  }

  const pendingCash = tx.filter((i) => i.provider === "cash" && i.status === "PENDING");
  const otherPending = tx.filter((i) => i.provider !== "cash" && i.status === "PENDING");
  const rest = tx.filter((i) => i.status !== "PENDING");

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold">Transactions</h1>

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
                      <button
                        disabled={busy === i.id}
                        onClick={() => confirmPay(i.id)}
                        className="rounded bg-green-500/20 px-3 py-1 text-xs font-semibold text-green-300 hover:bg-green-500/30 disabled:opacity-50"
                      >Approve</button>
                      <button
                        disabled={busy === i.id}
                        onClick={() => rejectPay(i.id)}
                        className="rounded bg-red-500/20 px-3 py-1 text-xs font-semibold text-red-300 hover:bg-red-500/30 disabled:opacity-50"
                      >Reject</button>
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
        <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl">
          <table className="w-full text-sm">
            <thead className="border-b border-white/5 text-left text-xs uppercase text-white/40">
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

function StatusBadge({ status }: { status: string }) {
  const c: Record<string, string> = {
    PAID: "border-green-500/30 bg-green-500/10 text-green-300",
    PENDING: "border-yellow-500/30 bg-yellow-500/10 text-yellow-300",
    FAILED: "border-red-500/30 bg-red-500/10 text-red-300",
    REFUNDED: "border-gray-500/30 bg-gray-500/10 text-gray-300",
  };
  return <span className={`rounded-full border px-2 py-0.5 text-xs ${c[status] ?? c.PENDING}`}>{status}</span>;
}

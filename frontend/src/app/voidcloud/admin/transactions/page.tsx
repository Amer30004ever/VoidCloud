/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import { useEffect, useState } from "react";
import { cloudApi } from "@/features/vps/cloud";

export default function AdminTransactionsPage() {
  const [tx, setTx] = useState<any[]>([]);
  const [busy, setBusy] = useState<string | null>(null);

  async function load() { setTx(await cloudApi.admin.transactions()); }
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => { load(); }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  async function confirmPay(id: string) { setBusy(id); try { await cloudApi.admin.confirm(id); await load(); } finally { setBusy(null); } }
  async function refund(id: string, max: number, cur: string) {
    const ans = window.prompt(`Refund amount in ${cur} (leave blank for full ${max}):`, "");
    if (ans === null) return;
    const partial = ans.trim() === "" ? undefined : Number(ans);
    if (partial !== undefined && (isNaN(partial) || partial <= 0 || partial > max)) { alert("Invalid amount"); return; }
    setBusy(id);
    try { await cloudApi.admin.refund(id, partial); await load(); } finally { setBusy(null); }
  }
  async function exportCsv() {
    const token = localStorage.getItem("amer_token");
    const res = await fetch(cloudApi.admin.transactionsCsvUrl(), { headers: token ? { Authorization: `Bearer ${token}` } : {} });
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `transactions-${new Date().toISOString().slice(0,10)}.csv`; a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="vc-h1">Transactions</h1>
        <button onClick={exportCsv} className="vc-btn vc-btn-secondary">Export CSV</button>
      </div>
      <div className="overflow-x-auto vc-card">
        <table className="w-full text-sm">
          <thead className="border-b border-white/5 text-left text-xs uppercase text-white/40">
            <tr><th className="p-4">Invoice</th><th>User</th><th>Amount</th><th>Provider</th><th>Status</th><th>Date</th><th className="p-4">Actions</th></tr>
          </thead>
          <tbody>
            {tx.map((i) => {
              const amt = i.currency === "USD" ? i.amountUSD : i.amountEGP;
              return (
                <tr key={i.id} className="border-b border-white/5">
                  <td className="p-4 font-mono text-xs">{i.number}</td>
                  <td>{i.user?.email}</td>
                  <td>{i.currency === "USD" ? `$${i.amountUSD}` : `${i.amountEGP} EGP`}</td>
                  <td className="capitalize">{i.provider ?? "—"}</td>
                  <td><span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-xs">{i.status}</span></td>
                  <td className="text-white/60">{new Date(i.createdAt).toLocaleDateString()}</td>
                  <td className="space-x-3 whitespace-nowrap p-4 text-xs">
                    {i.status === "PENDING" && <button disabled={busy === i.id} onClick={() => confirmPay(i.id)} className="text-green-300 hover:underline disabled:opacity-50">Confirm</button>}
                    {i.status === "PAID" && <button disabled={busy === i.id} onClick={() => refund(i.id, amt ?? 0, i.currency)} className="text-red-300 hover:underline disabled:opacity-50">Refund</button>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

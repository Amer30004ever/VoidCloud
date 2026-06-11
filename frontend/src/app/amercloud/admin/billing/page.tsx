"use client";
import { useEffect, useState } from "react";
import { cloudApi } from "@/lib/cloud";

export default function AdminBillingPage() {
  const [tx, setTx] = useState<any[]>([]);
  async function load() { setTx(await cloudApi.admin.transactions()); }
  useEffect(() => { load(); }, []);

  async function confirm(id: string) { await cloudApi.admin.confirm(id); load(); }
  async function refund(id: string) { if (confirm("Refund full amount?")) { await cloudApi.admin.refund(id); load(); } }

  return (
    <div>
      <h1 className="mb-6 text-3xl font-bold">Transactions</h1>
      <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl">
        <table className="w-full text-sm">
          <thead className="border-b border-white/5 text-left text-xs uppercase text-white/40">
            <tr><th className="p-4">Invoice</th><th>User</th><th>Amount</th><th>Provider</th><th>Status</th><th>Date</th><th></th></tr>
          </thead>
          <tbody>
            {tx.map((i) => (
              <tr key={i.id} className="border-b border-white/5">
                <td className="p-4 font-mono">{i.number}</td>
                <td>{i.user?.email}</td>
                <td>{i.currency === "USD" ? `$${i.amountUSD}` : `${i.amountEGP} EGP`}</td>
                <td className="capitalize">{i.provider}</td>
                <td><span className={`rounded-full border px-2 py-0.5 text-xs ${i.status === "PAID" ? "border-green-500/30 bg-green-500/10 text-green-300" : i.status === "REFUNDED" ? "border-gray-500/30 bg-gray-500/10 text-gray-300" : "border-yellow-500/30 bg-yellow-500/10 text-yellow-300"}`}>{i.status}</span></td>
                <td className="text-white/60">{new Date(i.createdAt).toLocaleDateString()}</td>
                <td className="space-x-2 p-4">
                  {i.status === "PENDING" && <button onClick={() => confirm(i.id)} className="text-green-300 hover:underline">Confirm</button>}
                  {i.status === "PAID" && <button onClick={() => refund(i.id)} className="text-red-300 hover:underline">Refund</button>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

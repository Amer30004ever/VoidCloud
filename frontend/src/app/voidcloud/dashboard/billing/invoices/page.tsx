"use client";
import { useEffect, useState } from "react";
import { cloudApi, CloudInvoice } from "@/features/vps/cloud";
import { useTrackPageView } from "@/hooks/useTrackPageView";

export default function InvoicesPage() {
  useTrackPageView();
  const [items, setItems] = useState<CloudInvoice[]>([]);
  useEffect(() => { cloudApi.billing.invoices().then(setItems); }, []);
  return (
    <div>
      <h1 className="mb-6 text-3xl font-bold">Invoices</h1>
      <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl">
        {items.length === 0 ? <p className="p-12 text-center text-white/50">No invoices yet.</p> : (
          <table className="w-full text-sm">
            <thead className="border-b border-white/5 text-left text-xs uppercase text-white/40">
              <tr><th className="p-4">Number</th><th>Date</th><th>Description</th><th>Amount</th><th>Status</th><th></th></tr>
            </thead>
            <tbody>
              {items.map((i) => (
                <tr key={i.id} className="border-b border-white/5">
                  <td className="p-4 font-mono">{i.number}</td>
                  <td className="text-white/60">{new Date(i.createdAt).toLocaleDateString()}</td>
                  <td>{i.description}</td>
                  <td>{i.currency === "USD" ? `$${i.amountUSD}` : `${i.amountEGP} EGP`}</td>
                  <td><span className={`rounded-full border px-2 py-0.5 text-xs ${i.status === "PAID" ? "border-green-500/30 bg-green-500/10 text-green-300" : "border-yellow-500/30 bg-yellow-500/10 text-yellow-300"}`}>{i.status}</span></td>
                  <td className="p-4"><button className="text-cyan-300 hover:underline">Download PDF</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

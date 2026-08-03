"use client";
import { useEffect, useState } from "react";
import { cloudApi } from "@/features/vps/cloud";
import { WidgetBoundary } from "@workspace/ui-kit/widget-boundary";

type Tx = {
  id: string;
  type: "TOPUP" | "CONSUMPTION" | "REFUND" | "ADJUSTMENT";
  amount: number;
  balanceAfter: number;
  relatedVps?: { id: string; name: string; status: string };
  reason?: string;
  createdAt: string;
};

const PACKS = [
  { key: "small", label: "Small", points: 100, priceUSD: 10, priceEGP: 500 },
  { key: "medium", label: "Medium", points: 300, priceUSD: 25, priceEGP: 1250 },
  { key: "large", label: "Large", points: 1000, priceUSD: 75, priceEGP: 3750 },
] as const;

export default function WalletPage() {
  const [balance, setBalance] = useState<number | null>(null);
  const [txs, setTxs] = useState<Tx[]>([]);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [method, setMethod] = useState("STRIPE_CARD");

  useEffect(() => {
    cloudApi.credits.balance().then(setBalance).catch(() => {});
    cloudApi.credits.transactions(50, 0).then(setTxs).catch(() => {});
  }, []);

  async function purchase(pack: typeof PACKS[number]) {
    setBusy(true); setMsg("");
    try {
      const res = await cloudApi.credits.purchase({ packSize: pack.key, paymentMethod: method as any });
      setMsg(`Top-up initiated: ${pack.points} points. Complete payment to credit your account.`);
      const newBal = await cloudApi.credits.balance();
      setBalance(newBal);
      const updated = await cloudApi.credits.transactions(50, 0);
      setTxs(updated);
    } catch (e: any) {
      setMsg(e?.response?.data?.message ?? "Top-up failed");
    } finally { setBusy(false); }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <h1 className="vc-h1">Wallet</h1>

      <div className="vc-card p-6">
        <div className="text-xs uppercase text-white/50">Credit balance</div>
        <div className="mt-2 text-4xl font-bold">{balance !== null ? `${balance} pts` : "—"}</div>
        <p className="mt-1 text-xs text-white/50">Points are deducted per minute of PAY_AS_YOU_GO VPS runtime.</p>
      </div>

      <div className="vc-card p-6">
        <h2 className="text-xl font-semibold mb-4">Top up credits</h2>
        <div className="grid gap-3 md:grid-cols-3 mb-4">
          {PACKS.map((p) => (
            <button key={p.key} onClick={() => purchase(p)} disabled={busy} className="rounded-lg border border-white/10 bg-white/5 p-4 text-left hover:bg-white/10 disabled:opacity-50">
              <div className="font-semibold">{p.label}</div>
              <div className="text-2xl font-bold mt-1">{p.points} pts</div>
              <div className="text-xs text-white/60 mt-1">${p.priceUSD} / {p.priceEGP} EGP</div>
            </button>
          ))}
        </div>
        <div className="space-y-2">
          <label className="block text-xs uppercase text-white/60">Payment method</label>
          <select value={method} onChange={(e) => setMethod(e.target.value)} className="w-full rounded-lg border border-white/10 bg-slate-950/60 px-3 py-2">
            <option value="STRIPE_CARD">Credit Card (Stripe)</option>
            <option value="PAYPAL">PayPal</option>
            <option value="FAWRY">Fawry</option>
            <option value="INSTAPAY">InstaPay</option>
            <option value="VODAFONE_CASH">Vodafone Cash</option>
          </select>
        </div>
      </div>

      <WidgetBoundary title="Transaction history">
        <div className="vc-card p-6">
          <h2 className="text-xl font-semibold mb-4">Transaction history</h2>
          {txs.length === 0 ? (
            <p className="text-sm text-white/50">No transactions yet.</p>
          ) : (
            <div className="space-y-2">
              {txs.map((tx) => (
                <div key={tx.id} className="flex items-center justify-between border-b border-white/5 py-2 text-sm">
                  <div>
                    <span className={`inline-block rounded px-2 py-0.5 text-xs mr-2 ${tx.type === "TOPUP" ? "bg-emerald-500/20 text-emerald-200" : tx.type === "CONSUMPTION" ? "bg-red-500/20 text-red-200" : "bg-white/10 text-white/70"}`}>{tx.type}</span>
                    {tx.relatedVps && <span className="text-white/60 ml-2">{tx.relatedVps.name}</span>}
                    {tx.reason && <span className="text-white/40 ml-2 text-xs">({tx.reason})</span>}
                  </div>
                  <div className="text-right">
                    <div className={tx.amount >= 0 ? "text-emerald-300" : "text-red-300"}>{tx.amount >= 0 ? "+" : ""}{tx.amount} pts</div>
                    <div className="text-xs text-white/40">{new Date(tx.createdAt).toLocaleString()}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </WidgetBoundary>


      {msg && <div className="rounded-lg border border-cyan-400/30 bg-cyan-400/10 p-3 text-sm text-cyan-200">{msg}</div>}
    </div>
  );
}

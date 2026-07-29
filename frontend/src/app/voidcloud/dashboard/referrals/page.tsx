"use client";

import { useEffect, useState } from "react";
import { cloudReferral, type ReferralStats, type ReferralPayout, type ReferralPayoutMethod } from "@/features/vps/cloud";

export default function ReferralsPage() {
  const [stats, setStats] = useState<ReferralStats | null>(null);
  const [payouts, setPayouts] = useState<ReferralPayout[]>([]);
  const [method, setMethod] = useState<ReferralPayoutMethod>({ type: "FAWRY", destination: "" });
  const [amount, setAmount] = useState(50);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      cloudReferral.stats(),
      cloudReferral.payouts().catch(() => []),
      cloudReferral.getPayoutMethod().catch(() => null),
    ])
      .then(([s, p, m]) => {
        setStats(s);
        setPayouts(p);
        if (m) setMethod(m);
      })
      .catch((e) => setErr(e instanceof Error ? e.message : "Failed to load referrals"));
  }, []);

  const link =
    stats && typeof window !== "undefined" ? `${window.location.origin}/voidcloud/register?ref=${stats.code}` : "";

  async function copyLink() {
    if (!link) return;
    await navigator.clipboard.writeText(link);
  }

  async function saveMethod() {
    setErr(null);
    setMsg(null);
    try {
      await cloudReferral.setPayoutMethod(method);
      setMsg("Payout method saved.");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to save method");
    }
  }

  async function requestPayout() {
    setErr(null);
    setMsg(null);
    try {
      await cloudReferral.requestPayout(amount, method.type);
      setMsg("Payout requested.");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to request payout");
    }
  }

  if (!stats) return <div className="p-6 text-white/70">Loading…</div>;

  return (
    <div className="space-y-6 text-white">
      <div>
        <h1 className="text-2xl font-bold">Referral Program</h1>
        <p className="text-white/60 text-sm mt-1">
          Total referrals: {stats.signups} · Earn{" "}
          {stats.config.commissionType === "FIXED"
            ? `$${stats.config.commissionValue}`
            : `${stats.config.commissionValue}%`}{" "}
          per referral.
        </p>
      </div>

      {err && <div className="rounded-lg border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-300">{err}</div>}
      {msg && <div className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 p-3 text-sm text-emerald-300">{msg}</div>}

      <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-5">
        <div className="text-xs uppercase tracking-wide text-white/50">Your referral link</div>
        <div className="mt-2 flex gap-2 flex-wrap">
          <input readOnly value={link} className="flex-1 min-w-[260px] rounded-md bg-slate-950 border border-white/10 px-3 py-2 text-sm" />
          <button onClick={copyLink} className="rounded-md bg-gradient-to-br from-cyan-400 to-fuchsia-500 px-4 py-2 text-sm font-semibold text-slate-950">
            Copy
          </button>
        </div>
        <div className="mt-3 text-xs text-white/50">
          Code: <span className="font-mono">{stats.code}</span>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <Stat label="Total Referrals" value={stats.signups} />
        <Stat label="Total Earnings" value={`$${stats.earnings.total.toFixed(2)}`} />
        <Stat label="Pending Payout" value={`$${stats.earnings.pending.toFixed(2)}`} />
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-5">
          <h2 className="font-semibold mb-3">Payout Method</h2>
          <label className="block text-xs text-white/60 mb-1">Type</label>
          <select
            value={method.type}
            onChange={(e) => setMethod({ ...method, type: e.target.value as ReferralPayoutMethod["type"] })}
            className="w-full rounded-md bg-slate-950 border border-white/10 px-3 py-2 text-sm mb-3"
          >
            <option value="FAWRY">Fawry (phone)</option>
            <option value="INSTAPAY">InstaPay (ID)</option>
            <option value="BANK">Bank (IBAN)</option>
          </select>
          <label className="block text-xs text-white/60 mb-1">Destination</label>
          <input
            value={method.destination}
            onChange={(e) => setMethod({ ...method, destination: e.target.value })}
            className="w-full rounded-md bg-slate-950 border border-white/10 px-3 py-2 text-sm mb-3"
          />
          <button onClick={saveMethod} className="rounded-md bg-white/10 hover:bg-white/20 px-4 py-2 text-sm">
            Save Method
          </button>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-5">
          <h2 className="font-semibold mb-3">Request Payout</h2>
          <label className="block text-xs text-white/60 mb-1">Amount (USD)</label>
          <input
            type="number"
            min={stats.config.payoutMinimum}
            value={amount}
            onChange={(e) => setAmount(Number(e.target.value))}
            className="w-full rounded-md bg-slate-950 border border-white/10 px-3 py-2 text-sm mb-3"
          />
          <button
            onClick={requestPayout}
            disabled={stats.earnings.pending < stats.config.payoutMinimum}
            className="rounded-md bg-gradient-to-br from-cyan-400 to-fuchsia-500 px-4 py-2 text-sm font-semibold text-slate-950 disabled:opacity-50"
          >
            Request Payout
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-5">
        <h2 className="font-semibold mb-3">Referral History</h2>
        {stats.history.length === 0 ? (
          <p className="text-sm text-white/50">No referrals yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase text-white/40">
              <tr>
                <th className="p-2">Email</th>
                <th>Date</th>
                <th>Status</th>
                <th className="text-right">Earnings</th>
              </tr>
            </thead>
            <tbody>
              {stats.history.map((h, i) => (
                <tr key={i} className="border-t border-white/5">
                  <td className="p-2 font-mono text-cyan-300">{`user${i + 1}***@example.com`}</td>
                  <td className="p-2">{new Date(h.date).toLocaleString()}</td>
                  <td className="p-2">{h.event}</td>
                  <td className="p-2 text-right">{h.amount ? `$${h.amount.toFixed(2)}` : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {payouts.length > 0 && (
        <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-5">
          <h2 className="font-semibold mb-3">Payout History</h2>
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase text-white/40">
              <tr>
                <th className="p-2">Date</th>
                <th>Method</th>
                <th>Amount</th>
                <th>Destination</th>
              </tr>
            </thead>
            <tbody>
              {payouts.map((p) => (
                <tr key={p.id} className="border-t border-white/5">
                  <td className="p-2">{new Date(p.createdAt).toLocaleDateString()}</td>
                  <td className="p-2">{p.method}</td>
                  <td className="p-2">${p.amount.toFixed(2)}</td>
                  <td className="p-2 font-mono text-white/70">{p.destination.replace(/^.{3}/, "***")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <div className="text-xs uppercase tracking-wide text-white/50">{label}</div>
      <div className="mt-1 text-2xl font-bold">{value}</div>
    </div>
  );
}

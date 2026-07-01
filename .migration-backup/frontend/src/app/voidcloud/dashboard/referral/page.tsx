"use client";

import { useEffect, useState } from "react";
import { cloudReferral, type ReferralStats, type ReferralPayoutMethod, type ReferralPayout } from "@/lib/cloud";

export default function ReferralPage() {
  const [stats, setStats] = useState<ReferralStats | null>(null);
  const [method, setMethod] = useState<ReferralPayoutMethod>({ type: "FAWRY", destination: "" });
  const [payouts, setPayouts] = useState<ReferralPayout[]>([]);
  const [amount, setAmount] = useState(50);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  async function load() {
    try {
      const [s, m, p] = await Promise.all([
        cloudReferral.stats(),
        cloudReferral.getPayoutMethod().catch(() => null),
        cloudReferral.payouts().catch(() => []),
      ]);
      setStats(s);
      if (m) setMethod(m);
      setPayouts(p);
    } catch (e) { setErr((e as Error).message); }
  }
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void load(); }, []);

  const link = stats ? `${typeof window !== "undefined" ? window.location.origin : ""}/voidcloud/register?ref=${stats.code}` : "";

  async function copyLink() {
    if (!link) return;
    await navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  async function saveMethod() {
    setErr(null); setMsg(null);
    try { await cloudReferral.setPayoutMethod(method); setMsg("Payout method saved."); }
    catch (e) { setErr((e as Error).message); }
  }

  async function requestPayout() {
    setErr(null); setMsg(null);
    try { await cloudReferral.requestPayout(amount, method.type); setMsg("Payout requested."); await load(); }
    catch (e) { setErr((e as Error).message); }
  }

  if (!stats) return <div className="p-6 text-white/70">Loading…</div>;

  const tweet = `https://twitter.com/intent/tweet?text=${encodeURIComponent("Try AmerCloud — managed Kubernetes for Egyptian devs. ")}&url=${encodeURIComponent(link)}`;
  const wa = `https://wa.me/?text=${encodeURIComponent("Try AmerCloud: " + link)}`;
  const mailto = `mailto:?subject=${encodeURIComponent("Try AmerCloud")}&body=${encodeURIComponent("I&apos;m using AmerCloud — sign up here: " + link)}`;

  return (
    <div className="space-y-6 p-6 text-white">
      <div>
        <h1 className="text-2xl font-bold">Referral Program</h1>
        <p className="text-white/60 text-sm mt-1">
          Earn {stats.config.commissionType === "FIXED" ? `$${stats.config.commissionValue}` : `${stats.config.commissionValue}%`} commission on each referred customer&apos;s first payment.
        </p>
      </div>

      {err && <div className="rounded-lg border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-300">{err}</div>}
      {msg && <div className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 p-3 text-sm text-emerald-300">{msg}</div>}

      <div className="rounded-xl border border-white/10 bg-slate-900/60 p-5">
        <div className="text-xs uppercase tracking-wide text-white/50">Your referral link</div>
        <div className="mt-2 flex gap-2 flex-wrap">
          <input readOnly value={link} className="flex-1 min-w-[260px] rounded-md bg-slate-950 border border-white/10 px-3 py-2 text-sm" />
          <button onClick={copyLink} className="rounded-md bg-gradient-to-br from-cyan-400 to-fuchsia-500 px-4 py-2 text-sm font-semibold text-slate-950">
            {copied ? "Copied!" : "Copy"}
          </button>
          <a href={tweet} target="_blank" rel="noreferrer" className="rounded-md border border-white/10 px-3 py-2 text-sm hover:bg-white/5">Twitter</a>
          <a href={wa} target="_blank" rel="noreferrer" className="rounded-md border border-white/10 px-3 py-2 text-sm hover:bg-white/5">WhatsApp</a>
          <a href={mailto} className="rounded-md border border-white/10 px-3 py-2 text-sm hover:bg-white/5">Email</a>
        </div>
        <div className="mt-3 text-xs text-white/50">Code: <span className="font-mono">{stats.code}</span> · Cookie window: {stats.config.cookieDays} days</div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Stat label="Signups" value={stats.signups} />
        <Stat label="Conversions" value={stats.conversions} />
        <Stat label="Pending" value={`$${stats.earnings.pending.toFixed(2)}`} />
        <Stat label="Paid" value={`$${stats.earnings.paid.toFixed(2)}`} />
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="rounded-xl border border-white/10 bg-slate-900/60 p-5">
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
            placeholder={method.type === "FAWRY" ? "01xxxxxxxxx" : method.type === "INSTAPAY" ? "user@instapay" : "EG... IBAN"}
            className="w-full rounded-md bg-slate-950 border border-white/10 px-3 py-2 text-sm mb-3"
          />
          <button onClick={saveMethod} className="rounded-md bg-white/10 hover:bg-white/20 px-4 py-2 text-sm">Save</button>
        </div>

        <div className="rounded-xl border border-white/10 bg-slate-900/60 p-5">
          <h2 className="font-semibold mb-3">Request Payout</h2>
          <p className="text-xs text-white/60 mb-3">Minimum withdrawal: ${stats.config.payoutMinimum}</p>
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

      <div className="rounded-xl border border-white/10 bg-slate-900/60 p-5">
        <h2 className="font-semibold mb-3">Activity</h2>
        {stats.history.length === 0 ? (
          <p className="text-sm text-white/50">No activity yet — share your link to start earning.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="text-left text-white/50 text-xs uppercase">
              <tr><th className="py-2">Date</th><th>Event</th><th className="text-right">Amount</th></tr>
            </thead>
            <tbody>
              {stats.history.map((h, i) => (
                <tr key={i} className="border-t border-white/5">
                  <td className="py-2 whitespace-nowrap">{new Date(h.date).toLocaleString()}</td>
                  <td>{h.event}</td>
                  <td className="text-right">{h.amount ? `$${h.amount.toFixed(2)}` : "—"}</td>
                 </tr>
              ))}
            </tbody>
           </table>
        )}
      </div>

      {payouts.length > 0 && (
        <div className="rounded-xl border border-white/10 bg-slate-900/60 p-5">
          <h2 className="font-semibold mb-3">Payout Requests</h2>
          <table className="w-full text-sm">
            <thead className="text-left text-white/50 text-xs uppercase">
              <tr><th className="py-2">Date</th><th>Method</th><th>Amount</th><th>Status</th></tr>
            </thead>
            <tbody>
              {payouts.map((p) => (
                <tr key={p.id} className="border-t border-white/5">
                  <td className="py-2">{new Date(p.createdAt).toLocaleDateString()}</td>
                  <td>{p.method}</td>
                  <td>${p.amount.toFixed(2)}</td>
                  <td>{p.status}</td>
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
    <div className="rounded-xl border border-white/10 bg-slate-900/60 p-4">
      <div className="text-xs uppercase tracking-wide text-white/50">{label}</div>
      <div className="mt-1 text-2xl font-bold">{value}</div>
    </div>
  );
}
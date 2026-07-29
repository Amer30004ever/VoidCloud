/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import { useState } from "react";
import { cloudAbuse } from "@/features/vps/cloud";

const CATEGORIES = ["SPAM", "MALWARE", "PHISHING", "DDOS", "CRYPTO_MINING", "COPYRIGHT", "OTHER"];

export default function AbuseReportPage() {
  const [form, setForm] = useState({
    reporterName: "",
    reporterEmail: "",
    targetIp: "",
    targetDomain: "",
    category: "SPAM",
    reason: "",
    evidence: "",
  });
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.reason.trim()) { setError("Please describe the issue."); return; }
    if (!form.targetIp && !form.targetDomain) {
      setError("Provide at least a target IP or domain.");
      return;
    }
    setBusy(true); setError(null);
    try {
      await cloudAbuse.report(form);
      setDone(true);
    } catch (e: any) {
      setError(e?.response?.data?.message ?? e?.message ?? "Submission failed");
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16">
        <div className="rounded-2xl border border-green-500/30 bg-green-500/5 p-8 text-center">
          <h1 className="text-2xl font-bold text-green-300">Report received</h1>
          <p className="mt-3 text-white/70">
            Thank you. Our team has been notified and will investigate. You will not receive an
            automated reply, but every report is reviewed.
          </p>
          <a href="/aup" className="mt-4 inline-block text-sm text-cyan-300 hover:underline">
            Read our Acceptable Use Policy →
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <h1 className="text-3xl font-bold">Report abuse</h1>
      <p className="mt-2 text-white/60">
        Use this form to report spam, malware, phishing, DDoS, or other abusive traffic originating
        from a VoidCloud-hosted IP or domain. All reports are logged and reviewed by our team.
      </p>

      <form onSubmit={submit} className="mt-6 space-y-4 rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl">
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs uppercase text-white/60">Your name (optional)</label>
            <input className="w-full rounded-lg border border-white/10 bg-slate-950/50 p-3 text-sm outline-none focus:border-cyan-400"
              value={form.reporterName} onChange={(e) => setForm({ ...form, reporterName: e.target.value })} />
          </div>
          <div>
            <label className="mb-1 block text-xs uppercase text-white/60">Your email (optional)</label>
            <input type="email" className="w-full rounded-lg border border-white/10 bg-slate-950/50 p-3 text-sm outline-none focus:border-cyan-400"
              value={form.reporterEmail} onChange={(e) => setForm({ ...form, reporterEmail: e.target.value })} />
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs uppercase text-white/60">Target IP</label>
            <input placeholder="1.2.3.4" className="w-full rounded-lg border border-white/10 bg-slate-950/50 p-3 text-sm outline-none focus:border-cyan-400"
              value={form.targetIp} onChange={(e) => setForm({ ...form, targetIp: e.target.value })} />
          </div>
          <div>
            <label className="mb-1 block text-xs uppercase text-white/60">Target domain</label>
            <input placeholder="bad.example.com" className="w-full rounded-lg border border-white/10 bg-slate-950/50 p-3 text-sm outline-none focus:border-cyan-400"
              value={form.targetDomain} onChange={(e) => setForm({ ...form, targetDomain: e.target.value })} />
          </div>
        </div>

        <div>
          <label className="mb-1 block text-xs uppercase text-white/60">Category</label>
          <select className="w-full rounded-lg border border-white/10 bg-slate-950/50 p-3 text-sm outline-none focus:border-cyan-400"
            value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
            {CATEGORIES.map((c) => <option key={c} value={c}>{c.replace("_", " ").toLowerCase()}</option>)}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-xs uppercase text-white/60">What is happening? *</label>
          <textarea rows={4} required className="w-full rounded-lg border border-white/10 bg-slate-950/50 p-3 text-sm outline-none focus:border-cyan-400"
            value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} />
        </div>

        <div>
          <label className="mb-1 block text-xs uppercase text-white/60">Evidence (headers, URLs, logs — optional)</label>
          <textarea rows={3} className="w-full rounded-lg border border-white/10 bg-slate-950/50 p-3 text-sm outline-none focus:border-cyan-400"
            value={form.evidence} onChange={(e) => setForm({ ...form, evidence: e.target.value })} />
        </div>

        {error && <p className="text-sm text-red-300">{error}</p>}

        <button type="submit" disabled={busy}
          className="rounded-lg bg-gradient-to-r from-cyan-400 to-fuchsia-500 px-6 py-3 font-semibold text-slate-950 disabled:opacity-50">
          {busy ? "Submitting…" : "Submit report"}
        </button>
      </form>
    </div>
  );
}

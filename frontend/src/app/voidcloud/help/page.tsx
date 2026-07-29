"use client";

import { useMemo, useState } from "react";

const ARTICLES = [
  {
    title: "Getting started with VoidCloud",
    content: "Create your account, verify your email, and launch your first VPS instance from the dashboard. Follow the onboarding wizard to connect your team and billing.",
  },
  {
    title: "How to upgrade your plan",
    content: "Navigate to the Billing tab, select a new plan, and complete the checkout process. Changes take effect immediately.",
  },
  {
    title: "Connecting a custom domain",
    content: "Add your domain under the VPS detail page → Domains tab. Point your DNS to our nameservers and verify via the TXT record.",
  },
  {
    title: "Resetting SSH keys",
    content: "Go to VPS settings → Security → SSH keys and add a new public key. Old keys are revoked within 60 seconds.",
  },
  {
    title: "Support and SLA",
    content: "Critical tickets are answered within 1 hour. Standard tickets are answered within 24 hours. Enterprise plans receive 24/7 phone support.",
  },
];

export default function HelpPage() {
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    if (!q.trim()) return ARTICLES;
    const s = q.toLowerCase();
    return ARTICLES.filter((a) => a.title.toLowerCase().includes(s) || a.content.toLowerCase().includes(s));
  }, [q]);

  return (
    <div className="mx-auto max-w-3xl space-y-6 py-8">
      <div>
        <h1 className="text-3xl font-bold">Help Center</h1>
        <p className="text-sm text-white/60">Search documentation and frequently asked questions.</p>
      </div>

      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search articles..."
        className="w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3 text-sm"
      />

      <div className="space-y-4">
        {filtered.map((a, i) => (
          <div key={i} className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <h2 className="font-semibold">{a.title}</h2>
            <p className="mt-2 text-sm text-white/70">{a.content}</p>
          </div>
        ))}
        {filtered.length === 0 && <p className="text-sm text-white/50">No articles found.</p>}
      </div>
    </div>
  );
}

"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Navbar } from "@/components/landing/Navbar";
import { Footer } from "@/components/landing/Footer";

type Article = {
  title: string;
  category: string;
  summary: string;
  href: string;
  keywords: string[];
};

const ARTICLES: Article[] = [
  {
    title: "Deploy your first VPS",
    category: "Getting started",
    summary:
      "Pick a plan, choose a region and image, then provision an instance in under 60 seconds from the dashboard.",
    href: "/voidcloud/dashboard/vps/new",
    keywords: ["vps", "provision", "create", "server", "deploy", "instance"],
  },
  {
    title: "Connect over SSH",
    category: "Getting started",
    summary:
      "Add your public key, find your instance IP, and connect securely. Root password rotation is covered too.",
    href: "/docs",
    keywords: ["ssh", "key", "password", "root", "connect", "terminal"],
  },
  {
    title: "Pay with Fawry or InstaPay",
    category: "Billing",
    summary:
      "Egyptian local payment options, how reference codes work, and when your wallet balance is credited.",
    href: "/voidcloud/dashboard/wallet",
    keywords: ["fawry", "instapay", "payment", "wallet", "egp", "top up"],
  },
  {
    title: "Understand your invoice",
    category: "Billing",
    summary:
      "Line items, pay-as-you-go vs subscription billing, proration, and how to download a PDF invoice.",
    href: "/voidcloud/dashboard/billing",
    keywords: ["invoice", "billing", "payg", "subscription", "receipt", "vat"],
  },
  {
    title: "Point a custom domain",
    category: "Networking",
    summary:
      "Create DNS records, verify ownership, and let cert-manager issue a free Let's Encrypt certificate.",
    href: "/voidcloud/dashboard/domains",
    keywords: ["domain", "dns", "ssl", "tls", "certificate", "cname", "https"],
  },
  {
    title: "Firewall, WAF and DDoS protection",
    category: "Networking",
    summary:
      "Configure inbound rules, enable the managed WAF, and review blocked traffic for an instance.",
    href: "/security",
    keywords: ["firewall", "waf", "ddos", "ports", "block", "network"],
  },
  {
    title: "Enable two-factor authentication",
    category: "Security",
    summary:
      "Enrol an authenticator app, store recovery codes safely, and what to do if you lose your device.",
    href: "/voidcloud/dashboard/settings",
    keywords: ["2fa", "totp", "mfa", "authenticator", "recovery", "login"],
  },
  {
    title: "API keys and scopes",
    category: "Developers",
    summary:
      "Create scoped keys (for example vps:read), rotate them, and revoke a leaked key immediately.",
    href: "/voidcloud/dashboard/settings/api-keys",
    keywords: ["api", "key", "token", "scope", "developer", "rest"],
  },
  {
    title: "Webhooks and retries",
    category: "Developers",
    summary:
      "Register endpoints, verify signatures, and understand the retry/backoff schedule for failed deliveries.",
    href: "/voidcloud/dashboard/webhooks",
    keywords: ["webhook", "event", "retry", "signature", "callback"],
  },
  {
    title: "Backups and snapshots",
    category: "Operations",
    summary:
      "Schedule automatic backups, take a manual snapshot before risky changes, and restore an instance.",
    href: "/voidcloud/dashboard/backups",
    keywords: ["backup", "snapshot", "restore", "image", "recovery"],
  },
  {
    title: "Monitoring and alerts",
    category: "Operations",
    summary:
      "Read CPU, memory and disk graphs, set thresholds, and route alerts to email or WhatsApp.",
    href: "/voidcloud/dashboard/monitoring",
    keywords: ["monitoring", "alert", "cpu", "memory", "metrics", "uptime"],
  },
  {
    title: "Invite your team",
    category: "Account",
    summary:
      "Add teammates, assign roles (admin, agent, user), and deactivate access when someone leaves.",
    href: "/voidcloud/dashboard/settings/team",
    keywords: ["team", "invite", "role", "permission", "member", "rbac"],
  },
  {
    title: "Report abuse",
    category: "Account",
    summary:
      "How to report a VoidCloud-hosted resource, what evidence to include, and our response times.",
    href: "/abuse",
    keywords: ["abuse", "report", "spam", "phishing", "complaint"],
  },
  {
    title: "Platform status and incidents",
    category: "Account",
    summary:
      "Check live component health, subscribe to updates, and read the post-incident timeline.",
    href: "/status",
    keywords: ["status", "incident", "outage", "downtime", "health"],
  },
];

const CATEGORIES = ["All", ...Array.from(new Set(ARTICLES.map((a) => a.category)))];

export default function HelpPage() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    return ARTICLES.filter((a) => {
      const inCategory = category === "All" || a.category === category;
      if (!inCategory) return false;
      if (!q) return true;
      return (
        a.title.toLowerCase().includes(q) ||
        a.summary.toLowerCase().includes(q) ||
        a.category.toLowerCase().includes(q) ||
        a.keywords.some((k) => k.includes(q))
      );
    });
  }, [query, category]);

  return (
    <div className="min-h-screen vc-page text-white">
      <Navbar />
      <main className="mx-auto max-w-5xl px-6 py-20">
        <header className="text-center">
          <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs uppercase tracking-widest text-white/50">
            Help center
          </span>
          <h1 className="mt-6 text-4xl font-bold tracking-tight md:text-5xl">
            How can we help?
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-white/60">
            Search the knowledge base, or{" "}
            <Link href="/abuse" className="text-cyan-400 hover:underline">
              contact support
            </Link>{" "}
            if you can&apos;t find an answer.
          </p>
        </header>

        <div className="mx-auto mt-10 max-w-2xl">
          <label className="sr-only" htmlFor="kb-search">
            Search articles
          </label>
          <input
            id="kb-search"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search: billing, ssh, domain, 2FA…"
            className="w-full rounded-xl border border-white/10 bg-white/5 px-5 py-4 text-white placeholder:text-white/35 outline-none transition focus:border-cyan-400/50"
          />
        </div>

        <div className="mt-6 flex flex-wrap justify-center gap-2">
          {CATEGORIES.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setCategory(c)}
              className={`rounded-full border px-4 py-1.5 text-sm transition ${
                category === c
                  ? "border-cyan-400/50 bg-cyan-400/10 text-cyan-300"
                  : "border-white/10 bg-white/5 text-white/60 hover:text-white"
              }`}
            >
              {c}
            </button>
          ))}
        </div>

        <p className="mt-8 text-sm text-white/40">
          {results.length} article{results.length === 1 ? "" : "s"}
        </p>

        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {results.map((a) => (
            <Link
              key={a.title}
              href={a.href}
              className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 transition hover:border-cyan-400/40 hover:bg-white/[0.06]"
            >
              <div className="text-xs uppercase tracking-wide text-cyan-400/80">
                {a.category}
              </div>
              <h2 className="mt-2 text-lg font-semibold">{a.title}</h2>
              <p className="mt-2 text-sm text-white/60">{a.summary}</p>
            </Link>
          ))}
        </div>

        {results.length === 0 && (
          <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.03] p-10 text-center">
            <p className="text-white/70">No articles match “{query}”.</p>
            <p className="mt-2 text-sm text-white/45">
              Try a shorter keyword, or browse all categories.
            </p>
            <button
              type="button"
              onClick={() => {
                setQuery("");
                setCategory("All");
              }}
              className="mt-5 rounded-xl border border-white/10 bg-white/5 px-5 py-2.5 text-sm font-medium hover:bg-white/10"
            >
              Reset search
            </button>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}

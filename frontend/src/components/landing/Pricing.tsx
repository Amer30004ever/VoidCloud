"use client";

import Link from "next/link";
import { useState } from "react";

type Plan = {
  name: string;
  monthly: number;
  egp: number;
  for: string;
  features: string[];
  cta: string;
  href: string;
  popular?: boolean;
  outline?: boolean;
  trialNote?: string;
};

const plans: Plan[] = [
  {
    name: "Free Trial",
    monthly: 0,
    egp: 0,
    for: "Test the platform",
    features: [
      "0.25 CPU, 512MB RAM",
      "1 deployment",
      "1GB storage",
      "Community support",
      "No credit card required",
    ],
    cta: "Start Trial →",
    href: "/voidcloud/register",
    outline: true,
    trialNote: "After 7 days, deployments pause until upgrade. No auto-charge.",
  },
  {
    name: "Starter",
    monthly: 9,
    egp: 270,
    for: "Individual developers",
    features: [
      "0.5 CPU, 1GB RAM",
      "3 deployments",
      "10GB storage",
      "1 custom domain",
      "Basic support (24h)",
      "50k API requests",
    ],
    cta: "Choose Starter →",
    href: "/voidcloud/register?plan=starter",
    popular: true,
  },
  {
    name: "Pro",
    monthly: 29,
    egp: 870,
    for: "Professional teams",
    features: [
      "2 CPU, 4GB RAM",
      "10 deployments",
      "50GB storage",
      "3 custom domains",
      "Priority support (4h)",
      "200k API requests",
      "Redis cache + Staging",
    ],
    cta: "Choose Pro →",
    href: "/voidcloud/register?plan=pro",
  },
  {
    name: "Business",
    monthly: 79,
    egp: 2370,
    for: "Growing companies",
    features: [
      "4 CPU, 8GB RAM",
      "25 deployments",
      "100GB storage",
      "10 custom domains",
      "Dedicated support (1h)",
      "500k API requests",
      "Team members (5)",
    ],
    cta: "Contact Sales →",
    href: "mailto:nova-cloud-2026@outlook.com?subject=Business%20Plan%20Inquiry",
  },
];

export function Pricing() {
  const [yearly, setYearly] = useState(false);

  return (
    <section id="pricing" className="mx-auto max-w-7xl px-6 py-20">
      <div className="mb-10 text-center">
        <span className="mb-4 inline-block rounded-full border border-amber-400/30 bg-amber-400/10 px-3 py-1 text-xs font-medium text-amber-300">
          🔥 Limited beta pricing — lock in discount
        </span>
        <h2 className="text-3xl font-bold md:text-4xl">Simple, Transparent Pricing</h2>
        <p className="mt-3 text-white/60">USD or EGP. Cancel anytime.</p>

        <div className="mt-6 inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 p-1">
          <button
            onClick={() => setYearly(false)}
            className={`rounded-full px-4 py-1.5 text-sm transition ${
              !yearly ? "bg-white text-slate-950" : "text-white/70"
            }`}
          >
            Monthly
          </button>
          <button
            onClick={() => setYearly(true)}
            className={`rounded-full px-4 py-1.5 text-sm transition ${
              yearly ? "bg-white text-slate-950" : "text-white/70"
            }`}
          >
            Yearly <span className="ml-1 text-xs text-emerald-500">-20%</span>
          </button>
        </div>
        <p className="mt-3 text-xs text-white/50">
          🔗 14-day money-back guarantee on annual plans
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {plans.map((p) => {
          const price = yearly ? Math.round(p.monthly * 12 * 0.8) : p.monthly;
          const egp = yearly ? Math.round(p.egp * 12 * 0.8) : p.egp;
          const period = yearly ? "/yr" : "/mo";
          return (
            <div
              key={p.name}
              className={`relative rounded-2xl border p-6 backdrop-blur-xl transition ${
                p.popular
                  ? "border-cyan-400/50 bg-gradient-to-b from-cyan-500/10 to-fuchsia-500/5"
                  : "border-white/10 bg-white/5 hover:border-white/20"
              }`}
            >
              {p.popular && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-gradient-to-r from-cyan-400 to-fuchsia-500 px-3 py-1 text-xs font-bold text-slate-950">
                  MOST POPULAR
                </span>
              )}
              <h3 className="text-xl font-bold">{p.name}</h3>
              <p className="mt-1 text-xs text-white/50">{p.for}</p>
              <div className="mt-4">
                <span className="text-4xl font-bold">${price}</span>
                <span className="text-white/50">{period}</span>
                {p.egp > 0 && (
                  <div className="text-xs text-white/40">or {egp.toLocaleString()} EGP</div>
                )}
                {p.egp === 0 && <div className="text-xs text-white/40">7-day trial</div>}
              </div>
              <ul className="mt-6 space-y-2 text-sm">
                {p.features.map((f) => (
                  <li key={f} className="flex gap-2">
                    <span className="text-cyan-400">✓</span>
                    <span className="text-white/80">{f}</span>
                  </li>
                ))}
              </ul>
              <Link
                href={p.href}
                className={`mt-6 block rounded-xl py-3 text-center text-sm font-semibold transition ${
                  p.popular
                    ? "bg-gradient-to-r from-cyan-400 to-fuchsia-500 text-slate-950 hover:opacity-90"
                    : p.outline
                    ? "border border-white/20 hover:bg-white/10"
                    : "bg-white/10 hover:bg-white/20"
                }`}
              >
                {p.cta}
              </Link>
              {p.trialNote && (
                <p className="mt-3 text-[11px] leading-snug text-white/40">{p.trialNote}</p>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-10 flex flex-wrap items-center justify-center gap-x-8 gap-y-2 text-sm text-white/60">
        <span>✓ No setup fees</span>
        <span>✓ No bandwidth overage</span>
        <span>✓ No hidden costs</span>
      </div>
    </section>
  );
}

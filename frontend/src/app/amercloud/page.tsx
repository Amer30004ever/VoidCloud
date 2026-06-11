"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { cloudApi, CloudPlan } from "@/lib/cloud";

export default function AmerCloudLanding() {
  const [plans, setPlans] = useState<CloudPlan[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    cloudApi.plans.list().then(setPlans).catch(() => {}).finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-white">
      {/* Nav */}
      <nav className="sticky top-0 z-50 border-b border-white/5 bg-slate-950/60 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <Link href="/amercloud" className="flex items-center gap-2 text-xl font-bold">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-cyan-400 to-fuchsia-500 text-slate-950">
              ☁
            </span>
            AmerCloud
          </Link>
          <div className="flex items-center gap-3">
            <Link href="/amercloud/login" className="rounded-lg px-4 py-2 text-sm text-white/80 hover:text-white">
              Sign in
            </Link>
            <Link
              href="/amercloud/register"
              className="rounded-lg bg-gradient-to-r from-cyan-400 to-fuchsia-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:opacity-90"
            >
              Start free trial
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <header className="relative overflow-hidden px-6 py-24 text-center">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,rgba(34,211,238,0.18),transparent_60%)]" />
        <p className="mb-4 inline-block rounded-full border border-cyan-400/30 bg-cyan-400/10 px-3 py-1 text-xs text-cyan-300">
          🚀 7-day free trial · no credit card required
        </p>
        <h1 className="mx-auto max-w-4xl text-5xl font-bold leading-tight tracking-tight md:text-6xl">
          Ship apps to <span className="bg-gradient-to-r from-cyan-400 to-fuchsia-500 bg-clip-text text-transparent">production</span> in seconds.
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-white/60">
          Multi-tenant hosting on Kubernetes. Auto SSL, daily backups, custom domains, Egyptian payments (Fawry, InstaPay), and a beautiful dashboard.
        </p>
        <div className="mt-10 flex justify-center gap-3">
          <Link
            href="/amercloud/register"
            className="rounded-xl bg-gradient-to-r from-cyan-400 to-fuchsia-500 px-6 py-3 font-semibold text-slate-950 shadow-2xl shadow-cyan-500/20 hover:opacity-90"
          >
            Start free trial →
          </Link>
          <a href="#pricing" className="rounded-xl border border-white/10 bg-white/5 px-6 py-3 hover:bg-white/10">
            View pricing
          </a>
        </div>
      </header>

      {/* Feature grid */}
      <section className="mx-auto max-w-7xl px-6 py-16">
        <div className="grid gap-6 md:grid-cols-3">
          {[
            ["🌐", "Auto custom domains", "Bring your domain. We provision Let's Encrypt SSL automatically via cert-manager."],
            ["💳", "Pay your way", "Stripe for cards. Fawry for cash & QR. InstaPay for instant Egyptian bank transfers."],
            ["📊", "Real-time monitoring", "CPU, RAM, requests, logs — everything streamed live from Prometheus & Loki."],
            ["🔐", "Built-in security", "DDoS protection, encrypted env vars, 2FA, audit logs, SOC2 reporting on Enterprise."],
            ["💾", "Daily backups", "Automated database backups, one-click restore, point-in-time recovery."],
            ["🌍", "EN / AR with RTL", "First-class Arabic support, full RTL layout, dual currency invoices (USD / EGP)."],
          ].map(([icon, title, desc]) => (
            <div
              key={title}
              className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl transition hover:border-cyan-400/30 hover:bg-white/10"
            >
              <div className="mb-3 text-3xl">{icon}</div>
              <h3 className="mb-2 font-semibold">{title}</h3>
              <p className="text-sm text-white/60">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="mx-auto max-w-7xl px-6 py-20">
        <div className="mb-12 text-center">
          <h2 className="text-4xl font-bold">Simple, transparent pricing</h2>
          <p className="mt-3 text-white/60">Cancel any time. Both USD and EGP supported.</p>
        </div>
        {loading ? (
          <p className="text-center text-white/60">Loading plans…</p>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {plans.filter((p) => p.slug !== "enterprise").map((plan) => (
              <PlanCard key={plan.id} plan={plan} />
            ))}
          </div>
        )}
        {plans.find((p) => p.slug === "enterprise") && (
          <div className="mt-8 rounded-2xl border border-fuchsia-400/30 bg-gradient-to-r from-fuchsia-500/10 to-cyan-500/10 p-8 backdrop-blur-xl md:flex md:items-center md:justify-between">
            <div>
              <h3 className="text-2xl font-bold">Enterprise</h3>
              <p className="mt-2 text-white/70">Custom resources, dedicated infrastructure, SLA, SOC2 reports.</p>
            </div>
            <a
              href="mailto:sales@amercloud.dev"
              className="mt-4 inline-block rounded-xl border border-white/20 bg-white/10 px-6 py-3 font-semibold hover:bg-white/20 md:mt-0"
            >
              Contact sales →
            </a>
          </div>
        )}
      </section>

      <footer className="border-t border-white/5 px-6 py-10 text-center text-sm text-white/40">
        © {new Date().getFullYear()} AmerCloud · Built on Kubernetes &amp; Proxmox
      </footer>
    </div>
  );
}

function PlanCard({ plan }: { plan: CloudPlan }) {
  return (
    <div
      className={`relative rounded-2xl border p-6 backdrop-blur-xl transition ${
        plan.isPopular
          ? "border-cyan-400/50 bg-gradient-to-b from-cyan-500/10 to-fuchsia-500/5"
          : "border-white/10 bg-white/5 hover:border-white/20"
      }`}
    >
      {plan.isPopular && (
        <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-gradient-to-r from-cyan-400 to-fuchsia-500 px-3 py-1 text-xs font-bold text-slate-950">
          MOST POPULAR
        </span>
      )}
      <h3 className="text-xl font-bold">{plan.name}</h3>
      <p className="mt-1 text-xs text-white/50">{plan.description}</p>
      <div className="mt-4">
        <span className="text-4xl font-bold">${plan.priceUSD}</span>
        <span className="text-white/50">/mo</span>
        <div className="text-xs text-white/40">or {plan.priceEGP} EGP</div>
      </div>
      <ul className="mt-6 space-y-2 text-sm">
        <li>✅ {plan.cpuLimit} CPU · {plan.memoryLimit}MB RAM</li>
        <li>✅ {(plan.storageLimit / 1024).toFixed(0)}GB storage</li>
        <li>✅ {plan.deploymentLimit} deployments</li>
        <li>✅ {plan.customDomainLimit} custom domains</li>
        {(plan.features || []).map((f) => (
          <li key={f}>✅ {f}</li>
        ))}
      </ul>
      <Link
        href={`/amercloud/register?plan=${plan.slug}`}
        className={`mt-6 block rounded-xl py-3 text-center font-semibold transition ${
          plan.isPopular
            ? "bg-gradient-to-r from-cyan-400 to-fuchsia-500 text-slate-950 hover:opacity-90"
            : "border border-white/20 hover:bg-white/10"
        }`}
      >
        {plan.priceUSD === 0 ? "Start free" : "Get started"}
      </Link>
    </div>
  );
}

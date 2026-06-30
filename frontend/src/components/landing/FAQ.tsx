"use client";

import { useState } from "react";

const faqs = [
  {
    q: "What's the difference between Void Cloud and AWS/Vercel?",
    a: "Void Cloud offers managed Kubernetes with Egyptian payment support (Fawry/InstaPay), local pricing in EGP, and lower latency for Middle East traffic. We're 60% cheaper than AWS for equivalent resources. Unlike Vercel, we give you full container control without the complexity of managing your own K8s cluster.",
  },
  {
    q: "Do I need to know Kubernetes?",
    a: "No! Our dashboard abstracts all Kubernetes complexity. Click to deploy from GitHub or Docker Hub. We handle the scaling, networking, and security. If you're an advanced user, you can also use kubectl directly — we give you full access.",
  },
  {
    q: "How does billing work in Egypt?",
    a: "Pay monthly via Fawry (cards + 3,000+ locations across Egypt), InstaPay (instant bank transfer from any Egyptian bank), or Stripe for international cards. All prices shown in EGP with no hidden fees. VAT is included in the displayed price. You can switch payment methods anytime.",
  },
  {
    q: "Can I use my own domain?",
    a: "Yes, all paid plans include custom domains. We provision SSL certificates automatically via Let's Encrypt. Simply add your domain in the dashboard, update your DNS records (we provide instructions), and we handle the rest. Usually takes 5 minutes.",
  },
  {
    q: "Is my data backed up?",
    a: "Yes, daily automated backups with one-click restore. Business plans include point-in-time recovery (every 6 hours). Backups are stored redundantly in a separate location. You can also trigger manual backups anytime from the dashboard.",
  },
  {
    q: "Can I migrate away if needed?",
    a: "Absolutely. You own your code and data 100%. Export via GitHub (your code is already there) or use kubectl to pull your manifests anytime. We provide migration guides to other providers. No vendor lock-in, no hidden exit fees.",
  },
  {
    q: "What happens after the 7-day free trial?",
    a: "After 7 days, your deployments will be paused until you upgrade to a paid plan. We never charge you automatically. You'll receive email reminders at day 5 and day 7. You can extend your trial once by contacting support.",
  },
  {
    q: "Is there a team/organization plan?",
    a: "Yes! Business plans include team management with up to 5 members. You can invite teammates, set role-based permissions (Admin/Member/Viewer), and share deployments across your team. Contact sales for enterprise plans with more than 5 members.",
  },
];

export function FAQ() {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <section className="mx-auto max-w-3xl px-6 py-20">
      <div className="mb-12 text-center">
        <h2 className="text-3xl font-bold md:text-4xl">Frequently Asked Questions</h2>
      </div>
      <div className="space-y-3">
        {faqs.map((f, i) => {
          const isOpen = open === i;
          return (
            <div
              key={f.q}
              className="overflow-hidden rounded-xl border border-white/10 bg-white/5 backdrop-blur-xl"
            >
              <button
                onClick={() => setOpen(isOpen ? null : i)}
                className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
              >
                <span className="font-medium">{f.q}</span>
                <span
                  className={`text-cyan-400 transition-transform ${isOpen ? "rotate-45" : ""}`}
                >
                  +
                </span>
              </button>
              <div
                className={`grid transition-all duration-300 ${isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
                  }`}
              >
                <div className="overflow-hidden">
                  <p className="px-5 pb-4 text-sm text-white/70">{f.a}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <details className="group mt-8 overflow-hidden rounded-xl border border-white/10 bg-white/5 backdrop-blur-xl">
        <summary className="cursor-pointer list-none px-5 py-4 font-medium text-white/90 marker:hidden">
          🔧 Technical specifications for engineers
          <span className="float-right text-cyan-400 transition-transform group-open:rotate-45">+</span>
        </summary>
        <div className="grid gap-2 px-5 pb-5 text-sm text-white/70">
          <p>✓ Kubernetes 1.29+ with containerd runtime</p>
          <p>✓ PostgreSQL 15 with automated backups</p>
          <p>✓ Redis 7 caching layer</p>
          <p>✓ Prometheus + Grafana monitoring</p>
          <p>✓ 99.9% uptime SLA</p>
          <p>✓ DDoS protection via Cloudflare</p>
          <p>✓ GDPR compliant data handling</p>
        </div>
      </details>
    </section>
  );
}

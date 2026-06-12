"use client";

import { useState } from "react";

const faqs = [
  {
    q: "What's the difference between AmerCloud and AWS/Vercel?",
    a: "AmerCloud offers managed Kubernetes with Egyptian payment support (Fawry/InstaPay), local pricing in EGP, and lower latency for Middle East traffic. We're 60% cheaper than AWS for equivalent resources.",
  },
  {
    q: "Do I need to know Kubernetes?",
    a: "No! Our dashboard abstracts all K8s complexity. Click to deploy. But if you're advanced, you can use kubectl too.",
  },
  {
    q: "How does billing work in Egypt?",
    a: "Pay monthly via Fawry (cards + 3000+ locations), InstaPay (instant bank transfer), or Stripe for international cards. All prices in EGP with no hidden fees.",
  },
  {
    q: "Can I use my own domain?",
    a: "Yes, all paid plans include custom domains. We provision SSL automatically via Let's Encrypt.",
  },
  {
    q: "Is my data backed up?",
    a: "Yes, daily automated backups with one-click restore. Business plans include point-in-time recovery.",
  },
  {
    q: "Can I migrate away if needed?",
    a: "Absolutely. You own your code and data. Export via GitHub or kubectl anytime. No vendor lock-in.",
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
                className={`grid transition-all duration-300 ${
                  isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
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
    </section>
  );
}

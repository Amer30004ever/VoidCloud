"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { cloudApi, CloudPlan } from "@/lib/cloud";

export default function BillingPage() {
  const [current, setCurrent] = useState<any>(null);
  const [plans, setPlans] = useState<CloudPlan[]>([]);
  const [selPlan, setSelPlan] = useState<string | null>(null);
  const [provider, setProvider] = useState<"stripe" | "fawry" | "instapay" | "cash">("stripe");
  const [checkout, setCheckout] = useState<any>(null);

  useEffect(() => {
    cloudApi.billing.current().then(setCurrent);
    cloudApi.plans.list().then(setPlans);
  }, []);

  async function subscribe() {
    if (!selPlan) return;
    const res = await cloudApi.billing.subscribe(selPlan, provider);
    setCheckout(res);
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Billing</h1>

      <div className="rounded-2xl border border-cyan-400/30 bg-gradient-to-br from-cyan-500/10 to-fuchsia-500/10 p-6 backdrop-blur-xl">
        <div className="text-xs uppercase text-cyan-300">Current subscription</div>
        <div className="mt-1 text-2xl font-bold">{current?.plan?.name ?? "Free Trial"}</div>
        <div className="mt-1 text-sm text-white/60">Status: {current?.status} {current?.trialEndsAt && `· Trial ends ${new Date(current.trialEndsAt).toLocaleDateString()}`}</div>
        <Link href="/amercloud/dashboard/billing/invoices" className="mt-3 inline-block text-sm text-cyan-300 hover:underline">View invoices →</Link>
      </div>

      <div>
        <h2 className="mb-3 text-xl font-semibold">Upgrade / change plan</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {plans.filter((p) => p.slug !== "enterprise").map((p) => (
            <button key={p.id} onClick={() => setSelPlan(p.id)}
              className={`rounded-2xl border p-5 text-left backdrop-blur-xl transition ${selPlan === p.id ? "border-cyan-400 bg-cyan-500/10" : "border-white/10 bg-white/5 hover:border-white/20"}`}>
              <div className="font-bold">{p.name}</div>
              <div className="text-2xl font-bold">${p.priceUSD}<span className="text-sm text-white/50">/mo</span></div>
              <div className="text-xs text-white/40">{p.priceEGP} EGP</div>
              <div className="mt-2 text-xs text-white/60">{p.cpuLimit} CPU · {p.memoryLimit}MB · {p.deploymentLimit} deploys</div>
            </button>
          ))}
        </div>
      </div>

      {selPlan && (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl">
          <h3 className="mb-3 font-semibold">Choose payment method</h3>
          <div className="mb-4 grid gap-2 md:grid-cols-4">
            {(["stripe", "fawry", "instapay", "cash"] as const).map((p) => (
              <button key={p} onClick={() => setProvider(p)} className={`rounded-lg border p-3 text-sm capitalize ${provider === p ? "border-cyan-400 bg-cyan-500/10" : "border-white/10 bg-white/5"}`}>
                {p === "stripe" ? "💳 Credit card" : p === "fawry" ? "🏪 Fawry" : p === "instapay" ? "🏦 InstaPay" : "💵 Cash"}
              </button>
            ))}
          </div>
          <button onClick={subscribe} className="rounded-lg bg-gradient-to-r from-cyan-400 to-fuchsia-500 px-6 py-3 font-semibold text-slate-950">Continue →</button>
        </div>
      )}

      {checkout && (
        <div className="rounded-2xl border border-green-500/30 bg-green-500/10 p-6">
          <h3 className="mb-3 font-bold">Checkout details</h3>
          <pre className="overflow-auto rounded-lg bg-slate-950 p-4 text-xs">{JSON.stringify(checkout, null, 2)}</pre>
          {checkout.checkout?.sessionUrl && (
            <a href={checkout.checkout.sessionUrl} target="_blank" rel="noreferrer" className="mt-3 inline-block rounded-lg bg-cyan-400 px-4 py-2 text-sm font-semibold text-slate-950">Pay with Stripe →</a>
          )}
        </div>
      )}
    </div>
  );
}

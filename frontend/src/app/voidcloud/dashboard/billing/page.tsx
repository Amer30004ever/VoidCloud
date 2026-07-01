/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { cloudApi, CloudPlan } from "@/lib/cloud";

type Provider = "stripe" | "fawry" | "instapay" | "cash";

export default function BillingPage() {
  const [current, setCurrent] = useState<any>(null);
  const [plans, setPlans] = useState<CloudPlan[]>([]);
  const [selPlan, setSelPlan] = useState<string | null>(null);
  const [provider, setProvider] = useState<Provider>("stripe");
  const [customerPhone, setCustomerPhone] = useState("");
  const [payerInstapayId, setPayerInstapayId] = useState("");
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    cloudApi.billing.current().then(setCurrent).catch(() => { });
    cloudApi.plans.list().then(setPlans).catch(() => { });
  }, []);

  async function subscribe() {
    if (!selPlan) return;
    setError(null); setBusy(true); setResult(null);
    try {
      const res = await cloudApi.billing.subscribe({
        planId: selPlan,
        provider,
        ...(provider === "fawry" ? { customerPhone } : {}),
        ...(provider === "instapay" ? { payerInstapayId } : {}),
      });
      setResult(res);
      // For Stripe, auto-redirect to hosted checkout.
      if (provider === "stripe" && res?.checkout?.sessionUrl) {
        window.location.href = res.checkout.sessionUrl;
      }
    } catch (e: any) {
      setError(e?.response?.data?.message ?? e?.message ?? "Subscription failed");
    } finally {
      setBusy(false);
    }
  }

  const selectedPlan = plans.find((p) => p.id === selPlan);
  const phoneValid = /^01[0-9]{9}$/.test(customerPhone);
  const instapayValid = /^[\w.+-]{2,}@[\w.+-]{2,}$/.test(payerInstapayId);
  const canSubmit =
    !busy && selPlan &&
    (provider !== "fawry" || phoneValid) &&
    (provider !== "instapay" || instapayValid);

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Billing</h1>

      <div className="rounded-2xl border border-cyan-400/30 bg-gradient-to-br from-cyan-500/10 to-fuchsia-500/10 p-6 backdrop-blur-xl">
        <div className="text-xs uppercase text-cyan-300">Current subscription</div>
        <div className="mt-1 text-2xl font-bold">{current?.plan?.name ?? "Free Trial"}</div>
        <div className="mt-1 text-sm text-white/60">
          Status: <StatusPill status={current?.status ?? "TRIALING"} />
          {current?.trialEndsAt && <> · Trial ends {new Date(current.trialEndsAt).toLocaleDateString()}</>}
        </div>
        <Link href="/voidcloud/dashboard/billing/invoices" className="mt-3 inline-block text-sm text-cyan-300 hover:underline">View invoices →</Link>
      </div>

      {!result && (
        <>
          <div>
            <h2 className="mb-3 text-xl font-semibold">Upgrade / change plan</h2>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {plans.filter((p) => p.slug !== "enterprise").map((p) => (
                <button key={p.id} onClick={() => setSelPlan(p.id)}
                  className={`rounded-2xl border p-5 text-left backdrop-blur-xl transition ${selPlan === p.id ? "border-cyan-400 bg-cyan-500/10" : "border-white/10 bg-white/5 hover:border-white/20"}`}>
                  <div className="font-bold">{p.name}</div>
                  <div className="text-2xl font-bold">${p.priceUSD}<span className="text-sm text-white/50">/mo</span></div>
                  <div className="text-xs text-white/40">{p.priceEGP} EGP</div>
                  <div className="mt-2 text-xs text-white/60">{p.cpuLimit} CPU · {p.memoryLimit}MB · {(p as any).vpsLimit ?? p.deploymentLimit} VPS</div>
                </button>
              ))}
            </div>
          </div>

          {selPlan && (
            <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl">
              <h3 className="mb-3 font-semibold">Choose payment method</h3>
              <div className="mb-4 grid gap-2 md:grid-cols-4">
                {(["stripe", "fawry", "instapay", "cash"] as Provider[]).map((p) => (
                  <button key={p} onClick={() => setProvider(p)} className={`rounded-lg border p-3 text-sm ${provider === p ? "border-cyan-400 bg-cyan-500/10" : "border-white/10 bg-white/5"}`}>
                    {p === "stripe" ? "💳 Credit card" : p === "fawry" ? "🏪 Fawry / Vodafone Cash" : p === "instapay" ? "🏦 InstaPay" : "💵 Cash on delivery"}
                  </button>
                ))}
              </div>

              {provider === "fawry" && (
                <div className="mb-4">
                  <label className="mb-1 block text-xs uppercase text-white/60">Phone number (010/011/012/015)</label>
                  <input
                    type="tel"
                    inputMode="numeric"
                    maxLength={11}
                    placeholder="01001234567"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value.replace(/\D/g, ""))}
                    className="w-full rounded-lg border border-white/10 bg-slate-950/50 p-3 text-sm outline-none focus:border-cyan-400"
                  />
                  {customerPhone && !phoneValid && <p className="mt-1 text-xs text-red-300">Must be Egyptian format: 01XXXXXXXXX (11 digits)</p>}
                </div>
              )}

              {provider === "instapay" && (
                <div className="mb-4">
                  <label className="mb-1 block text-xs uppercase text-white/60">Your InstaPay ID</label>
                  <input
                    type="text"
                    placeholder="yourname@instapay"
                    value={payerInstapayId}
                    onChange={(e) => setPayerInstapayId(e.target.value)}
                    className="w-full rounded-lg border border-white/10 bg-slate-950/50 p-3 text-sm outline-none focus:border-cyan-400"
                  />
                  {payerInstapayId && !instapayValid && <p className="mt-1 text-xs text-red-300">Format: name@instapay</p>}
                </div>
              )}

              {provider === "cash" && (
                <p className="mb-4 rounded-lg border border-yellow-500/30 bg-yellow-500/10 p-3 text-xs text-yellow-200">
                  Your VPS will not be provisioned until an admin manually approves your cash payment (within 24h).
                </p>
              )}

              {error && <p className="mb-3 text-sm text-red-300">{error}</p>}

              <button
                onClick={subscribe}
                disabled={!canSubmit}
                className="rounded-lg bg-gradient-to-r from-cyan-400 to-fuchsia-500 px-6 py-3 font-semibold text-slate-950 disabled:opacity-50"
              >
                {busy ? "Processing…" : provider === "stripe" ? "Continue to Stripe →" : `Pay ${selectedPlan?.priceEGP ?? 0} EGP`}
              </button>
            </div>
          )}
        </>
      )}

      {result && <ResultPanel result={result} onReset={() => { setResult(null); setSelPlan(null); }} />}
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const c: Record<string, string> = {
    ACTIVE: "border-green-500/30 bg-green-500/10 text-green-300",
    TRIALING: "border-cyan-500/30 bg-cyan-500/10 text-cyan-300",
    PENDING_PAYMENT: "border-yellow-500/30 bg-yellow-500/10 text-yellow-300",
    EXPIRED: "border-red-500/30 bg-red-500/10 text-red-300",
    CANCELED: "border-gray-500/30 bg-gray-500/10 text-gray-300",
  };
  return <span className={`ml-1 rounded-full border px-2 py-0.5 text-xs ${c[status] ?? c.TRIALING}`}>{status}</span>;
}

function ResultPanel({ result, onReset }: { result: any; onReset: () => void }) {
  const c = result.checkout ?? {};
  const inv = result.invoice ?? {};
  return (
    <div className="space-y-4 rounded-2xl border border-green-500/30 bg-green-500/5 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-bold">Invoice {inv.number}</h3>
          <p className="text-xs text-white/60">
            {c.amount} {c.currency} · {c.provider?.toUpperCase()}
          </p>
        </div>
        <button onClick={onReset} className="text-xs text-white/60 hover:underline">← Choose different plan</button>
      </div>

      {c.provider === "fawry" && <FawryPanel c={c} />}
      {c.provider === "instapay" && <InstaPayPanel c={c} />}
      {c.provider === "cash" && <CashPanel c={c} />}
      {c.provider === "stripe" && !c.sessionUrl && (
        <p className="text-sm text-white/70">Redirecting to Stripe…</p>
      )}
      {c.provider === "stripe" && c.sessionUrl && (
        <a href={c.sessionUrl} className="inline-block rounded-lg bg-cyan-400 px-4 py-2 text-sm font-semibold text-slate-950">
          Pay with Stripe →
        </a>
      )}

      <Link href="/voidcloud/dashboard/billing/invoices" className="block text-xs text-cyan-300 hover:underline">
        View this invoice →
      </Link>
    </div>
  );
}

function FawryPanel({ c }: { c: any }) {
  return (
    <div className="space-y-3">
      {c.sandbox && <p className="rounded bg-orange-500/10 px-2 py-1 text-xs text-orange-300">Sandbox mode — no real charge</p>}
      <div className="grid gap-4 md:grid-cols-[auto,1fr]">
        {c.qrCode && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={c.qrCode} alt="Fawry QR" className="h-44 w-44 rounded-lg bg-white p-2" />
        )}
        <div className="space-y-2 text-sm">
          <div><span className="text-white/50">Reference:</span> <code className="rounded bg-slate-950 px-2 py-0.5">{c.reference}</code></div>
          <div><span className="text-white/50">Amount:</span> {c.amount} EGP</div>
          <div><span className="text-white/50">Pay to (Vodafone Cash):</span> <code className="rounded bg-slate-950 px-2 py-0.5">{c.merchantPhone}</code></div>
          <p className="mt-2 text-xs text-white/60">
            Scan at any Fawry kiosk, or send via Vodafone Cash to the number above and include the reference.
          </p>
        </div>
      </div>
      {c.paymentUrl && (
        <a href={c.paymentUrl} target="_blank" rel="noreferrer" className="inline-block rounded-lg bg-cyan-400 px-4 py-2 text-sm font-semibold text-slate-950">
          Open Fawry payment page →
        </a>
      )}
    </div>
  );
}

function InstaPayPanel({ c }: { c: any }) {
  return (
    <div className="space-y-3 text-sm">
      {c.sandbox && <p className="rounded bg-orange-500/10 px-2 py-1 text-xs text-orange-300">Sandbox mode — no real transfer</p>}
      <div><span className="text-white/50">Send to (InstaPay ID):</span> <code className="rounded bg-slate-950 px-2 py-0.5">{c.merchantInstapayId}</code></div>
      <div><span className="text-white/50">Amount:</span> {c.amount} EGP</div>
      <div><span className="text-white/50">Reference (include in note):</span> <code className="rounded bg-slate-950 px-2 py-0.5">{c.reference}</code></div>
      {c.instructions && <p className="text-xs text-white/60">{c.instructions}</p>}
      {c.paymentUrl && (
        <a href={c.paymentUrl} target="_blank" rel="noreferrer" className="inline-block rounded-lg bg-cyan-400 px-4 py-2 text-sm font-semibold text-slate-950">
          Open InstaPay →
        </a>
      )}
    </div>
  );
}

function CashPanel({ c }: { c: any }) {
  return (
    <div className="space-y-2 text-sm">
      <p className="rounded bg-yellow-500/10 px-3 py-2 text-yellow-200">⏳ Awaiting admin approval</p>
      <p className="text-white/70">{c.instructions}</p>
      <p className="text-xs text-white/50">You will be notified by email once approved, and your VPS will be provisioned automatically.</p>
    </div>
  );
}

"use client";

import { useState, useEffect, Suspense, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import api from "@/lib/api";
import { AuthShell, Input } from "@/components/auth/AuthShell";

type Plan = { id: string; slug: string; name: string; priceUSD: number; priceEGP: number; trialDays: number };

function scorePassword(pw: string): { score: number; label: string; color: string } {
  let s = 0;
  if (pw.length >= 8) s++;
  if (pw.length >= 12) s++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) s++;
  if (/\d/.test(pw)) s++;
  if (/[^A-Za-z0-9]/.test(pw)) s++;
  const labels = ["Too weak", "Weak", "Fair", "Good", "Strong", "Excellent"];
  const colors = ["bg-red-500", "bg-red-400", "bg-yellow-400", "bg-emerald-400", "bg-emerald-500", "bg-cyan-400"];
  return { score: s, label: labels[s], color: colors[s] };
}

function isEgyptianPhone(p: string): boolean {
  return /^(\+?20)?1[0-2,5]\d{8}$/.test(p.replace(/\s|-/g, ""));
}

function RegisterInner() {
  const params = useSearchParams();
  const initialPlan = params.get("plan") ?? "free";

  const [plans, setPlans] = useState<Plan[]>([]);
  const [planSlug, setPlanSlug] = useState(initialPlan);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [tosAccepted, setTosAccepted] = useState(false);

  useEffect(() => {
    api.get("/cloud/plans").then((r) => setPlans(r.data ?? [])).catch(() => setPlans([]));
  }, []);

  const strength = useMemo(() => scorePassword(password), [password]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    if (!name.trim()) return setErr("Please enter your full name");
    if (phone && !isEgyptianPhone(phone)) return setErr("Phone must be a valid Egyptian number (e.g. +201012345678)");
    if (strength.score < 3) return setErr("Please choose a stronger password");
    if (password !== confirm) return setErr("Passwords do not match");

    setBusy(true);
    try {
      await api.post("/auth/register", {
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password,
        phone: phone || undefined,
        planSlug,
        tosAccepted: true,
      });
      setDone(true);
    } catch (e: unknown) {
      const error = e as { response?: { data?: { message?: string } } };
      setErr(error?.response?.data?.message ?? "Registration failed");
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <AuthShell title="Check your inbox ðŸ“¬" subtitle="We sent a verification link to your email">
        <div className="space-y-4 text-sm text-white/80">
          <p>Verify <strong>{email}</strong> to activate your account. The link is valid for 24 hours.</p>
          <button
            onClick={() => api.post("/auth/resend-verification", { email }).catch(() => { })}
            className="w-full rounded-xl border border-white/10 bg-white/5 py-3 font-medium text-white hover:bg-white/10"
          >Resend verification email</button>
          <Link
            href="/voidcloud/login"
            className="block w-full rounded-xl bg-gradient-to-r from-cyan-400 to-fuchsia-500 py-3 text-center font-semibold text-slate-950"
          >Go to sign in â†’</Link>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell title="Create your account" subtitle="Start deploying on VoidCloud in minutes">
      <form onSubmit={submit} className="space-y-4">
        {err && <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">{err}</div>}

        <Input label="Full name" value={name} onChange={setName} required />
        <Input label="Email" type="email" value={email} onChange={setEmail} required />
        <Input label="Phone (Egyptian)" type="tel" value={phone} onChange={setPhone} placeholder="+201012345678" />
        <Input label="Password" type="password" value={password} onChange={setPassword} required />

        {password && (
          <div className="space-y-1">
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
              <div className={`h-full ${strength.color} transition-all`} style={{ width: `${(strength.score / 5) * 100}%` }} />
            </div>
            <p className="text-xs text-white/60">Strength: {strength.label}</p>
          </div>
        )}

        <Input label="Confirm password" type="password" value={confirm} onChange={setConfirm} required />

        <div>
          <label className="mb-2 block text-sm text-white/70">Select plan</label>
          <div className="grid gap-2">
            {(plans.length ? plans : [
              { id: "free", slug: "free", name: "Free Trial", priceUSD: 0, priceEGP: 0, trialDays: 7 },
              { id: "starter", slug: "starter", name: "Starter", priceUSD: 9, priceEGP: 450, trialDays: 0 },
              { id: "pro", slug: "pro", name: "Pro", priceUSD: 29, priceEGP: 1450, trialDays: 0 },
            ] as Plan[]).map((p) => (
              <label key={p.slug} className={`flex cursor-pointer items-center justify-between rounded-xl border p-3 text-sm transition ${planSlug === p.slug ? "border-cyan-400 bg-cyan-400/10" : "border-white/10 bg-white/5 hover:border-white/20"}`}>
                <span className="flex items-center gap-3">
                  <input type="radio" name="plan" value={p.slug} checked={planSlug === p.slug} onChange={() => setPlanSlug(p.slug)} className="accent-cyan-400" />
                  <span className="font-medium text-white">{p.name}</span>
                  {p.trialDays > 0 && <span className="rounded-full bg-emerald-400/20 px-2 py-0.5 text-xs text-emerald-300">{p.trialDays}-day trial</span>}
                </span>
                <span className="text-white/70">{p.priceUSD === 0 ? "Free" : `$${p.priceUSD}/mo`}</span>
              </label>
            ))}
          </div>
        </div>

        <label className="flex items-start gap-2 text-sm text-white/80">
          <input
            type="checkbox"
            checked={tosAccepted}
            onChange={(e) => setTosAccepted(e.target.checked)}
            className="mt-0.5 h-4 w-4 accent-cyan-400"
            required
          />
          <span>
            I agree to the <Link href="/tos" target="_blank" className="text-cyan-300 hover:underline">Terms of Service</Link> and <Link href="/privacy" target="_blank" className="text-cyan-300 hover:underline">Privacy Policy</Link>.
          </span>
        </label>

        <button disabled={busy || !tosAccepted} className="w-full rounded-xl bg-gradient-to-r from-cyan-400 to-fuchsia-500 py-3 font-semibold text-slate-950 disabled:opacity-60">
          {busy ? "Creating…" : "Create account →"}
        </button>

        <div className="relative my-4">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-white/10" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-slate-950/80 px-2 text-white/50">Or continue with</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <button type="button" onClick={() => window.location.href = '/api/v1/auth/google?context=user_signup'} className="rounded-xl border border-white/10 bg-white/5 py-2.5 text-sm font-medium text-white hover:bg-white/10">
            Google
          </button>
          <button type="button" onClick={() => window.location.href = '/api/v1/auth/github?context=user_signup'} className="rounded-xl border border-white/10 bg-white/5 py-2.5 text-sm font-medium text-white hover:bg-white/10">
            GitHub
          </button>
        </div>

        <p className="text-center text-sm text-white/60">
          Already have an account? <Link href="/voidcloud/login" className="text-cyan-300 hover:underline">Sign in</Link>
        </p>
      </form>
    </AuthShell>
  );
}

export default function RegisterPage() {
  return <Suspense fallback={<div className="min-h-screen bg-slate-950" />}><RegisterInner /></Suspense>;
}

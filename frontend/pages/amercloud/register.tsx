"use client";

import { useState, useEffect, Suspense, useMemo } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import api from "@/lib/api";

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
  const router = useRouter();
  const initialPlan = (router.query.plan as string) ?? "free";

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

  useEffect(() => {
    api.get("cloud/plans").then((r) => setPlans(r.data ?? [])).catch(() => setPlans([]));
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
      await api.post("auth/register", {
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password,
        phone: phone || undefined,
        planSlug,
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
      <AuthShell title="Check your inbox 📬" subtitle="We sent a verification link to your email">
        <div className="space-y-4 text-sm text-white/80">
          <p>Verify <strong>{email}</strong> to activate your account. The link is valid for 24 hours.</p>
          <button
            onClick={() => api.post("auth/resend-verification", { email }).catch(() => { })}
            className="w-full rounded-xl border border-white/10 bg-white/5 py-3 font-medium text-white hover:bg-white/10"
          >Resend verification email</button>
          <Link
            href="/voidcloud/login"
            className="block w-full rounded-xl bg-gradient-to-r from-cyan-400 to-fuchsia-500 py-3 text-center font-semibold text-slate-950"
          >Go to sign in →</Link>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell title="Create your account" subtitle="Start deploying on Void Cloud in minutes">
      <form onSubmit={submit} className="space-y-4">
        {err && <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">{err}</div>}

        <Input label="Full name" value={name} onValueChange={setName} required />
        <Input label="Email" type="email" value={email} onValueChange={setEmail} required />
        <Input label="Phone (Egyptian)" type="tel" value={phone} onValueChange={setPhone} placeholder="+201012345678" />
        <Input label="Password" type="password" value={password} onValueChange={setPassword} required />

        {password && (
          <div className="space-y-1">
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
              <div className={`h-full ${strength.color} transition-all`} style={{ width: `${(strength.score / 5) * 100}%` }} />
            </div>
            <p className="text-xs text-white/60">Strength: {strength.label}</p>
          </div>
        )}

        <Input label="Confirm password" type="password" value={confirm} onValueChange={setConfirm} required />

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

        <button disabled={busy} className="w-full rounded-xl bg-gradient-to-r from-cyan-400 to-fuchsia-500 py-3 font-semibold text-slate-950 disabled:opacity-60">
          {busy ? "Creating…" : "Create account →"}
        </button>
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

export function AuthShell({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="grid min-h-screen place-items-center bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-6 text-white">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-white/5 p-8 backdrop-blur-xl">
        <Link href="/voidcloud" className="mb-6 flex items-center gap-2 text-lg font-bold">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-cyan-400 to-fuchsia-500 text-slate-950">☁</span>
          Void Cloud
        </Link>
        <h1 className="text-2xl font-bold">{title}</h1>
        {subtitle && <p className="mb-6 mt-1 text-sm text-white/60">{subtitle}</p>}
        {children}
      </div>
    </div>
  );
}

export function Input({ label, type = "text", value, onValueChange, required, placeholder }: any) {
  const isPassword = type === "password";
  const [show, setShow] = useState(false);
  const effectiveType = isPassword ? (show ? "text" : "password") : type;
  return (
    <label className="block">
      <span className="mb-1 block text-xs uppercase tracking-wide text-white/60">{label}</span>
      <div className="relative">
        <input
          type={effectiveType}
          value={value}
          onChange={(e) => onValueChange?.(e.target.value)}
          required={required}
          placeholder={placeholder}
          className={`w-full rounded-lg border border-white/10 bg-slate-950/60 px-4 py-3 outline-none transition focus:border-cyan-400/50 ${isPassword ? "pr-12" : ""}`}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setShow((v) => !v)}
            tabIndex={-1}
            aria-label={show ? "Hide password" : "Show password"}
            className="absolute inset-y-0 right-0 flex items-center px-3 text-white/50 hover:text-white"
          >
            {show ? (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17.94 17.94A10.94 10.94 0 0 1 12 20c-7 0-11-8-11-8a21.77 21.77 0 0 1 5.06-6.06" />
                <path d="M9.9 4.24A10.94 10.94 0 0 1 12 4c7 0 11 8 11 8a21.83 21.83 0 0 1-3.17 4.19" />
                <path d="M14.12 14.12a3 3 0 1 1-4.24-4.24" />
                <line x1="1" y1="1" x2="23" y2="23" />
              </svg>
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            )}
          </button>
        )}
      </div>
    </label>
  );
}

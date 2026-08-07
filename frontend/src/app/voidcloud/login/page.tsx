"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import api from "@/lib/api";
import { AuthShell, Input } from "@/components/auth/AuthShell";

function LoginInner() {
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [needs2FA, setNeeds2FA] = useState(false);
  const [twoFactorToken, setTwoFactorToken] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setErr("");
    try {
      const body: Record<string, string> = { email, password };
      if (needs2FA && twoFactorToken) body.twoFactorToken = twoFactorToken.trim();
      const { data } = await Promise.race([
        api.post("/auth/login", body),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("Login request timed out. Please check your connection and try again.")), 15000)
        ),
      ]);
      if (data?.requires2FA) {
        setNeeds2FA(true);
        setBusy(false);
        return;
      }
      const token = data.access_token ?? data.token;
      if (token) {
        if (remember) localStorage.setItem("voidcloud_token", token);
        else sessionStorage.setItem("voidcloud_token", token);
      }
      const role = data.user?.role;
      const redirect = params.get("redirect");
      if (redirect) {
        router.push(redirect);
      } else if (role === "SUPER_ADMIN") {
        router.push("/voidcloud/admin/dashboard");
      } else if (role === "ADMIN") {
        router.push("/voidcloud/business/dashboard");
      } else if (role === "AGENT") {
        router.push("/voidcloud/agent/dashboard");
      } else {
        router.push("/voidcloud/user/dashboard");
      }
    } catch (e: unknown) {
      const err = e as { message?: string; response?: { status?: number; data?: { message?: string; error?: string } } };
      if (err.message && !err.response) {
        setErr(err.message);
      } else {
        const status = err.response?.status;
        const message = err.response?.data?.message ?? err.response?.data?.error;
        if (status === 401) {
          setErr(message ?? "Invalid credentials. Please try again.");
        } else if (message) {
          setErr(message);
        } else {
          setErr("Portal API is unreachable. Please check backend health and try again.");
        }
      }
    } finally { setBusy(false); }
  }

  return (
    <AuthShell title="Welcome back" subtitle="Sign in to your VoidCloud account">
      <form onSubmit={submit} className="space-y-4">
        {err && <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">{err}</div>}
        <Input label="Email" type="email" value={email} onChange={setEmail} required />
        <Input label="Password" type="password" value={password} onChange={setPassword} required />
        {needs2FA && (
          <Input label="Two-factor code (or recovery code)" type="text" value={twoFactorToken} onChange={setTwoFactorToken} required placeholder="123456" />
        )}
        <label className="flex items-center justify-between text-sm">
          <span className="flex items-center gap-2">
            <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
            Remember me
          </span>
          <Link href="/voidcloud/forgot-password" className="text-cyan-300 hover:underline">Forgot password?</Link>
        </label>
        <button disabled={busy} className="w-full rounded-xl bg-gradient-to-r from-cyan-400 to-fuchsia-500 py-3 font-semibold text-slate-950 disabled:opacity-60">
          {busy ? "Signing in…" : "Sign in"}
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
          <button type="button" onClick={() => window.location.href = '/api/v1/auth/google?context=user_signup'} className="flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 py-2.5 text-sm font-medium text-white hover:bg-white/10">
            Google
          </button>
          <button type="button" onClick={() => window.location.href = '/api/v1/auth/github?context=user_signup'} className="flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 py-2.5 text-sm font-medium text-white hover:bg-white/10">
            GitHub
          </button>
          <button type="button" onClick={() => window.location.href = '/api/v1/auth/gitea?context=user_signup'} className="flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 py-2.5 text-sm font-medium text-white hover:bg-white/10">
            Gitea
          </button>
          <button type="button" onClick={() => window.location.href = '/api/v1/auth/portainer?context=user_signup'} className="flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 py-2.5 text-sm font-medium text-white hover:bg-white/10">
            Portainer
          </button>
        </div>

        <p className="text-center text-sm text-white/60">
          New to VoidCloud? <Link href="/voidcloud/register" className="text-cyan-300 hover:underline">Create account</Link>
        </p>
        <p className="text-center text-xs text-white/50">
          Didn&apos;t get the verification email?{" "}
          <button
            type="button"
            onClick={() => { if (email) api.post("/auth/resend-verification", { email }).catch(() => {}); }}
            className="text-cyan-300 hover:underline"
          >Resend</button>
        </p>
      </form>
    </AuthShell>
  );
}

export default function LoginPage() {
  return <Suspense fallback={<div className="min-h-screen bg-slate-950" />}><LoginInner /></Suspense>;
}

/* eslint-disable @typescript-eslint/no-explicit-any */

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "@/compat/next-navigation";
import Link from "@/compat/next-link";
import api from "@/lib/api";
import { useLocale } from "@/contexts/LocaleContext";

function LoginInner() {
  const router = useRouter();
  const params = useSearchParams();
  const { t } = useLocale();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [needs2FA, setNeeds2FA] = useState(false);
  const [twoFactorToken, setTwoFactorToken] = useState("");

  function resolveAuthError(error: unknown, fallback: string) {
    const response = (error as { response?: { status?: number; data?: { message?: string; error?: string; statusCode?: number } } }).response;
    const detail = response?.data?.message ?? response?.data?.error;

    if (response?.status === 401) {
      return detail ?? fallback;
    }

    if (detail) {
      return detail;
    }

    return fallback;
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setErr("");
    try {
      const body: Record<string, string> = { email, password };
      if (needs2FA && twoFactorToken) body.twoFactorToken = twoFactorToken.trim();
      const { data } = await api.post("auth/login", body);
      if (data?.requires2FA) {
        setNeeds2FA(true);
        setBusy(false);
        return;
      }
      const token = data.access_token ?? data.token;
      if (token) {
        if (remember) localStorage.setItem("amer_portal_token", token);
        else sessionStorage.setItem("amer_portal_token", token);
      }
      const role = data.user?.role;
      const redirect = params.get("redirect");
      if (redirect) {
        router.push(redirect);
      } else if (role === "ADMIN") {
        router.push("/amercloud/admin/dashboard");
      } else {
        router.push("/amercloud/user/dashboard");
      }
    } catch (e: unknown) {
      const fallbackMessage = t("auth.api_unreachable", "Portal API is unreachable. Please check backend health and try again.");
      const status = (e as { response?: { status?: number; data?: { message?: string } } }).response?.status;
      const message = resolveAuthError(e, fallbackMessage);
      setErr(status === 401 ? (message ?? t("auth.invalid_credentials", "Invalid credentials. Please try again.")) : message);
    } finally { setBusy(false); }
  }

  return (
    <AuthShell title={t("auth.login_title", "Welcome back")} subtitle={t("auth.login_subtitle", "Sign in to your Void Cloud account")}>
      <form onSubmit={submit} className="space-y-4">
        {err && <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">{err}</div>}
        <Input label={t("common.email", "Email")} type="email" value={email} onValueChange={setEmail} required />
        <Input label={t("common.password", "Password")} type="password" value={password} onValueChange={setPassword} required />
        {needs2FA && (
          <Input label={t("auth.two_factor_code", "Two-factor code (or recovery code)")} type="text" value={twoFactorToken} onValueChange={setTwoFactorToken} required placeholder="123456" />
        )}
        <label className="flex items-center justify-between text-sm">
          <span className="flex items-center gap-2">
            <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
            {t("auth.remember_me", "Remember me")}
          </span>
          <Link href="/amercloud/forgot-password" className="text-cyan-300 hover:underline">{t("auth.forgot_password", "Forgot password?")}</Link>
        </label>
        <button disabled={busy} className="w-full rounded-xl bg-gradient-to-r from-cyan-400 to-fuchsia-500 py-3 font-semibold text-slate-950 disabled:opacity-60">
          {busy ? t("auth.signing_in", "Signing in…") : t("auth.sign_in", "Sign in")}
        </button>
        <p className="text-center text-sm text-white/60">
          {t("auth.new_to", "New to Void Cloud?")} <Link href="/amercloud/register" className="text-cyan-300 hover:underline">{t("auth.create_account", "Create account")}</Link>
        </p>
        <p className="text-center text-xs text-white/50">
          {t("auth.verify_email_prompt", "Didn't get the verification email?")}{" "}
          <button
            type="button"
            onClick={() => { if (email) api.post("auth/resend-verification", { email }).catch(() => { }); }}
            className="text-cyan-300 hover:underline"
          >{t("auth.resend", "Resend")}</button>
        </p>
      </form>
    </AuthShell>
  );
}

export default function LoginPage() {
  return <Suspense fallback={<div className="min-h-screen bg-slate-950" />}><LoginInner /></Suspense>;
}

export function AuthShell({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="grid min-h-screen place-items-center bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-6 text-white">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-white/5 p-8 backdrop-blur-xl">
        <Link href="/amercloud" className="mb-6 flex items-center gap-2 text-lg font-bold">
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
          data-testid={isPassword ? "password-input" : undefined}
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


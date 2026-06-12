"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import api from "@/lib/api";
import { AuthShell, Input } from "../login/page";

function ResetPasswordInner() {
  const router = useRouter();
  const params = useSearchParams();
  const token = params.get("token") || "";
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [err, setErr] = useState("");
  const [ok, setOk] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!token) setErr("Missing or invalid reset link. Request a new one below.");
  }, [token]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    if (password.length < 8) return setErr("Password must be at least 8 characters.");
    if (password !== confirm) return setErr("Passwords do not match.");
    setBusy(true);
    try {
      await api.post("/auth/reset-password", { token, password });
      setOk(true);
      setTimeout(() => router.push("/amercloud/login"), 2000);
    } catch (e: unknown) {
      const msg =
        (e as { response?: { data?: { message?: string | string[] } } })?.response?.data?.message;
      setErr(Array.isArray(msg) ? msg.join(", ") : msg ?? "Reset failed. The link may have expired.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthShell title="Set a new password" subtitle="Choose a strong password you haven't used before.">
      {ok ? (
        <div className="space-y-4">
          <p className="rounded-lg border border-emerald-400/30 bg-emerald-400/10 p-4 text-sm text-emerald-200">
            Password updated. Redirecting to sign in…
          </p>
          <Link href="/amercloud/login" className="block text-center text-sm text-cyan-300 hover:underline">
            Go to sign in →
          </Link>
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-4">
          {err && (
            <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">
              {err}
            </div>
          )}
          <Input label="New password" type="password" value={password} onChange={setPassword} required />
          <Input label="Confirm password" type="password" value={confirm} onChange={setConfirm} required />
          <button
            disabled={busy || !token}
            className="w-full rounded-xl bg-gradient-to-r from-cyan-400 to-fuchsia-500 py-3 font-semibold text-slate-950 disabled:opacity-60"
          >
            {busy ? "Updating…" : "Update password"}
          </button>
          <p className="text-center text-sm text-white/60">
            <Link href="/amercloud/forgot-password" className="text-cyan-300 hover:underline">
              Request a new reset link
            </Link>
          </p>
        </form>
      )}
    </AuthShell>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-950" />}>
      <ResetPasswordInner />
    </Suspense>
  );
}

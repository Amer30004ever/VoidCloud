"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import api from "@/lib/api";
import { AuthShell, Input } from "../login/page";

function RegisterInner() {
  const router = useRouter();
  const params = useSearchParams();
  const planSlug = params.get("plan") ?? "free";
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setErr("");
    try {
      await api.post("/auth/register", { name, email, password }).catch(() => {});
      const { data } = await api.post("/auth/login", { email, password });
      const token = data.access_token ?? data.token;
      if (token) localStorage.setItem("amer_portal_token", token);
      router.push(`/amercloud/dashboard?welcome=1&plan=${planSlug}`);
    } catch (e: any) {
      setErr(e.response?.data?.message ?? "Registration failed");
    } finally { setBusy(false); }
  }

  return (
    <AuthShell title="Create your account" subtitle={`Starting with the ${planSlug} plan — change anytime.`}>
      <form onSubmit={submit} className="space-y-4">
        {err && <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">{err}</div>}
        <Input label="Full name" value={name} onChange={setName} required />
        <Input label="Email" type="email" value={email} onChange={setEmail} required />
        <Input label="Password" type="password" value={password} onChange={setPassword} required />
        <button disabled={busy} className="w-full rounded-xl bg-gradient-to-r from-cyan-400 to-fuchsia-500 py-3 font-semibold text-slate-950 disabled:opacity-60">
          {busy ? "Creating…" : "Create account →"}
        </button>
        <p className="text-center text-sm text-white/60">
          Already have an account? <Link href="/amercloud/login" className="text-cyan-300 hover:underline">Sign in</Link>
        </p>
      </form>
    </AuthShell>
  );
}

export default function RegisterPage() {
  return <Suspense fallback={<div className="min-h-screen bg-slate-950" />}><RegisterInner /></Suspense>;
}

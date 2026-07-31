"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import api from "@/lib/api";
import { AuthShell } from "@/components/auth/AuthShell";

function VerifyInner() {
  const params = useSearchParams();
  const token = params.get("token") ?? "";
  const [state, setState] = useState<"loading" | "ok" | "error">("loading");
  const [msg, setMsg] = useState("");

  useEffect(() => {
    if (!token) {
      queueMicrotask(() => { setState("error"); setMsg("Missing verification token"); });
      return;
    }
    api.post("/auth/verify-email", { token })
      .then(() => setState("ok"))
      .catch((e) => { setState("error"); setMsg(e?.response?.data?.message ?? "Invalid or expired link"); });
  }, [token]);

  return (
    <AuthShell title={state === "ok" ? "Email verified âœ“" : state === "error" ? "Verification failed" : "Verifyingâ€¦"}>
      <div className="space-y-4 text-sm text-white/80">
        {state === "loading" && <p>Hang tight while we confirm your emailâ€¦</p>}
        {state === "ok" && (
          <>
            <p>Your email is now verified. You can sign in to your VoidCloud account.</p>
            <Link href="/voidcloud/login" className="block w-full rounded-xl bg-gradient-to-r from-cyan-400 to-fuchsia-500 py-3 text-center font-semibold text-slate-950">
              Go to sign in â†’
            </Link>
          </>
        )}
        {state === "error" && (
          <>
            <p className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-red-300">{msg}</p>
            <Link href="/voidcloud/login" className="block w-full rounded-xl border border-white/10 bg-white/5 py-3 text-center font-medium text-white hover:bg-white/10">
              Back to sign in
            </Link>
          </>
        )}
      </div>
    </AuthShell>
  );
}

export default function VerifyEmailPage() {
  return <Suspense fallback={<div className="min-h-screen bg-slate-950" />}><VerifyInner /></Suspense>;
}

"use client";

import { Suspense, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useRouter } from "next/navigation";

function CallbackInner() {
  const params = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    const token = params.get("token");
    const role = params.get("role");
    const error = params.get("error");

    if (error) {
      alert(error);
      router.replace("/voidcloud/login");
      return;
    }

    if (!token) {
      router.replace("/voidcloud/login");
      return;
    }

    localStorage.setItem("voidcloud_token", token);

    if (role === "ADMIN") {
      router.replace("/voidcloud/admin/dashboard");
    } else if (role === "AGENT") {
      router.replace("/voidcloud/dashboard");
    } else {
      router.replace("/voidcloud/dashboard");
    }
  }, [params, router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 text-white">
      <div className="text-center">
        <div className="mb-4 h-8 w-8 animate-spin rounded-full border-2 border-cyan-400 border-t-transparent mx-auto" />
        <p className="text-sm text-white/60">Completing sign in…</p>
      </div>
    </div>
  );
}

export default function OAuthCallbackPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-white">
        <div className="text-center">
          <div className="mb-4 h-8 w-8 animate-spin rounded-full border-2 border-cyan-400 border-t-transparent mx-auto" />
          <p className="text-sm text-white/60">Completing sign in…</p>
        </div>
      </div>
    }>
      <CallbackInner />
    </Suspense>
  );
}


"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";

export default function AdminDashboardRedirect() {
  const router = useRouter();
  useEffect(() => {
    const t = (typeof window !== "undefined") && (localStorage.getItem("amer_portal_token") || sessionStorage.getItem("amer_portal_token"));
    if (!t) {
      router.replace("/amercloud/login");
      return;
    }
    api.get("/auth/me")
      .then((r) => {
        if (r.data?.role === "ADMIN") router.replace("/amercloud/admin");
        else router.replace("/amercloud/user/dashboard");
      })
      .catch(() => router.replace("/amercloud/login"));
  }, [router]);
  return <div className="grid min-h-screen place-items-center bg-slate-950 text-white/60">Loading admin panel…</div>;
}

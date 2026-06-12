"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function UserDashboardRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/amercloud/dashboard");
  }, [router]);
  return <div className="grid min-h-screen place-items-center bg-slate-950 text-white/60">Loading your dashboard…</div>;
}

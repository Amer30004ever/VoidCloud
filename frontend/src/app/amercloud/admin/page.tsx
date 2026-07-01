"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function AdminIndex() {
  const router = useRouter();
  useEffect(() => { router.replace("/amercloud/admin/dashboard"); }, [router]);
  return <div className="min-h-screen bg-slate-950" />;
}

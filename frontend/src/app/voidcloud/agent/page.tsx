"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function AgentIndex() {
  const router = useRouter();
  useEffect(() => { router.replace("/voidcloud/agent/dashboard"); }, [router]);
  return <div className="min-h-screen bg-slate-950" />;
}

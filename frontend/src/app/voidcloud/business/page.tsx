"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function BusinessIndex() {
  const router = useRouter();
  useEffect(() => { router.replace("/voidcloud/business/dashboard"); }, [router]);
  return <div className="min-h-screen bg-slate-950" />;
}

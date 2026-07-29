"use client";

import { useEffect, useState } from "react";
import api from "@/lib/api";

export default function AiUsageAdvisor() {
  const [advice, setAdvice] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/analytics/usage/me").then((r) => {
      const usage = r.data;
      if (usage?.totalCalls && usage.totalCalls < 100) {
        setAdvice("Your API usage is low this month. Consider auditing running VPS instances to avoid idle costs.");
      } else {
        setAdvice("Your usage looks healthy. No immediate optimization suggestions.");
      }
      setLoading(false);
    }).catch(() => {
      setLoading(false);
    });
  }, []);

  if (loading) return null;

  return (
    <div className="rounded-2xl border border-cyan-400/20 bg-cyan-400/5 p-4">
      <div className="text-xs font-semibold text-cyan-300">AI Usage Advisor</div>
      <p className="mt-1 text-sm text-white/70">{advice}</p>
      <p className="mt-1 text-[10px] text-white/30">Advisory only — no action taken automatically.</p>
    </div>
  );
}

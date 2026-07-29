"use client";

import { useImpersonation } from "@/contexts/ImpersonationContext";
import { X } from "lucide-react";
import { useRouter } from "next/navigation";

export function ImpersonationBanner() {
  const { active, targetName, targetEmail, clear } = useImpersonation();
  const router = useRouter();

  if (!active) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[150] flex items-center justify-between bg-amber-500 px-4 py-2 text-sm font-medium text-slate-900 shadow-lg">
      <div className="flex items-center gap-2">
        <span className="inline-flex h-2 w-2 rounded-full bg-slate-900 animate-pulse" />
        <span>Impersonating <strong>{targetName}</strong> ({targetEmail})</span>
      </div>
      <button
        onClick={async () => {
          clear();
          await fetch("/auth/impersonate/exit", { method: "POST" });
          router.push("/voidcloud/dashboard");
        }}
        className="flex items-center gap-1 rounded-lg bg-slate-900/10 px-2 py-1 hover:bg-slate-900/20"
      >
        <X className="h-3.5 w-3.5" /> Exit
      </button>
    </div>
  );
}

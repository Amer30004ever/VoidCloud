"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { cloneApi } from "./devops";

export function CloneVpsModal({ vpsId, vpsName, mode = "staging", onClose }: { vpsId: string; vpsName: string; mode?: "staging" | "cluster"; onClose: () => void }) {
  const router = useRouter();
  const [name, setName] = useState(mode === "staging" ? `${vpsName}-staging` : "");
  const [syncData, setSyncData] = useState(mode === "staging");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function submit() {
    setBusy(true); setErr("");
    try {
      const r = await cloneApi.clone(vpsId, { name: name.trim() || undefined, syncData, mode });
      router.push(`/voidcloud/dashboard/vps/${r.vps.id}`);
    } catch (e) {
      setErr((e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? "Clone failed");
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" role="dialog" aria-modal="true">
      <div className="vc-card w-full max-w-md space-y-4 p-6">
        <h2 className="text-lg font-semibold">{mode === "staging" ? "Create staging copy" : "Add cluster node"}</h2>
        <p className="text-sm text-white/60">
          {mode === "staging"
            ? "A new VPS on the same plan with the same environment variables. Custom domains are not copied."
            : "A peer VPS on the same plan you can put behind a load balancer."}
        </p>
        <label className="block text-xs text-white/60">Name
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="auto" className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm" />
        </label>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={syncData} onChange={(e) => setSyncData(e.target.checked)} /> Copy disk data from this VPS (snapshot + restore)</label>
        <p className="text-xs text-white/50">Billed like any other VPS on this plan.</p>
        {err && <p className="text-sm text-red-300">{err}</p>}
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="rounded-lg border border-white/10 px-4 py-2 text-sm">Cancel</button>
          <button onClick={submit} disabled={busy} className="rounded-lg bg-gradient-to-r from-cyan-400 to-fuchsia-500 px-4 py-2 text-sm font-semibold text-slate-950 disabled:opacity-50">{busy ? "Creating…" : "Create"}</button>
        </div>
      </div>
    </div>
  );
}

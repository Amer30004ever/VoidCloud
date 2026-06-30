import { useState } from "react";
import { cloudVpsClone } from "@/lib/cloud";

export function CloneVpsModal({ vpsId, vpsName, onClose }: { vpsId: string; vpsName: string; onClose: () => void }) {
  const [suffix, setSuffix] = useState("staging");
  const [syncData, setSyncData] = useState(true);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const submit = async () => {
    setBusy(true); setErr(null);
    try {
      const r = await cloudVpsClone.clone(vpsId, { suffix, syncData });
      setResult(r.message);
      setTimeout(onClose, 1200);
    } catch (e: unknown) {
      setErr((e as { message?: string }).message ?? "Failed to clone");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-slate-900 p-6" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-xl font-bold text-white">Clone VPS</h2>
        <p className="mt-1 text-sm text-white/60">Creates an identical copy of <span className="font-mono text-cyan-300">{vpsName}</span> on the same plan with a separate IP address.</p>

        <div className="mt-4 space-y-3">
          <div>
            <label className="text-xs text-white/60">Name suffix</label>
            <input value={suffix} onChange={(e) => setSuffix(e.target.value)}
              className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white" />
            <p className="mt-1 text-xs text-white/40">New name: <span className="font-mono text-white/80">{vpsName}-{suffix}</span></p>
          </div>
          <label className="flex items-center gap-2 text-sm text-white/80">
            <input type="checkbox" checked={syncData} onChange={(e) => setSyncData(e.target.checked)} />
            Sync data from production (snapshot + restore)
          </label>
        </div>

        {err && <div className="mt-3 rounded-lg border border-red-500/30 bg-red-500/10 p-2 text-xs text-red-300">{err}</div>}
        {result && <div className="mt-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-2 text-xs text-emerald-200">{result}</div>}

        <div className="mt-5 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/80">Cancel</button>
          <button onClick={submit} disabled={busy || !suffix.trim()}
            className="rounded-lg bg-gradient-to-r from-cyan-400 to-fuchsia-500 px-4 py-2 text-sm font-semibold text-slate-950 disabled:opacity-50">
            {busy ? "Cloning…" : "Clone VPS"}
          </button>
        </div>
      </div>
    </div>
  );
}

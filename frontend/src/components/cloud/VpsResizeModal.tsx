/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import { useEffect, useState } from "react";
import { cloudResize, type CloudPlan, type ResizeQuote } from "@/lib/cloud";

export function VpsResizeModal({ vpsId, onClose, onDone }: { vpsId: string; onClose: () => void; onDone?: () => void }) {
  const [current, setCurrent] = useState<CloudPlan | null>(null);
  const [upgrades, setUpgrades] = useState<CloudPlan[]>([]);
  const [downgrades, setDowngrades] = useState<CloudPlan[]>([]);
  const [selected, setSelected] = useState<CloudPlan | null>(null);
  const [quote, setQuote] = useState<ResizeQuote | null>(null);
  const [live, setLive] = useState<{ supported: boolean; requiresReboot: boolean } | null>(null);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    cloudResize.options(vpsId).then((r) => { setCurrent(r.current); setUpgrades(r.upgrades); setDowngrades(r.downgrades); }).catch((e) => setErr(e?.response?.data?.message ?? "Failed to load"));
    cloudResize.liveSupported(vpsId).then(setLive).catch(() => {});
  }, [vpsId]);

  useEffect(() => {
  // eslint-disable-next-line react-hooks/set-state-in-effect
    if (!selected) { setQuote(null); return; }
    cloudResize.quote(vpsId, selected.id).then(setQuote).catch((e) => setErr(e?.response?.data?.message ?? "Quote failed"));
  }, [selected, vpsId]);

  async function confirm() {
    if (!selected) return;
    setBusy(true); setErr("");
    try { await cloudResize.resize(vpsId, selected.id); onDone?.(); onClose(); }
    catch (e: any) { setErr(e?.response?.data?.message ?? "Resize failed"); }
    finally { setBusy(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
      <div className="w-full max-w-2xl rounded-2xl border border-white/10 bg-slate-950 p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold">Change VPS Plan</h2>
          <button onClick={onClose} className="text-white/60 hover:text-white">×</button>
        </div>

        {err && <div className="mb-3 rounded-lg border border-red-500/30 bg-red-500/10 p-2 text-xs text-red-300">{err}</div>}

        <div className="mb-4 rounded-lg border border-white/10 bg-white/5 p-3 text-sm">
          <div className="text-xs uppercase text-white/50">Current plan</div>
          <div className="font-semibold">{current?.name ?? "Custom"}</div>
          <div className="text-xs text-white/60">{current?.cpuLimit} CPU · {current?.memoryLimit}MB · {current ? Math.ceil(current.storageLimit/1024) : "—"}GB · ${current?.priceUSD ?? 0}/mo</div>
        </div>

        <div className="space-y-3 max-h-64 overflow-y-auto">
          {upgrades.length > 0 && <PlanGroup title="Upgrades" plans={upgrades} selected={selected} onSelect={setSelected} accent="cyan" />}
          {downgrades.length > 0 && <PlanGroup title="Downgrades" plans={downgrades} selected={selected} onSelect={setSelected} accent="amber" />}
          {upgrades.length === 0 && downgrades.length === 0 && <p className="text-sm text-white/50">No other plans available.</p>}
        </div>

        {quote && (
          <div className={`mt-4 rounded-lg border p-3 text-sm ${quote.credit ? "border-emerald-500/30 bg-emerald-500/10" : "border-cyan-400/30 bg-cyan-400/10"}`}>
            <div className="font-semibold">{quote.isUpgrade ? "Upgrade" : "Downgrade"} to {quote.newPlan.name}</div>
            <div className="text-xs text-white/70 mt-1">Prorated for {quote.daysLeft}/{quote.cycleDays} days remaining</div>
            <div className="mt-2 text-lg font-bold">
              {quote.credit ? "Credit: " : "Charge: "}${Math.abs(quote.amountUSD).toFixed(2)}
              <span className="text-xs font-normal text-white/60 ml-2">({Math.abs(quote.amountEGP).toFixed(0)} EGP)</span>
            </div>
            {live && (
              <div className="mt-2 text-xs text-white/60">
                {live.supported ? "✓ Live resize supported (no downtime)" : "⚠ VPS must be running for resize; reboot may be required"}
              </div>
            )}
          </div>
        )}

        <div className="mt-5 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-lg border border-white/10 px-4 py-2 text-sm">Cancel</button>
          <button onClick={confirm} disabled={!selected || busy} className="rounded-lg bg-gradient-to-r from-cyan-400 to-fuchsia-500 px-5 py-2 text-sm font-semibold text-slate-950 disabled:opacity-50">
            {busy ? "Resizing…" : `Confirm ${quote?.isUpgrade ? "upgrade" : "change"}`}
          </button>
        </div>
      </div>
    </div>
  );
}

function PlanGroup({ title, plans, selected, onSelect, accent }: { title: string; plans: CloudPlan[]; selected: CloudPlan | null; onSelect: (p: CloudPlan) => void; accent: "cyan" | "amber" }) {
  const ring = accent === "cyan" ? "border-cyan-400 bg-cyan-400/10" : "border-amber-400 bg-amber-400/10";
  return (
    <div>
      <div className="mb-1 text-xs uppercase text-white/50">{title}</div>
      <div className="space-y-1">
        {plans.map((p) => (
          <button key={p.id} onClick={() => onSelect(p)} className={`w-full text-left rounded-lg border p-3 text-sm ${selected?.id === p.id ? ring : "border-white/10 bg-white/5 hover:bg-white/10"}`}>
            <div className="flex justify-between">
              <div>
                <div className="font-semibold">{p.name}</div>
                <div className="text-xs text-white/60">{p.cpuLimit} CPU · {p.memoryLimit}MB · {Math.ceil(p.storageLimit/1024)}GB</div>
              </div>
              <div className="text-right">
                <div className="font-bold">${p.priceUSD}/mo</div>
                <div className="text-xs text-white/50">{p.priceEGP} EGP</div>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

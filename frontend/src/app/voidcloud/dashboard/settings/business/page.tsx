"use client";
import { useEffect, useState } from "react";
import { cloudBusiness, type BusinessSettings } from "@/features/vps/cloud";
import { useTrackPageView } from "@/hooks/useTrackPageView";

export default function BusinessSettingsPage() {
  useTrackPageView();
  const [settings, setSettings] = useState<BusinessSettings | null>(null);
  const [name, setName] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [address, setAddress] = useState("");
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    cloudBusiness.getSettings().then((s) => {
      setSettings(s);
      const cfg = (s.settings as any) || {};
      setName(cfg.businessName || s.name || "");
      setWhatsapp(cfg.whatsappNumber || "");
      setAddress(cfg.address || "");
    }).catch(() => {});
  }, []);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setMsg(null);
    try {
      await cloudBusiness.updateSettings({
        businessName: name,
        whatsappNumber: whatsapp,
        address,
      });
      setMsg({ kind: "ok", text: "Saved" });
    } catch (err: any) {
      setMsg({ kind: "err", text: err?.response?.data?.message ?? "Save failed" });
    } finally { setBusy(false); }
  }

  return (
    <div>
      <h1 className="mb-6 text-3xl font-bold">Business Settings</h1>
      {msg && <div className={`mb-4 rounded-lg p-3 text-sm ${msg.kind === "ok" ? "bg-emerald-500/10 text-emerald-300" : "bg-red-500/10 text-red-300"}`}>{msg.text}</div>}
      <form onSubmit={save} className="max-w-xl space-y-4">
        <div>
          <label className="mb-1 block text-sm text-white/60">Business Name</label>
          <input value={name} onChange={(e) => setName(e.target.value)} className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="mb-1 block text-sm text-white/60">WhatsApp Number</label>
          <input value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="mb-1 block text-sm text-white/60">Address</label>
          <input value={address} onChange={(e) => setAddress(e.target.value)} className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm" />
        </div>
        <button disabled={busy} className="rounded-lg bg-gradient-to-r from-cyan-400 to-fuchsia-500 px-4 py-2 text-sm font-semibold text-slate-950 disabled:opacity-50">Save Changes</button>
      </form>
    </div>
  );
}

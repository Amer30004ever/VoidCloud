"use client";

import { useEffect, useState } from "react";
import { cloudApps, type AppCatalogItem, type InstalledApp } from "@/features/vps/cloud";

type Tab = "catalog" | "installed";

export default function AppsMarketplacePage() {
  const [tab, setTab] = useState<Tab>("catalog");
  const [catalog, setCatalog] = useState<AppCatalogItem[]>([]);
  const [vpses, setVpses] = useState<any[]>([]);
  const [selectedVps, setSelectedVps] = useState("");
  const [installed, setInstalled] = useState<InstalledApp[]>([]);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  useEffect(() => {
    cloudApps.catalog().then(setCatalog).catch(() => setCatalog([]));
    import("@/features/vps/cloud").then((m) => m.cloudApi.deployments.list().then(setVpses).catch(() => setVpses([])));
  }, []);

  useEffect(() => {
    if (!selectedVps) return;
    const vps = vpses.find((v) => v.id === selectedVps);
    setInstalled((vps?.installedApps as InstalledApp[]) || []);
  }, [selectedVps, vpses]);

  async function install(appId: string) {
    if (!selectedVps) return;
    setBusy(true); setMsg(null);
    try {
      await cloudApps.install(selectedVps, appId);
      setMsg({ kind: "ok", text: "Installing..." });
      const vps = vpses.find((v) => v.id === selectedVps);
      setInstalled((vps?.installedApps as InstalledApp[]) || []);
    } catch (err: any) {
      setMsg({ kind: "err", text: err?.response?.data?.message ?? "Install failed" });
    } finally { setBusy(false); }
  }

  async function uninstall(appId: string) {
    if (!selectedVps) return;
    setBusy(true); setMsg(null);
    try {
      await cloudApps.uninstall(selectedVps, appId);
      setMsg({ kind: "ok", text: "Uninstalled" });
      setInstalled((prev) => prev.filter((a) => a.id !== appId));
    } catch (err: any) {
      setMsg({ kind: "err", text: err?.response?.data?.message ?? "Uninstall failed" });
    } finally { setBusy(false); }
  }

  return (
    <div className="space-y-6">
      <h1 className="vc-h1">App Marketplace</h1>
      {msg && <div className={`rounded-lg p-3 text-sm ${msg.kind === "ok" ? "bg-emerald-500/10 text-emerald-300" : "bg-red-500/10 text-red-300"}`}>{msg.text}</div>}

      <div className="flex gap-4">
        <div>
          <label className="mb-1 block text-xs text-white/60">Select VPS</label>
          <select value={selectedVps} onChange={(e) => setSelectedVps(e.target.value)} className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm">
            <option value="">Choose a VPS...</option>
            {vpses.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
          </select>
        </div>
      </div>

      <div className="flex gap-2 border-b border-white/10">
        <button onClick={() => setTab("catalog")} className={`px-4 py-2 text-sm ${tab === "catalog" ? "border-b-2 border-cyan-400 text-cyan-300" : "text-white/60"}`}>Catalog</button>
        <button onClick={() => setTab("installed")} className={`px-4 py-2 text-sm ${tab === "installed" ? "border-b-2 border-cyan-400 text-cyan-300" : "text-white/60"}`}>Installed</button>
      </div>

      {tab === "catalog" && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {catalog.map((app) => {
            const isInstalled = installed.some((a) => a.id === app.id);
            return (
              <div key={app.id} className="vc-card p-6">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-cyan-400 to-fuchsia-500 text-lg font-bold text-slate-950">{app.icon}</div>
                  <div>
                    <div className="font-semibold">{app.name}</div>
                    <div className="text-xs text-white/60">{app.category}</div>
                  </div>
                </div>
                <p className="mt-3 text-sm text-white/60">{app.description}</p>
                {isInstalled ? (
                  <button onClick={() => uninstall(app.id)} disabled={busy} className="mt-4 w-full rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm text-red-300 hover:bg-red-500/20 disabled:opacity-50">Uninstall</button>
                ) : (
                  <button onClick={() => install(app.id)} disabled={busy || !selectedVps} className="mt-4 w-full vc-btn vc-btn-primary disabled:opacity-50">Install</button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {tab === "installed" && (
        <div className="space-y-3">
          {installed.length === 0 && <p className="text-center text-white/50 py-8">No apps installed on selected VPS.</p>}
          {installed.map((app) => (
            <div key={app.id} className="flex items-center justify-between vc-card p-4">
              <div>
                <div className="font-medium">{app.name}</div>
                <div className="text-xs text-white/60">{app.status} · {new Date(app.installedAt).toLocaleDateString()}</div>
              </div>
              <button onClick={() => uninstall(app.id)} disabled={busy} className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-sm text-red-300 hover:bg-red-500/20 disabled:opacity-50">Uninstall</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

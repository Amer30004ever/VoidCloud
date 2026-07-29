"use client";

import { useEffect, useState } from "react";
import { cloudApps, type AppCatalogItem } from "@/features/vps/cloud";

const THIRD_PARTY_TOOLS: AppCatalogItem[] = [
  { id: 'code-server', name: 'code-server', description: 'VS Code in the browser', icon: 'C', category: 'IDE' },
  { id: 'gitea', name: 'Gitea + Woodpecker', description: 'Self-hosted Git + CI/CD', icon: 'G', category: 'Dev' },
  { id: 'portainer', name: 'Portainer', description: 'Container management GUI', icon: 'P', category: 'Ops' },
  { id: 'umami', name: 'Umami', description: 'Privacy-friendly analytics', icon: 'U', category: 'Analytics' },
  { id: 'postal', name: 'Postal', description: 'Self-hosted transactional mail', icon: 'M', category: 'Mail' },
];

type AppStatus = "not_installed" | "installing" | "running" | "failed";

export default function AddonsPage() {
  const [vpses, setVpses] = useState<any[]>([]);
  const [selectedVps, setSelectedVps] = useState("");
  const [states, setStates] = useState<Record<string, AppStatus>>({});
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  useEffect(() => {
    import("@/features/vps/cloud").then((m) => m.cloudApi.deployments.list().then(setVpses).catch(() => setVpses([])));
  }, []);

  async function install(appId: string) {
    if (!selectedVps) return;
    setMsg(null);
    setStates((s) => ({ ...s, [appId]: 'installing' }));
    try {
      await cloudApps.install(selectedVps, appId);
      setMsg({ kind: "ok", text: `Installing ${appId}...` });
      setStates((s) => ({ ...s, [appId]: 'running' }));
    } catch (err: any) {
      setMsg({ kind: "err", text: err?.response?.data?.message ?? "Install failed" });
      setStates((s) => ({ ...s, [appId]: 'failed' }));
    }
  }

  async function uninstall(appId: string) {
    if (!selectedVps) return;
    setMsg(null);
    try {
      await cloudApps.uninstall(selectedVps, appId);
      setMsg({ kind: "ok", text: "Uninstalled" });
      setStates((s) => ({ ...s, [appId]: 'not_installed' }));
    } catch (err: any) {
      setMsg({ kind: "err", text: err?.response?.data?.message ?? "Uninstall failed" });
    }
  }

  const statusBadge = (status: AppStatus) => {
    const colors: Record<AppStatus, string> = {
      not_installed: "bg-gray-500/20 text-gray-300",
      installing: "bg-yellow-500/20 text-yellow-300",
      running: "bg-emerald-500/20 text-emerald-300",
      failed: "bg-red-500/20 text-red-300",
    };
    return <span className={`rounded-full border px-2 py-0.5 text-xs ${colors[status]}`}>{status.replace('_', ' ')}</span>;
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Add-ons Marketplace</h1>
      {msg && <div className={`rounded-lg p-3 text-sm ${msg.kind === "ok" ? "bg-emerald-500/10 text-emerald-300" : "bg-red-500/10 text-red-300"}`}>{msg.text}</div>}

      <div>
        <label className="mb-1 block text-xs text-white/60">Select VPS</label>
        <select value={selectedVps} onChange={(e) => setSelectedVps(e.target.value)} className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm">
          <option value="">Choose a VPS...</option>
          {vpses.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
        </select>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {THIRD_PARTY_TOOLS.map((tool) => {
          const current = states[tool.id] || 'not_installed';
          const isCodeServer = tool.id === 'code-server';
          return (
            <div key={tool.id} className="rounded-2xl border border-white/10 bg-white/5 p-6">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-cyan-400 to-fuchsia-500 text-lg font-bold text-slate-950">{tool.icon}</div>
                <div>
                  <div className="font-semibold">{tool.name}</div>
                  <div className="text-xs text-white/60">{tool.category}</div>
                </div>
              </div>
              <p className="mt-3 text-sm text-white/60">{tool.description}</p>
              {isCodeServer && current === 'running' && (
                <div className="mt-4">
                  <a href="/api/v1/placeholder-desktop-download" className="inline-flex items-center gap-2 rounded-lg border border-cyan-400/30 bg-cyan-400/10 px-4 py-2 text-sm text-cyan-200 hover:bg-cyan-400/20">
                    Download Desktop App (.exe)
                  </a>
                  <p className="mt-1 text-xs text-white/40">Tauri wrapper — opens your existing code-server session in a native window.</p>
                </div>
              )}
              <div className="mt-4 flex items-center justify-between">
                {statusBadge(current)}
                {current === 'running' ? (
                  <button onClick={() => uninstall(tool.id)} className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-sm text-red-300 hover:bg-red-500/20">Uninstall</button>
                ) : (
                  <button onClick={() => install(tool.id)} disabled={!selectedVps || current === 'installing'} className="rounded-lg bg-gradient-to-r from-cyan-400 to-fuchsia-500 px-4 py-2 text-sm font-semibold text-slate-950 disabled:opacity-50">Install</button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

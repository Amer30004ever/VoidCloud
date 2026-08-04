"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { cloudApps, cloudApi, type AppCatalogItem } from "@/features/vps/cloud";

const THIRD_PARTY_TOOLS: AppCatalogItem[] = [
  { id: 'code-server', name: 'code-server', description: 'VS Code in the browser', icon: 'C', category: 'IDE' },
  { id: 'gitea', name: 'Gitea + Woodpecker', description: 'Self-hosted Git + CI/CD', icon: 'G', category: 'Dev' },
  { id: 'portainer', name: 'Portainer', description: 'Container management GUI', icon: 'P', category: 'Ops' },
  { id: 'umami', name: 'Umami', description: 'Privacy-friendly analytics', icon: 'U', category: 'Analytics' },
  { id: 'postal', name: 'Postal', description: 'Self-hosted transactional mail', icon: 'M', category: 'Mail' },
];

type AppStatus = "not_installed" | "installing" | "running" | "failed" | "unknown";

/** Map whatever the backend reports (K8s phase / deployment state) onto our UI states. */
function normalizeStatus(raw: string | undefined): AppStatus {
  const s = (raw ?? "").toLowerCase();
  if (["running", "ready", "available", "active"].includes(s)) return "running";
  if (["pending", "installing", "progressing", "containercreating", "deploying"].includes(s)) return "installing";
  if (["failed", "error", "crashloopbackoff", "imagepullbackoff"].includes(s)) return "failed";
  if (["not_installed", "notfound", "absent", ""].includes(s)) return "not_installed";
  return "unknown";
}

export default function AddonsPage() {
  const [vpses, setVpses] = useState<any[]>([]);
  const [selectedVps, setSelectedVps] = useState("");
  const [states, setStates] = useState<Record<string, AppStatus>>({});
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    cloudApi.deployments.list().then(setVpses).catch(() => setVpses([]));
  }, []);

  /** Ask the backend for the live status of every catalog app on the selected VPS. */
  const refreshStatuses = useCallback(async (vpsId: string) => {
    if (!vpsId) return;
    const entries = await Promise.all(
      THIRD_PARTY_TOOLS.map(async (tool) => {
        try {
          const res = await cloudApps.status(vpsId, tool.id);
          return [tool.id, normalizeStatus(res?.status)] as const;
        } catch {
          return [tool.id, "not_installed"] as const;
        }
      }),
    );
    setStates(Object.fromEntries(entries));
  }, []);

  // Poll live status every 10s while a VPS is selected — no optimistic fake "running".
  useEffect(() => {
    if (pollRef.current) clearInterval(pollRef.current);
    setStates({});
    if (!selectedVps) return;
    refreshStatuses(selectedVps);
    pollRef.current = setInterval(() => refreshStatuses(selectedVps), 10_000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [selectedVps, refreshStatuses]);

  async function install(appId: string) {
    if (!selectedVps) return;
    setMsg(null);
    setStates((s) => ({ ...s, [appId]: 'installing' }));
    try {
      await cloudApps.install(selectedVps, appId);
      setMsg({ kind: "ok", text: `Install requested for ${appId} — tracking live status.` });
    } catch (err: any) {
      setMsg({ kind: "err", text: err?.response?.data?.message ?? "Install failed" });
    } finally {
      await refreshStatuses(selectedVps);
    }
  }

  async function uninstall(appId: string) {
    if (!selectedVps) return;
    setMsg(null);
    try {
      await cloudApps.uninstall(selectedVps, appId);
      setMsg({ kind: "ok", text: "Uninstall requested" });
    } catch (err: any) {
      setMsg({ kind: "err", text: err?.response?.data?.message ?? "Uninstall failed" });
    } finally {
      await refreshStatuses(selectedVps);
    }
  }

  const statusBadge = (status: AppStatus) => {
    const colors: Record<AppStatus, string> = {
      not_installed: "bg-gray-500/20 text-gray-300",
      installing: "bg-yellow-500/20 text-yellow-300",
      running: "bg-emerald-500/20 text-emerald-300",
      failed: "bg-red-500/20 text-red-300",
      unknown: "bg-gray-500/20 text-gray-300",
    };
    return <span className={`rounded-full border border-white/10 px-2 py-0.5 text-xs ${colors[status]}`}>{status.replace('_', ' ')}</span>;
  };

  return (
    <div className="space-y-6">
      <h1 className="vc-h1">Add-ons Marketplace</h1>
      {msg && <div className={`rounded-lg p-3 text-sm ${msg.kind === "ok" ? "bg-emerald-500/10 text-emerald-300" : "bg-red-500/10 text-red-300"}`}>{msg.text}</div>}

      <div>
        <label className="vc-label mb-1 block">Select VPS</label>
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
            <div key={tool.id} className="vc-card p-6">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-cyan-400 to-fuchsia-500 text-lg font-bold text-slate-950">{tool.icon}</div>
                <div>
                  <div className="font-semibold">{tool.name}</div>
                  <div className="text-xs text-white/60">{tool.category}</div>
                </div>
              </div>
              <p className="mt-3 text-sm text-white/60">{tool.description}</p>
              {isCodeServer && current === 'running' && (
                <p className="mt-3 text-xs text-white/40">Open code-server from your VPS detail page — it runs in the browser, no desktop client required.</p>
              )}
              <div className="mt-4 flex items-center justify-between">
                {statusBadge(current)}
                {current === 'running' || current === 'installing' ? (
                  <button onClick={() => uninstall(tool.id)} className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-sm text-red-300 hover:bg-red-500/20">Uninstall</button>
                ) : (
                  <button onClick={() => install(tool.id)} disabled={!selectedVps} className="vc-btn vc-btn-primary disabled:opacity-50">Install</button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { cloudApi, type CloudDeployment } from "@/lib/cloud";
import { VpsStatusBadge } from "@/components/cloud/VpsStatusBadge";
import { useLocale } from "@/contexts/LocaleContext";

type WithIp = CloudDeployment & { ipv4Address?: string; cpu?: number; memory?: number; storage?: number };

interface ProxmoxVm {
  vmid: number;
  name: string;
  status: "running" | "stopped" | "paused";
  cpus: number;
  maxmem: number;
  maxdisk: number;
  uptime: number;
  ip?: string;
}

function fmtBytes(bytes: number) {
  if (bytes >= 1073741824) return `${(bytes / 1073741824).toFixed(1)} GB`;
  if (bytes >= 1048576) return `${(bytes / 1048576).toFixed(0)} MB`;
  return `${bytes} B`;
}

function fmtUptime(secs: number) {
  if (!secs) return "—";
  const d = Math.floor(secs / 86400);
  const h = Math.floor((secs % 86400) / 3600);
  const m = Math.floor((secs % 3600) / 60);
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function ProxmoxStatusDot({ status }: { status: string }) {
  const map: Record<string, string> = {
    running: "bg-emerald-400 shadow-emerald-400/40",
    stopped: "bg-slate-500",
    paused: "bg-amber-400",
  };
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${status === "running" ? "bg-emerald-500/10 text-emerald-300" : status === "stopped" ? "bg-slate-500/10 text-slate-400" : "bg-amber-500/10 text-amber-300"}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${map[status] ?? "bg-slate-500"} ${status === "running" ? "animate-pulse" : ""}`} />
      {status}
    </span>
  );
}

export default function VpsListPage() {
  const { t } = useLocale();
  const [items, setItems] = useState<WithIp[]>([]);
  const [loading, setLoading] = useState(true);
  const [proxmoxVms, setProxmoxVms] = useState<ProxmoxVm[]>([]);
  const [proxmoxLoading, setProxmoxLoading] = useState(true);
  const [proxmoxError, setProxmoxError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"portal" | "proxmox">("proxmox");
  const [actionLoading, setActionLoading] = useState<number | null>(null);

  const fetchPortalVms = useCallback(() => {
    cloudApi.deployments.list().then((d) => setItems(d as WithIp[])).finally(() => setLoading(false));
  }, []);

  const fetchProxmoxVms = useCallback(async () => {
    setProxmoxLoading(true);
    setProxmoxError(null);
    try {
      const res = await fetch("/api/proxmox/nodes/proxmox/qemu");
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? "Proxmox unreachable");
      const vms: ProxmoxVm[] = (json?.data ?? []).sort((a: ProxmoxVm, b: ProxmoxVm) => a.vmid - b.vmid);
      setProxmoxVms(vms);
    } catch (err: unknown) {
      setProxmoxError(err instanceof Error ? err.message : "Failed to connect to Proxmox");
    } finally {
      setProxmoxLoading(false);
    }
  }, []);

  const vmAction = useCallback(async (vmid: number, action: "start" | "stop" | "reboot" | "reset") => {
    setActionLoading(vmid);
    try {
      await fetch(`/api/proxmox/nodes/proxmox/qemu/${vmid}/status/${action}`, { method: "POST" });
      await new Promise((r) => setTimeout(r, 2000));
      await fetchProxmoxVms();
    } finally {
      setActionLoading(null);
    }
  }, [fetchProxmoxVms]);

  useEffect(() => {
    fetchPortalVms();
    fetchProxmoxVms();
  }, [fetchPortalVms, fetchProxmoxVms]);

  const runningCount = proxmoxVms.filter((v) => v.status === "running").length;
  const stoppedCount = proxmoxVms.filter((v) => v.status === "stopped").length;
  const totalMem = proxmoxVms.reduce((s, v) => s + (v.maxmem ?? 0), 0);
  const totalDisk = proxmoxVms.reduce((s, v) => s + (v.maxdisk ?? 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">{t("vps.title", "VPS Instances")}</h1>
          <p className="mt-1 text-sm text-white/40">Powered by Proxmox · {proxmoxVms.length} total</p>
        </div>
        <Link
          href="/amercloud/dashboard/vps/new"
          className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-400 to-fuchsia-500 px-4 py-2 text-sm font-semibold text-slate-950 shadow-lg shadow-cyan-500/20 transition hover:scale-105"
        >
          <span>+</span> {t("vps.new", "New VPS")}
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: "Running", value: runningCount, color: "text-emerald-400", bg: "from-emerald-500/10 to-teal-500/5" },
          { label: "Stopped", value: stoppedCount, color: "text-slate-400", bg: "from-slate-500/10 to-slate-500/5" },
          { label: "Total Memory", value: totalMem > 0 ? fmtBytes(totalMem) : "—", color: "text-violet-400", bg: "from-violet-500/10 to-purple-500/5" },
          { label: "Total Disk", value: totalDisk > 0 ? fmtBytes(totalDisk) : "—", color: "text-cyan-400", bg: "from-cyan-500/10 to-blue-500/5" },
        ].map((s) => (
          <div key={s.label} className={`rounded-2xl border border-white/10 bg-gradient-to-br ${s.bg} p-4`}>
            <p className="text-xs text-white/40">{s.label}</p>
            <p className={`mt-1 text-2xl font-bold ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      <div className="flex gap-1 rounded-xl border border-white/10 bg-white/5 p-1">
        {([["proxmox", "Proxmox VMs"], ["portal", "Portal Deployments"]] as const).map(([id, label]) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`flex-1 rounded-lg py-2 text-sm font-medium transition ${activeTab === id ? "bg-white/10 text-white" : "text-white/40 hover:text-white/70"}`}
          >
            {label}
          </button>
        ))}
      </div>

      {activeTab === "proxmox" && (
        <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl">
          {proxmoxError && (
            <div className="border-b border-red-500/20 bg-red-500/10 p-4 text-sm text-red-300">
              ⚠ Proxmox API: {proxmoxError}
              <button onClick={fetchProxmoxVms} className="ml-3 underline opacity-70 hover:opacity-100">Retry</button>
            </div>
          )}
          {proxmoxLoading ? (
            <div className="space-y-0.5 p-2">
              {[1, 2, 3].map((i) => <div key={i} className="h-16 animate-pulse rounded-xl bg-white/5" />)}
            </div>
          ) : proxmoxVms.length === 0 && !proxmoxError ? (
            <div className="p-12 text-center">
              <p className="text-3xl">🖥️</p>
              <p className="mt-3 text-sm text-white/50">No VMs found on Proxmox node</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="border-b border-white/5 text-left">
                <tr className="text-[11px] uppercase tracking-wider text-white/30">
                  <th className="px-5 py-3">VMID · Name</th>
                  <th className="py-3">Status</th>
                  <th className="py-3 hidden md:table-cell">Resources</th>
                  <th className="py-3 hidden lg:table-cell">Uptime</th>
                  <th className="py-3 pr-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {proxmoxVms.map((vm) => (
                  <tr key={vm.vmid} className="border-t border-white/5 transition hover:bg-white/[0.03]">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-white/5 text-lg">🖥️</div>
                        <div>
                          <p className="font-semibold text-white">{vm.name ?? `VM ${vm.vmid}`}</p>
                          <p className="text-xs text-white/30">ID: {vm.vmid}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-4"><ProxmoxStatusDot status={vm.status} /></td>
                    <td className="hidden py-4 md:table-cell">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2 text-xs text-white/50">
                          <span className="w-4 text-center">⚙</span>
                          <span>{vm.cpus ?? "—"} vCPU</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-white/50">
                          <span className="w-4 text-center">▣</span>
                          <span>{vm.maxmem ? fmtBytes(vm.maxmem) : "—"} RAM</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-white/50">
                          <span className="w-4 text-center">◈</span>
                          <span>{vm.maxdisk ? fmtBytes(vm.maxdisk) : "—"} disk</span>
                        </div>
                      </div>
                    </td>
                    <td className="hidden py-4 text-xs text-white/40 lg:table-cell">{fmtUptime(vm.uptime)}</td>
                    <td className="py-4 pr-5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {actionLoading === vm.vmid ? (
                          <span className="text-xs text-white/30">…</span>
                        ) : (
                          <>
                            {vm.status === "stopped" && (
                              <button
                                onClick={() => vmAction(vm.vmid, "start")}
                                className="rounded-lg bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-400 transition hover:bg-emerald-500/20"
                              >
                                Start
                              </button>
                            )}
                            {vm.status === "running" && (
                              <>
                                <button
                                  onClick={() => vmAction(vm.vmid, "reboot")}
                                  className="rounded-lg bg-amber-500/10 px-2.5 py-1 text-xs font-medium text-amber-400 transition hover:bg-amber-500/20"
                                >
                                  Reboot
                                </button>
                                <button
                                  onClick={() => vmAction(vm.vmid, "stop")}
                                  className="rounded-lg bg-red-500/10 px-2.5 py-1 text-xs font-medium text-red-400 transition hover:bg-red-500/20"
                                >
                                  Stop
                                </button>
                              </>
                            )}
                            <Link
                              href={`/amercloud/dashboard/vps/${vm.vmid}`}
                              className="rounded-lg bg-white/5 px-2.5 py-1 text-xs font-medium text-white/60 transition hover:bg-white/10 hover:text-white"
                            >
                              Details →
                            </Link>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {activeTab === "portal" && (
        <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl">
          {loading ? (
            <div className="space-y-0.5 p-2">
              {[1, 2].map((i) => <div key={i} className="h-16 animate-pulse rounded-xl bg-white/5" />)}
            </div>
          ) : items.length === 0 ? (
            <p className="p-12 text-center text-sm text-white/50">{t("vps.empty", "No VPS instances yet.")}</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="border-b border-white/5 text-left">
                <tr className="text-[11px] uppercase tracking-wider text-white/30">
                  <th className="px-5 py-3">Name</th>
                  <th className="py-3">{t("vps.ip", "IP Address")}</th>
                  <th className="py-3 hidden md:table-cell">{t("vps.resources", "Resources")}</th>
                  <th className="py-3">{t("common.status", "Status")}</th>
                  <th className="py-3 pr-5 text-right"></th>
                </tr>
              </thead>
              <tbody>
                {items.map((d) => (
                  <tr key={d.id} className="border-t border-white/5 hover:bg-white/[0.03]">
                    <td className="px-5 py-4 font-medium text-white">{d.name}</td>
                    <td className="py-4 font-mono text-xs text-cyan-300">{d.ipv4Address ?? "—"}</td>
                    <td className="hidden py-4 text-xs text-white/40 md:table-cell">
                      {d.cpu} CPU · {d.memory}MB · {Math.ceil((d.storage ?? 0) / 1024)}GB
                    </td>
                    <td className="py-4"><VpsStatusBadge status={d.status} /></td>
                    <td className="py-4 pr-5 text-right">
                      <Link href={`/amercloud/dashboard/vps/${d.id}`} className="text-xs text-cyan-300 hover:underline">
                        Open →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}

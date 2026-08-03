/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import api from "@/lib/api";
import { cloudApi, CloudDeployment } from "@/features/vps/cloud";
import { useTrackPageView } from "@/hooks/useTrackPageView";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { Users as UsersIcon, Gem, Server, Wallet } from "lucide-react";

type NodeInfo = {
  name: string;
  roles: string[];
  status: string;
  podCount: number;
  cpu: { capacity: string; allocatable: string };
  memory: { capacity: number; allocatable: number };
};

type Ns = { namespace: string; podCount: number; status: string };

export default function AdminDashboard() {
  useTrackPageView();
  const [stats, setStats] = useState<any>(null);
  const [nodes, setNodes] = useState<NodeInfo[]>([]);
  const [namespaces, setNamespaces] = useState<Ns[]>([]);
  const [smtp, setSmtp] = useState<any>(null);
  const [deployments, setDeployments] = useState<CloudDeployment[]>([]);
  const [activeUsers, setActiveUsers] = useState<number | null>(null);
  const [showAllNs, setShowAllNs] = useState(false);
  const [smtpTesting, setSmtpTesting] = useState(false);
  const [smtpTestMsg, setSmtpTestMsg] = useState<string | null>(null);

  useEffect(() => {
    cloudApi.admin.stats().then(setStats).catch(() => {});
    api.get("/admin/cluster/nodes").then((r) => setNodes(r.data?.nodes ?? [])).catch(() =>
      api.get("/cluster/nodes").then((r) => setNodes(r.data?.nodes ?? [])).catch(() => {})
    );
    api.get("/admin/cluster/namespaces?limit=200").then((r) => setNamespaces(r.data?.namespaces ?? [])).catch(() =>
      api.get("/namespaces/running").then((r) => setNamespaces(r.data?.namespaces ?? [])).catch(() => {})
    );
    api.get("/admin/smtp/status").then((r) => setSmtp(r.data)).catch(() =>
      api.get("/system/smtp-status").then((r) => setSmtp(r.data)).catch(() => setSmtp({ status: "failed" }))
    );
    cloudApi.admin.users().then((u: any) => {
      const list = Array.isArray(u) ? u : (u?.users ?? []);
      setActiveUsers(list.filter((x: any) => x.isActive !== false).length);
    }).catch(() => {});
    cloudApi.deployments.list().then(setDeployments).catch(() => {});
  }, []);

  async function testSmtp() {
    setSmtpTesting(true);
    setSmtpTestMsg(null);
    try {
      const r = await api.post("/admin/smtp/test", {});
      setSmtpTestMsg(r.data?.ok ? "Test email sent" : `Failed: ${r.data?.error ?? "unknown"}`);
      const s = await api.get("/admin/smtp/status").catch(() => null);
      if (s?.data) setSmtp(s.data);
    } catch (e: any) {
      setSmtpTestMsg(`Failed: ${e?.response?.data?.message ?? e?.message ?? "error"}`);
    } finally {
      setSmtpTesting(false);
    }
  }

  const fmtMoney = (n: number, cur: string) =>
    new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(n) + ` ${cur}`;

  const runningDeployments = deployments.filter((d) => d.status === "RUNNING").length;
  const DASH = "\u2014";
  const num = (v: unknown) =>
    typeof v === "number" && Number.isFinite(v) ? new Intl.NumberFormat("en-US").format(v) : DASH;

  const cards = [
    { label: "Total Users", value: num(stats?.users ?? activeUsers ?? undefined), Icon: UsersIcon },
    { label: "Active Plans", value: num(stats?.activeSubscriptions), Icon: Gem },
    {
      label: "Running VPS",
      value: num(stats?.deployments ?? (deployments.length ? runningDeployments : undefined)),
      Icon: Server,
    },
    {
      label: "Revenue (paid)",
      value: stats ? fmtMoney(stats.revenueUSD ?? 0, "USD") : DASH,
      sub: stats ? fmtMoney(stats.revenueEGP ?? 0, "EGP") : undefined,
      Icon: Wallet,
    },
  ];

  return (
    <ErrorBoundary>
      <div className="space-y-6">
        <div>
          <h1 className="vc-h1">Admin Dashboard</h1>
          <p className="mt-1 text-sm text-white/60">Cluster overview and platform health.</p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {cards.map((c) => (
            <div key={c.label} className="vc-card p-5">
              <c.Icon className="h-5 w-5 text-cyan-300/80" aria-hidden />
              <div className="mt-3 text-2xl font-semibold tabular-nums text-white">{c.value}</div>
              {c.sub && <div className="vc-meta mt-0.5 tabular-nums">{c.sub}</div>}
              <div className="vc-label mt-2">{c.label}</div>
            </div>
          ))}
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <section className="vc-card p-6">
            <h2 className="vc-h2 mb-4">Cluster nodes</h2>
            {nodes.length === 0 ? (
              <p className="py-6 text-center text-sm text-white/50">No node data available.</p>
            ) : (
              <div className="space-y-3">
                {nodes.map((n) => {
                  const memPct = n.memory.capacity ? ((n.memory.capacity - n.memory.allocatable) / n.memory.capacity) * 100 : 0;
                  return (
                    <div key={n.name} className="rounded-xl border border-white/5 bg-slate-950/40 p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium">{n.name}</div>
                          <div className="text-xs text-white/50">
                            {n.roles.join(", ") || "worker"} · {n.podCount} pods
                          </div>
                        </div>
                        <span className={`rounded-full border px-2 py-0.5 text-xs ${n.status === "True" ? "border-green-500/30 bg-green-500/10 text-green-300" : "border-red-500/30 bg-red-500/10 text-red-300"}`}>
                          {n.status === "True" ? "Ready" : "NotReady"}
                        </span>
                      </div>
                      <div className="mt-3 grid grid-cols-2 gap-3 text-xs">
                        <Metric label="CPU" value={`${n.cpu.capacity} cores`} pct={4} />
                        <Metric label="Memory" value={`${Math.round(n.memory.capacity)} MB`} pct={memPct} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          <section className="vc-card p-6">
            <h2 className="vc-h2 mb-4">Running namespaces ({namespaces.length})</h2>
            {namespaces.length === 0 ? (
              <p className="py-6 text-center text-sm text-white/50">No namespaces.</p>
            ) : (
              <>
                <div className="divide-y divide-white/5">
                  {(showAllNs ? namespaces : namespaces.slice(0, 12)).map((ns) => (
                    <div key={ns.namespace} className="flex items-center justify-between py-2">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-medium font-mono">{ns.namespace || "(unnamed)"}</div>
                        <div className="text-xs text-white/50">{ns.podCount} pods</div>
                      </div>
                      <span className={`shrink-0 rounded-full border px-2 py-0.5 text-xs ${ns.status === "critical" ? "border-red-500/30 bg-red-500/10 text-red-300"
                          : ns.status === "warning" ? "border-yellow-500/30 bg-yellow-500/10 text-yellow-300"
                            : "border-green-500/30 bg-green-500/10 text-green-300"
                        }`}>{ns.status}</span>
                    </div>
                  ))}
                </div>
                {namespaces.length > 12 && (
                  <button onClick={() => setShowAllNs((v) => !v)} className="mt-3 w-full vc-btn vc-btn-sm vc-btn-secondary text-white/70 hover:bg-white/10">
                    {showAllNs ? "Show less" : `Show all ${namespaces.length}`}
                  </button>
                )}
              </>
            )}
          </section>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <section className="vc-card p-6">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="vc-h2">SMTP status</h2>
              <button onClick={testSmtp} disabled={smtpTesting} className="rounded-lg border border-white/10 bg-white/5 px-3 py-1 text-xs hover:bg-white/10 disabled:opacity-50">
                {smtpTesting ? "Testing…" : "Test connection"}
              </button>
            </div>
            <div className="flex items-center gap-3">
              <span className={`inline-block h-3 w-3 rounded-full ${smtp?.status === "connected" ? "bg-green-400 shadow-[0_0_12px_rgba(74,222,128,0.7)]" : "bg-red-400"}`} />
              <div className="text-sm">
                <div className="font-medium">{smtp?.status === "connected" ? "Connected" : "Failed"}</div>
                <div className="text-xs text-white/50">
                  {smtp?.transport ?? "—"} {smtp?.host ? `· ${smtp.host}` : ""}
                </div>
                {smtp?.from && <div className="text-xs text-white/40">From: {smtp.from}</div>}
                {smtp?.error && <div className="text-xs text-red-300">{smtp.error}</div>}
              </div>
            </div>
            {smtpTestMsg && <p className="mt-2 text-xs text-white/60">{smtpTestMsg}</p>}
          </section>

          <section className="vc-card p-6">
            <h2 className="vc-h2 mb-3">Recent deployments</h2>
            {deployments.length === 0 ? (
              <p className="text-sm text-white/50">No recent deployments.</p>
            ) : (
              <div className="divide-y divide-white/5">
                {deployments.slice(0, 5).map((d) => (
                  <Link key={d.id} href={`/voidcloud/admin/dashboard`} className="flex items-center justify-between py-2 text-sm hover:bg-white/5">
                    <div>
                      <div className="font-medium">{d.name}</div>
                      <div className="text-xs text-white/50">{d.namespace}</div>
                    </div>
                    <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-xs">{d.status}</span>
                  </Link>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </ErrorBoundary>
  );
}

function Metric({ label, value, pct }: { label: string; value: string; pct: number }) {
  const p = Math.max(0, Math.min(100, pct));
  return (
    <div>
      <div className="flex justify-between text-white/60">
        <span>{label}</span>
        <span>{p.toFixed(1)}%</span>
      </div>
      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white/10">
        <div className="h-full bg-gradient-to-r from-cyan-400 to-fuchsia-500" style={{ width: `${p}%` }} />
      </div>
      <div className="mt-0.5 text-[10px] text-white/40">{value}</div>
    </div>
  );
}

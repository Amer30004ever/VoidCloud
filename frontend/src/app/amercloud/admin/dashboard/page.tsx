/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import api from "@/lib/api";
import { cloudApi, CloudDeployment } from "@/lib/cloud";

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
  const [stats, setStats] = useState<any>(null);
  const [nodes, setNodes] = useState<NodeInfo[]>([]);
  const [namespaces, setNamespaces] = useState<Ns[]>([]);
  const [smtp, setSmtp] = useState<any>(null);
  const [sys, setSys] = useState<any>(null);
  const [deployments, setDeployments] = useState<CloudDeployment[]>([]);
  const [activeUsers, setActiveUsers] = useState<number | null>(null);

  useEffect(() => {
    cloudApi.admin.stats().then(setStats).catch(() => {});
    api.get("/cluster/nodes").then((r) => setNodes(r.data?.nodes ?? [])).catch(() => {});
    api.get("/namespaces/running").then((r) => setNamespaces(r.data?.namespaces ?? [])).catch(() => {});
    api.get("/system/smtp-status").then((r) => setSmtp(r.data)).catch(() => setSmtp({ status: "failed" }));
    api.get("/system/status").then((r) => setSys(r.data)).catch(() => {});
    cloudApi.admin.users().then((u: any) => {
      const list = Array.isArray(u) ? u : (u?.users ?? []);
      setActiveUsers(list.filter((x: any) => x.isActive !== false).length);
    }).catch(() => {});
    cloudApi.deployments.list().then(setDeployments).catch(() => {});
  }, []);

  const totalPods = nodes.reduce((s, n) => s + (n.podCount ?? 0), 0);
  const clusterHealthy = sys?.kubernetesConnected && nodes.every((n) => n.status === "True");

  const fmtMoney = (n: number, cur: string) =>
    new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(n) + ` ${cur}`;

  const cards = [
    { label: "Total Users", value: stats?.users ?? activeUsers ?? "—", icon: "👤" },
    { label: "Active Plans", value: stats?.activeSubscriptions ?? "—", icon: "💎" },
    { label: "Deployments", value: stats?.deployments ?? deployments.length ?? "—", icon: "🖥️" },
    {
      label: "Revenue (paid)",
      value: stats
        ? `${fmtMoney(stats.revenueUSD ?? 0, "USD")} · ${fmtMoney(stats.revenueEGP ?? 0, "EGP")}`
        : "—",
      icon: "💰",
    },
  ];


  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">🛡️ Admin Dashboard</h1>
        <p className="mt-1 text-sm text-white/60">Cluster overview and platform health.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {cards.map((c) => (
          <div key={c.label} className="rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-xl">
            <div className="text-2xl">{c.icon}</div>
            <div className="mt-2 text-3xl font-bold">{c.value}</div>
            <div className="mt-1 text-xs uppercase text-white/50">{c.label}</div>
          </div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl">
          <h2 className="mb-4 text-lg font-semibold">Cluster nodes</h2>
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

        <section className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl">
          <h2 className="mb-4 text-lg font-semibold">Running namespaces</h2>
          {namespaces.length === 0 ? (
            <p className="py-6 text-center text-sm text-white/50">No namespaces.</p>
          ) : (
            <div className="divide-y divide-white/5">
              {namespaces.map((ns) => (
                <div key={ns.namespace} className="flex items-center justify-between py-2">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium font-mono">{ns.namespace || "(unnamed)"}</div>
                    <div className="text-xs text-white/50">{ns.podCount} pods</div>
                  </div>
                  <span className={`shrink-0 rounded-full border px-2 py-0.5 text-xs ${
                    ns.status === "critical" ? "border-red-500/30 bg-red-500/10 text-red-300"
                    : ns.status === "warning" ? "border-yellow-500/30 bg-yellow-500/10 text-yellow-300"
                    : "border-green-500/30 bg-green-500/10 text-green-300"
                  }`}>{ns.status}</span>
                </div>
              ))}
            </div>

          )}
        </section>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl">
          <h2 className="mb-3 text-lg font-semibold">SMTP status</h2>
          <div className="flex items-center gap-3">
            <span className={`inline-block h-3 w-3 rounded-full ${smtp?.status === "connected" ? "bg-green-400 shadow-[0_0_12px_rgba(74,222,128,0.7)]" : "bg-red-400"}`} />
            <div className="text-sm">
              <div className="font-medium">{smtp?.status === "connected" ? "Connected" : "Failed"}</div>
              <div className="text-xs text-white/50">
                {smtp?.transport ?? "—"} {smtp?.host ? `· ${smtp.host}` : ""}
              </div>
              {smtp?.from && <div className="text-xs text-white/40">From: {smtp.from}</div>}
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl">
          <h2 className="mb-3 text-lg font-semibold">Recent deployments</h2>
          {deployments.length === 0 ? (
            <p className="text-sm text-white/50">No recent deployments.</p>
          ) : (
            <div className="divide-y divide-white/5">
              {deployments.slice(0, 5).map((d) => (
                <Link key={d.id} href={`/amercloud/admin/dashboard`} className="flex items-center justify-between py-2 text-sm hover:bg-white/5">
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

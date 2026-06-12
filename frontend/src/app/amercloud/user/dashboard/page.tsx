/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import api from "@/lib/api";
import { cloudApi, CloudDeployment, CloudUsage } from "@/lib/cloud";

export default function UserDashboard() {
  const [usage, setUsage] = useState<CloudUsage | null>(null);
  const [deployments, setDeployments] = useState<CloudDeployment[]>([]);
  const [me, setMe] = useState<any>(null);

  useEffect(() => {
    cloudApi.deployments.usage().then(setUsage).catch(() => {});
    cloudApi.deployments.list().then(setDeployments).catch(() => {});
    api.get("/auth/me").then((r) => setMe(r.data)).catch(() => {});
  }, []);

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-white/10 bg-gradient-to-r from-cyan-500/10 to-fuchsia-500/10 p-8 backdrop-blur-xl">
        <h1 className="text-3xl font-bold">Welcome back{me?.name ? `, ${me.name.split(" ")[0]}` : ""} 👋</h1>
        <p className="mt-2 text-white/60">Manage your deployments, plan, and usage from one place.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <PlanCard usage={usage} />
        <Gauge label="CPU" used={usage?.used.cpu ?? 0} total={usage?.limits.cpuLimit ?? 1} unit="cores" />
        <Gauge label="Memory" used={usage?.used.memory ?? 0} total={usage?.limits.memoryLimit ?? 1} unit="MB" />
        <Gauge label="Storage" used={usage?.used.storage ?? 0} total={usage?.limits.storageLimit ?? 1} unit="MB" />
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <QuickAction href="/amercloud/dashboard/deployments/new" icon="🚀" title="New Deployment" desc="Deploy from GitHub or Docker" />
        <QuickAction href="/amercloud/dashboard/billing/invoices" icon="🧾" title="View Invoices" desc="Download past invoices" />
        <QuickAction href="/amercloud/dashboard/billing" icon="⬆️" title="Upgrade Plan" desc="Need more resources?" />
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Your deployments</h2>
          <Link href="/amercloud/dashboard/deployments" className="text-xs text-cyan-300 hover:underline">View all →</Link>
        </div>
        {deployments.length === 0 ? (
          <p className="py-12 text-center text-white/50">No deployments yet. Create your first to get started.</p>
        ) : (
          <div className="divide-y divide-white/5">
            {deployments.slice(0, 5).map((d) => (
              <Link key={d.id} href={`/amercloud/dashboard/deployments/${d.id}`} className="flex items-center justify-between py-3 hover:bg-white/5">
                <div>
                  <div className="font-medium">{d.name}</div>
                  <div className="text-xs text-white/50">{d.subdomain ? `${d.subdomain}.amercloud.cc.cd` : d.namespace}</div>
                </div>
                <StatusBadge status={d.status} />
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function PlanCard({ usage }: { usage: CloudUsage | null }) {
  return (
    <div className="rounded-2xl border border-cyan-400/30 bg-gradient-to-br from-cyan-500/10 to-fuchsia-500/10 p-5">
      <div className="text-xs uppercase text-cyan-300">Current plan</div>
      <div className="mt-1 text-2xl font-bold">{usage?.plan?.name ?? "Free Trial"}</div>
      <div className="mt-1 text-xs text-white/60">${usage?.plan?.priceUSD ?? 0}/mo · {usage?.plan?.priceEGP ?? 0} EGP</div>
      <Link href="/amercloud/dashboard/billing" className="mt-3 inline-block text-xs text-cyan-300 hover:underline">Manage →</Link>
    </div>
  );
}

function Gauge({ label, used, total, unit }: { label: string; used: number; total: number; unit: string }) {
  const pct = Math.min(100, total ? (used / total) * 100 : 0);
  const color = pct > 90 ? "from-red-500 to-orange-500" : pct > 70 ? "from-yellow-400 to-orange-500" : "from-cyan-400 to-fuchsia-500";
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-xl">
      <div className="flex items-baseline justify-between">
        <div className="text-xs uppercase text-white/60">{label}</div>
        <div className="text-xs text-white/50">{pct.toFixed(0)}%</div>
      </div>
      <div className="mt-2 text-2xl font-bold">{used.toFixed(used < 10 ? 2 : 0)}<span className="ml-1 text-sm text-white/40">{unit}</span></div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
        <div className={`h-full bg-gradient-to-r ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <div className="mt-1 text-xs text-white/40">of {total} {unit}</div>
    </div>
  );
}

function QuickAction({ href, icon, title, desc }: { href: string; icon: string; title: string; desc: string }) {
  return (
    <Link href={href} className="rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-xl transition hover:border-cyan-400/30 hover:bg-white/10">
      <div className="text-2xl">{icon}</div>
      <div className="mt-2 font-semibold">{title}</div>
      <div className="text-xs text-white/50">{desc}</div>
    </Link>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    RUNNING: "bg-green-500/20 text-green-300 border-green-500/30",
    DEPLOYING: "bg-blue-500/20 text-blue-300 border-blue-500/30",
    PENDING: "bg-yellow-500/20 text-yellow-300 border-yellow-500/30",
    STOPPED: "bg-gray-500/20 text-gray-300 border-gray-500/30",
    FAILED: "bg-red-500/20 text-red-300 border-red-500/30",
    DELETED: "bg-gray-500/10 text-gray-400 border-gray-500/20",
  };
  return <span className={`rounded-full border px-2 py-0.5 text-xs ${colors[status] ?? colors.PENDING}`}>{status}</span>;
}

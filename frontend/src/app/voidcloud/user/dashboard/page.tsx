/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import api from "@/lib/api";
import { cloudApi, CloudDeployment, CloudUsage } from "@/features/vps/cloud";
import { WidgetBoundary } from "@workspace/ui-kit/widget-boundary";

export default function UserDashboard() {
  const [usage, setUsage] = useState<CloudUsage | null>(null);
  const [deployments, setDeployments] = useState<CloudDeployment[]>([]);
  const [me, setMe] = useState<any>(null);
  const [now, setNow] = useState<number>(() => Date.now());

  useEffect(() => {
    cloudApi.deployments.usage().then(setUsage).catch(() => {});
    cloudApi.deployments.list().then((d) => setDeployments(Array.isArray(d) ? d : [])).catch(() => {});
    api.get("/auth/me").then((r) => setMe(r.data)).catch(() => {});
  }, []);

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(interval);
  }, []);

  const trialDaysLeft = me?.trialEndsAt
    ? Math.ceil((new Date(me.trialEndsAt).getTime() - now) / (1000 * 60 * 60 * 24))
    : null;
  const isTrialing = me?.subscriptionStatus === "TRIALING" && trialDaysLeft !== null;
  const trialExpired = isTrialing && trialDaysLeft <= 0;

  return (
    <div className="space-y-6">
      {isTrialing && (
        <div
          className={`rounded-2xl border p-4 backdrop-blur-xl ${
            trialExpired
              ? "border-red-500/30 bg-red-500/10 text-red-200"
              : "border-amber-500/30 bg-amber-500/10 text-amber-200"
          }`}
        >
          <div className="flex items-center justify-between gap-4">
            <div className="text-sm">
              {trialExpired
                ? "❌ Your trial has expired. Your VPS has been suspended. Upgrade now to resume service."
                : `⚠️ Your trial ends in ${trialDaysLeft} day${trialDaysLeft === 1 ? "" : "s"}. Upgrade to keep your VPS running.`}
            </div>
            <Link
              href="/voidcloud/dashboard/billing"
              className="shrink-0 rounded-lg bg-white/10 px-4 py-2 text-xs font-semibold hover:bg-white/20"
            >
              Upgrade plan
            </Link>
          </div>
        </div>
      )}

      <div className="rounded-2xl border border-white/10 bg-gradient-to-r from-cyan-500/10 to-fuchsia-500/10 p-8 backdrop-blur-xl">
        <h1 className="vc-h1">Welcome back{me?.name ? `, ${me.name.split(" ")[0]}` : ""} 👋</h1>
        <p className="mt-2 text-white/60">Manage your VPS instances, plan, and usage from one place.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <WidgetBoundary title="Current plan"><PlanCard usage={usage} /></WidgetBoundary>
        <WidgetBoundary title="CPU"><Gauge label="CPU" used={usage?.used?.cpu ?? 0} total={usage?.limits?.cpuLimit ?? 1} unit="cores" /></WidgetBoundary>
        <WidgetBoundary title="Memory"><Gauge label="Memory" used={usage?.used?.memory ?? 0} total={usage?.limits?.memoryLimit ?? 1} unit="MB" /></WidgetBoundary>
        <WidgetBoundary title="Storage"><Gauge label="Storage" used={usage?.used?.storage ?? 0} total={usage?.limits?.storageLimit ?? 1} unit="MB" /></WidgetBoundary>
      </div>


      <div className="grid gap-4 md:grid-cols-3">
        <QuickAction href="/voidcloud/dashboard/vps/new" icon="🖥️" title="New VPS" desc="Provision a Proxmox container" />
        <QuickAction href="/voidcloud/dashboard/billing/invoices" icon="🧾" title="View Invoices" desc="Download past invoices" />
        <QuickAction href="/voidcloud/dashboard/billing" icon="⬆️" title="Upgrade Plan" desc="Need more resources?" />
      </div>

      <div className="vc-card p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Your VPS instances</h2>
          <Link href="/voidcloud/dashboard/vps" className="text-xs text-cyan-300 hover:underline">View all →</Link>
        </div>
        {deployments.length === 0 ? (
          <p className="py-12 text-center text-white/50">No VPS instances yet. Provision your first to get started.</p>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {deployments.slice(0, 6).map((d) => (
              <VpsCard key={d.id} d={d as VpsCardProps["d"]} trialEndsAt={me?.trialEndsAt ?? null} now={now} />
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
      <Link href="/voidcloud/dashboard/billing" className="mt-3 inline-block text-xs text-cyan-300 hover:underline">Manage →</Link>
    </div>
  );
}

function Gauge({ label, used, total, unit }: { label: string; used: number; total: number; unit: string }) {
  const pct = Math.min(100, total ? (used / total) * 100 : 0);
  const color = pct > 90 ? "from-red-500 to-orange-500" : pct > 70 ? "from-yellow-400 to-orange-500" : "from-cyan-400 to-fuchsia-500";
  return (
    <div className="vc-card p-5">
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
    <Link href={href} className="vc-card p-5 transition hover:border-cyan-400/30 hover:bg-white/10">
      <div className="text-2xl">{icon}</div>
      <div className="mt-2 font-semibold">{title}</div>
      <div className="text-xs text-white/50">{desc}</div>
    </Link>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    RUNNING: "bg-green-500/20 text-green-300 border-green-500/30",
    PROVISIONING: "bg-blue-500/20 text-blue-300 border-blue-500/30",
    DEPLOYING: "bg-blue-500/20 text-blue-300 border-blue-500/30",
    PENDING: "bg-yellow-500/20 text-yellow-300 border-yellow-500/30",
    STOPPED: "bg-gray-500/20 text-gray-300 border-gray-500/30",
    SUSPENDED: "bg-orange-500/20 text-orange-300 border-orange-500/30",
    FAILED: "bg-red-500/20 text-red-300 border-red-500/30",
    TERMINATED: "bg-gray-500/10 text-gray-400 border-gray-500/20",
    DELETED: "bg-gray-500/10 text-gray-400 border-gray-500/20",
  };
  return <span className={`rounded-full border px-2 py-0.5 text-xs ${colors[status] ?? colors.PENDING}`}>{status}</span>;
}

type VpsCardProps = { d: CloudDeployment & { ipv4Address?: string }; trialEndsAt: string | null; now: number };
function VpsCard({ d, trialEndsAt, now }: VpsCardProps) {
  const [u, setU] = useState<{ cpuPercent: number; ramPercent: number; diskPercent: number } | null>(null);
  useEffect(() => { cloudApi.deployments.usageOne(d.id).then(setU).catch(() => {}); }, [d.id]);
  const trialDays = trialEndsAt ? Math.max(0, Math.ceil((new Date(trialEndsAt).getTime() - now) / (1000 * 60 * 60 * 24))) : null;
  return (
    <Link href={`/voidcloud/dashboard/vps/${d.id}`} className="block vc-card p-4 hover:border-cyan-400/30 hover:bg-white/10">
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="font-semibold">{d.name}</div>
          <div className="font-mono text-xs text-cyan-300 mt-0.5">{d.ipv4Address ?? "no IP"}</div>
        </div>
        <StatusBadge status={d.status} />
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
        <Metric label="CPU" pct={u?.cpuPercent ?? 0} />
        <Metric label="RAM" pct={u?.ramPercent ?? 0} />
        <Metric label="Disk" pct={u?.diskPercent ?? 0} />
      </div>
      {trialDays !== null && (
        <div className="mt-3 text-[11px] text-amber-300">⏳ Trial: {trialDays} day{trialDays === 1 ? "" : "s"} left</div>
      )}
    </Link>
  );
}

function Metric({ label, pct }: { label: string; pct: number }) {
  const color = pct > 90 ? "from-red-500 to-orange-500" : pct > 70 ? "from-yellow-400 to-orange-500" : "from-cyan-400 to-fuchsia-500";
  return (
    <div>
      <div className="flex justify-between text-white/50"><span>{label}</span><span>{pct.toFixed(0)}%</span></div>
      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white/10">
        <div className={`h-full bg-gradient-to-r ${color}`} style={{ width: `${Math.min(100, pct)}%` }} />
      </div>
    </div>
  );
}
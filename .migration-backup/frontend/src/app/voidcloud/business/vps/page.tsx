"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { cloudApi, CloudDeployment } from "@/lib/cloud";

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    RUNNING: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
    PROVISIONING: "bg-blue-500/20 text-blue-300 border-blue-500/30",
    PENDING: "bg-amber-500/20 text-amber-300 border-amber-500/30",
    STOPPED: "bg-slate-500/20 text-slate-400 border-slate-500/30",
    FAILED: "bg-red-500/20 text-red-300 border-red-500/30",
  };
  return <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${colors[status] ?? colors.PENDING}`}>
    {status === "RUNNING" && <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />}
    {status}
  </span>;
}

export default function BusinessVpsPage() {
  const [deployments, setDeployments] = useState<CloudDeployment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    cloudApi.deployments.list().then(setDeployments).catch(() => setDeployments([])).finally(() => setLoading(false));
  }, []);

  const running = deployments.filter((d) => d.status === "RUNNING").length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white">VPS Instances</h1>
          <p className="mt-1 text-sm text-white/40">{deployments.length} instances · {running} running</p>
        </div>
        <Link href="/voidcloud/dashboard/vps/new" className="rounded-xl bg-gradient-to-r from-blue-500 to-violet-500 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-blue-500/20">+ New VPS</Link>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: "Total VPS", value: deployments.length },
          { label: "Running", value: running },
          { label: "Stopped", value: deployments.filter(d => d.status === "STOPPED").length },
          { label: "Failed", value: deployments.filter(d => d.status === "FAILED").length },
        ].map((s) => (
          <div key={s.label} className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <p className="text-xs text-white/40">{s.label}</p>
            <p className="mt-1 text-2xl font-bold">{s.value}</p>
          </div>
        ))}
      </div>

      {loading ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[1,2,3].map(i => <div key={i} className="h-32 animate-pulse rounded-2xl bg-white/5" />)}
        </div>
      ) : deployments.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-12 text-center">
          <p className="text-3xl mb-3">🖥️</p>
          <p className="text-sm text-white/50">No VPS instances yet</p>
          <Link href="/voidcloud/dashboard/vps/new" className="mt-4 inline-block rounded-xl bg-gradient-to-r from-blue-500 to-violet-500 px-4 py-2 text-sm font-semibold text-white">Provision your first VPS</Link>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {deployments.map((d) => (
            <Link key={d.id} href={`/voidcloud/dashboard/vps/${d.id}`} className="rounded-2xl border border-white/10 bg-white/5 p-5 transition hover:border-blue-400/30 hover:bg-white/10">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-semibold text-white">{d.name}</p>
                  <p className="font-mono text-xs text-cyan-300 mt-0.5">{(d as { ipv4Address?: string }).ipv4Address ?? "no IP"}</p>
                  <p className="text-xs text-white/40 mt-0.5">{d.namespace}</p>
                </div>
                <StatusBadge status={d.status} />
              </div>
              <div className="mt-4 flex gap-2 text-xs text-white/40">
                <span>{d.cpu ?? "—"} vCPU</span>
                <span>·</span>
                <span>{d.memory ?? "—"} MB RAM</span>
                <span>·</span>
                <span>{d.storage ?? "—"} GB</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

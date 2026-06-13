/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars, react-hooks/set-state-in-effect, react-hooks/exhaustive-deps, react/no-unescaped-entities */
"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { cloudApi, CloudDeployment } from "@/lib/cloud";
import { StatusBadge } from "../../page";
import { VpsTerminal } from "@/components/cloud/VpsTerminal";

export default function DeploymentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [d, setD] = useState<CloudDeployment | null>(null);
  const [tab, setTab] = useState<"overview" | "terminal" | "logs" | "metrics" | "env">("overview");
  const [logs, setLogs] = useState<string[]>([]);
  const [metrics, setMetrics] = useState<any>(null);

  useEffect(() => { cloudApi.deployments.get(id).then(setD); }, [id]);
  useEffect(() => {
    if (tab === "logs") cloudApi.deployments.logs(id).then((r: any) => setLogs(r.lines));
    if (tab === "metrics") cloudApi.deployments.metrics(id).then(setMetrics);
  }, [tab, id]);

  async function action(fn: () => Promise<any>) {
    await fn();
    cloudApi.deployments.get(id).then(setD);
  }

  if (!d) return <p className="text-white/50">Loading…</p>;

  return (
    <div>
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold">{d.name}</h1>
          <p className="mt-1 text-sm text-cyan-300">https://{d.subdomain}.amercloud.cc.cd</p>
          <div className="mt-2 flex gap-2"><StatusBadge status={d.status} /><span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-xs">{d.type}</span></div>
        </div>
        <div className="flex gap-2">
          <button onClick={() => action(() => cloudApi.deployments.restart(d.id))} className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm hover:bg-white/10">↻ Restart</button>
          <button onClick={async () => { if (confirm("Delete?")) { await cloudApi.deployments.remove(d.id); router.push("/amercloud/dashboard/deployments"); } }} className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300 hover:bg-red-500/20">Delete</button>
        </div>
      </div>

      <div className="mb-4 flex gap-1 border-b border-white/5">
        {(["overview", "logs", "metrics", "env"] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`px-4 py-2 text-sm ${tab === t ? "border-b-2 border-cyan-400 text-white" : "text-white/50"}`}>{t}</button>
        ))}
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl">
        {tab === "overview" && (
          <div className="space-y-2 text-sm">
            <Row k="Source" v={d.source} />
            <Row k="Namespace" v={d.namespace} />
            <Row k="Resources" v={`${d.cpu} CPU · ${d.memory}MB RAM · ${d.storage}MB disk · ${d.replicas} replicas`} />
            <Row k="Custom domains" v={d.customDomains?.join(", ") || "—"} />
            <Row k="Health check" v={d.healthCheck || "—"} />
            <Row k="Last deployed" v={d.lastDeployedAt ?? "never"} />
          </div>
        )}
        {tab === "logs" && (
          <pre className="max-h-96 overflow-auto rounded-lg bg-slate-950 p-4 font-mono text-xs text-green-300">{logs.join("\n")}</pre>
        )}
        {tab === "metrics" && metrics && (
          <div className="grid gap-4 md:grid-cols-3">
            {(["cpu", "memory", "requests"] as const).map((k) => (
              <div key={k} className="rounded-lg border border-white/10 p-4">
                <div className="mb-2 text-xs uppercase text-white/50">{k}</div>
                <svg viewBox="0 0 100 40" className="h-20 w-full">
                  <polyline fill="none" stroke="rgb(34,211,238)" strokeWidth="1.5"
                    points={metrics[k].map((p: any, i: number) => `${(i / 30) * 100},${40 - (p.v / Math.max(...metrics[k].map((q: any) => q.v))) * 35}`).join(" ")} />
                </svg>
              </div>
            ))}
          </div>
        )}
        {tab === "env" && (
          <pre className="rounded-lg bg-slate-950 p-4 font-mono text-xs">{JSON.stringify(d.envVars ?? {}, null, 2)}</pre>
        )}
      </div>
    </div>
  );
}

function Row({ k, v }: { k: string; v: any }) {
  return <div className="flex border-b border-white/5 py-2"><div className="w-40 text-white/50">{k}</div><div className="flex-1 font-mono text-white/90">{String(v)}</div></div>;
}

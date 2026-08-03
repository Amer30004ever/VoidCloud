"use client";

import { useEffect, useMemo, useState } from "react";
import api from "@/lib/api";
import { cloudAnalytics, cloudApi, type CostBreakdown, type ResourceTrends, type VpsHistoricalUsage, type CloudDeployment } from "@/features/vps/cloud";
import type { ApiUsageSummary, TenantUsageRow } from "@/features/vps/cloud";
import {
  LineChart, Line, PieChart, Pie, Cell, BarChart, Bar,
  XAxis, YAxis, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import { WidgetBoundary } from "@workspace/ui-kit/widget-boundary";

const COLORS = ["#22d3ee", "#a78bfa", "#f472b6", "#facc15", "#34d399", "#fb923c"];

export default function AnalyticsPage() {
  const [vpsList, setVpsList] = useState<CloudDeployment[]>([]);
  const [selVps, setSelVps] = useState<string>("");
  const [hours, setHours] = useState(24);
  const [usage, setUsage] = useState<VpsHistoricalUsage | null>(null);
  const [costs, setCosts] = useState<CostBreakdown | null>(null);
  const [trends, setTrends] = useState<ResourceTrends | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [usageDays, setUsageDays] = useState(30);
  const [myUsage, setMyUsage] = useState<ApiUsageSummary | null>(null);
  const [role, setRole] = useState<string | null>(null);

  useEffect(() => {
    api.get("/auth/me").then((r) => setRole(r.data?.role ?? null)).catch(() => setRole(null));
  }, []);

  useEffect(() => {
    cloudApi.deployments.list().then((l: CloudDeployment[]) => {
      setVpsList(l);
      if (l[0]) setSelVps(l[0].id);
    }).catch(() => { });
    cloudAnalytics.costs(3).then(setCosts).catch(() => { });
    cloudAnalytics.trends(30).then(setTrends).catch(() => { });
  }, []);

  useEffect(() => {
    if (!selVps) return;
    cloudAnalytics.vpsUsage(selVps, hours).then(setUsage).catch((e) => setErr(e?.message ?? "Failed"));
  }, [selVps, hours]);

  useEffect(() => {
    cloudAnalytics.myUsage(usageDays).then(setMyUsage).catch(() => setMyUsage(null));
  }, [usageDays]);

  const cpuData = useMemo(() => usage?.cpu.map((p) => ({ t: new Date(p.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }), v: p.value })) ?? [], [usage]);
  const ramData = useMemo(() => usage?.ram.map((p) => ({ t: new Date(p.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }), v: p.value })) ?? [], [usage]);

  async function downloadCsv() {
    try {
      const res = await api.get("/cloud/analytics/export/csv", { responseType: "blob" });
      const url = URL.createObjectURL(res.data as Blob);
      const a = document.createElement("a");
      a.href = url; a.download = `voidcloud-analytics-${Date.now()}.csv`; a.click();
      URL.revokeObjectURL(url);
    } catch (e) { setErr(e instanceof Error ? e.message : "Export failed"); }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">Analytics</h1>
          <p className="text-sm text-white/60">Cost breakdown, usage trends, and forecasts across your VPS fleet.</p>
        </div>
        <button onClick={downloadCsv} className="rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm hover:bg-white/10">Export CSV</button>
      </div>
      {err && <div className="rounded border border-red-500/30 bg-red-500/10 p-2 text-sm text-red-200">{err}</div>}

      <div className="grid gap-4 md:grid-cols-4">
        <Card label="Total spend (3mo)" value={costs ? `$${costs.total.toFixed(2)}` : "—"} />
        <Card label="Forecast (next mo)" value={costs ? `$${costs.forecast.toFixed(2)}` : "—"} />
        <Card label="Active VPS" value={trends ? String(trends.vpsCount) : "—"} />
        <Card label="Avg CPU alloc" value={trends ? `${trends.cpu} vCPU` : "—"} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <WidgetBoundary title="Cost by VPS">
          <Panel title="Cost by VPS">
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={costs?.byVPS ?? []} dataKey="cost" nameKey="vpsName" outerRadius={90} label>
                  {(costs?.byVPS ?? []).map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ background: "#0f172a", border: "1px solid #334155" }} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </Panel>
        </WidgetBoundary>
        <WidgetBoundary title="Monthly spend">
          <Panel title="Monthly spend">
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={costs?.monthly ?? []}>
                <XAxis dataKey="month" stroke="#94a3b8" fontSize={12} />
                <YAxis stroke="#94a3b8" fontSize={12} />
                <Tooltip contentStyle={{ background: "#0f172a", border: "1px solid #334155" }} />
                <Bar dataKey="total" fill="#a78bfa" />
              </BarChart>
            </ResponsiveContainer>
          </Panel>
        </WidgetBoundary>
      </div>


      <Panel
        title="Usage over time"
        right={
          <div className="flex gap-2">
            <select value={selVps} onChange={(e) => setSelVps(e.target.value)} className="rounded border border-white/10 bg-slate-950 px-2 py-1 text-sm">
              {vpsList.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
            </select>
            <select value={hours} onChange={(e) => setHours(+e.target.value)} className="rounded border border-white/10 bg-slate-950 px-2 py-1 text-sm">
              <option value={1}>Last 1h</option>
              <option value={24}>Last 24h</option>
              <option value={168}>Last 7d</option>
            </select>
          </div>
        }
      >
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <div className="mb-1 text-xs text-white/50">CPU %</div>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={cpuData}>
                <XAxis dataKey="t" stroke="#94a3b8" fontSize={11} />
                <YAxis stroke="#94a3b8" fontSize={11} />
                <Tooltip contentStyle={{ background: "#0f172a", border: "1px solid #334155" }} />
                <Line dataKey="v" stroke="#22d3ee" dot={false} strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div>
            <div className="mb-1 text-xs text-white/50">RAM %</div>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={ramData}>
                <XAxis dataKey="t" stroke="#94a3b8" fontSize={11} />
                <YAxis stroke="#94a3b8" fontSize={11} />
                <Tooltip contentStyle={{ background: "#0f172a", border: "1px solid #334155" }} />
                <Line dataKey="v" stroke="#a78bfa" dot={false} strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </Panel>

      <Panel title="API Usage">
        <div className="flex items-center justify-between mb-4">
          <p className="text-xs text-white/60">Request volume and response times across your account.</p>
          <select value={usageDays} onChange={(e) => setUsageDays(+e.target.value)} className="rounded border border-white/10 bg-slate-950 px-2 py-1 text-sm">
            <option value={1}>Last 1 day</option>
            <option value={7}>Last 7 days</option>
            <option value={30}>Last 30 days</option>
            <option value={90}>Last 90 days</option>
          </select>
        </div>
        {myUsage && (
          <div className="grid gap-4 md:grid-cols-3">
            <Card label="Total requests" value={String(myUsage.totalCalls)} />
            <Card label="Avg response" value={`${myUsage.avgResponseMs}ms`} />
            <Card label="Top endpoint" value={myUsage.topEndpoints[0]?.endpoint ?? "—"} />
          </div>
        )}
        {myUsage?.topEndpoints && myUsage.topEndpoints.length > 0 && (
          <div className="mt-4 space-y-2">
            {myUsage.topEndpoints.map((ep, i) => (
              <div key={i} className="flex items-center justify-between rounded-lg border border-white/5 bg-white/5 p-3 text-sm">
                <span className="font-mono text-cyan-300">{ep.endpoint}</span>
                <span className="text-white/60">{ep.count} calls · {ep.avgMs}ms avg</span>
              </div>
            ))}
          </div>
        )}
      </Panel>
    </div>
  );
}

function Card({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-slate-900/50 p-4">
      <div className="text-xs text-white/50">{label}</div>
      <div className="mt-1 text-2xl font-bold">{value}</div>
    </div>
  );
}

function Panel({ title, right, children }: { title: string; right?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-white/10 bg-slate-900/40 p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold">{title}</h3>
        {right}
      </div>
      {children}
    </div>
  );
}

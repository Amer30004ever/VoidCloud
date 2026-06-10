import { createFileRoute, Link } from "@tanstack/react-router";
import { Boxes, Server, GitBranch, AlertTriangle, Activity, ShieldCheck, Cpu, MemoryStick } from "lucide-react";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid, BarChart, Bar, Legend } from "recharts";
import { StatCard } from "@/components/stat-card";
import { StatusBadge } from "@/components/status-badge";
import { Card } from "@/components/ui/card";
import { clusters, pipelines, clusterLoad, pipelineHistory } from "@/lib/mock-data";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Overview — Amer DevOps Portal" },
      { name: "description", content: "Real-time view of clusters, pipelines, and platform health." },
      { property: "og:title", content: "Amer DevOps Portal — Overview" },
      { property: "og:description", content: "Operator-grade Kubernetes & CI/CD control plane." },
    ],
  }),
  component: Overview,
});

function Overview() {
  return (
    <div className="relative">
      <div className="absolute inset-0 grid-bg opacity-30 pointer-events-none [mask-image:linear-gradient(to_bottom,black,transparent_60%)]" />
      <div className="relative mx-auto max-w-7xl space-y-6 p-6">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">control plane / overview</p>
            <h1 className="mt-1 text-3xl font-semibold tracking-tight">Platform at a glance</h1>
            <p className="mt-1 text-sm text-muted-foreground">Live signals across every cluster, pipeline, and surface you operate.</p>
          </div>
          <div className="flex items-center gap-2 rounded-md border border-border/60 bg-card px-3 py-2 text-xs font-mono text-muted-foreground">
            <Activity className="h-3.5 w-3.5 text-success" />
            All systems nominal · synced 4s ago
          </div>
        </header>

        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Clusters" value={clusters.length} delta="3 healthy · 1 degraded" icon={Server} tone="primary" />
          <StatCard label="Running pods" value="836" delta="+24 in last 1h" icon={Boxes} tone="info" />
          <StatCard label="Pipelines today" value="142" delta="98.6% success rate" icon={GitBranch} tone="success" />
          <StatCard label="Active incidents" value="2" delta="1 P3 · 1 P4" icon={AlertTriangle} tone="warning" />
        </section>

        <section className="grid gap-4 lg:grid-cols-3">
          <Card className="lg:col-span-2 border-border/60 bg-gradient-surface p-5">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold">Fleet utilization</h2>
                <p className="text-xs text-muted-foreground">CPU and memory across worker nodes — last 30 min</p>
              </div>
              <div className="flex items-center gap-3 text-[11px] font-mono text-muted-foreground">
                <span className="flex items-center gap-1.5"><span className="status-dot bg-primary" />CPU</span>
                <span className="flex items-center gap-1.5"><span className="status-dot bg-accent" />MEM</span>
              </div>
            </div>
            <div className="mt-4 h-64">
              <ResponsiveContainer>
                <AreaChart data={clusterLoad} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="cpu" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="oklch(0.62 0.18 255)" stopOpacity={0.6} />
                      <stop offset="100%" stopColor="oklch(0.62 0.18 255)" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="mem" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="oklch(0.78 0.14 200)" stopOpacity={0.5} />
                      <stop offset="100%" stopColor="oklch(0.78 0.14 200)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="oklch(0.32 0.04 255 / 30%)" vertical={false} />
                  <XAxis dataKey="t" tick={{ fill: "oklch(0.72 0.03 250)", fontSize: 10 }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fill: "oklch(0.72 0.03 250)", fontSize: 10 }} tickLine={false} axisLine={false} domain={[0, 100]} />
                  <Tooltip contentStyle={{ background: "oklch(0.22 0.045 255)", border: "1px solid oklch(0.32 0.04 255 / 60%)", borderRadius: 8, fontSize: 12 }} />
                  <Area type="monotone" dataKey="cpu" stroke="oklch(0.62 0.18 255)" fill="url(#cpu)" strokeWidth={2} />
                  <Area type="monotone" dataKey="mem" stroke="oklch(0.78 0.14 200)" fill="url(#mem)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <MiniStat icon={Cpu} label="Avg CPU" value="58%" />
              <MiniStat icon={MemoryStick} label="Avg MEM" value="67%" />
              <MiniStat icon={ShieldCheck} label="Policies passing" value="412 / 418" />
              <MiniStat icon={Activity} label="p99 latency" value="142 ms" />
            </div>
          </Card>

          <Card className="border-border/60 bg-gradient-surface p-5">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold">Pipelines · 24h</h2>
                <p className="text-xs text-muted-foreground">Hourly runs by outcome</p>
              </div>
            </div>
            <div className="mt-4 h-64">
              <ResponsiveContainer>
                <BarChart data={pipelineHistory} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                  <CartesianGrid stroke="oklch(0.32 0.04 255 / 30%)" vertical={false} />
                  <XAxis dataKey="hour" tick={{ fill: "oklch(0.72 0.03 250)", fontSize: 9 }} tickLine={false} axisLine={false} interval={3} />
                  <YAxis tick={{ fill: "oklch(0.72 0.03 250)", fontSize: 10 }} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={{ background: "oklch(0.22 0.045 255)", border: "1px solid oklch(0.32 0.04 255 / 60%)", borderRadius: 8, fontSize: 12 }} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="success" stackId="a" fill="oklch(0.72 0.17 155)" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="failed" stackId="a" fill="oklch(0.65 0.22 25)" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </section>

        <section className="grid gap-4 lg:grid-cols-2">
          <Card className="border-border/60 p-5">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold">Clusters</h2>
              <Link to="/kubernetes" className="text-xs text-primary hover:underline">View all →</Link>
            </div>
            <div className="mt-3 divide-y divide-border/60">
              {clusters.map((c) => (
                <div key={c.id} className="flex items-center justify-between py-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm">{c.name}</span>
                      <StatusBadge status={c.status} />
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground">{c.provider} · {c.region} · {c.version}</p>
                  </div>
                  <div className="text-right text-xs text-muted-foreground">
                    <div><span className="font-mono text-foreground">{c.nodes}</span> nodes</div>
                    <div><span className="font-mono text-foreground">{c.pods}</span> pods</div>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card className="border-border/60 p-5">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold">Recent pipeline runs</h2>
              <Link to="/pipelines" className="text-xs text-primary hover:underline">View all →</Link>
            </div>
            <div className="mt-3 divide-y divide-border/60">
              {pipelines.slice(0, 5).map((p) => (
                <div key={p.id} className="flex items-center justify-between py-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[11px] text-muted-foreground">{p.id}</span>
                      <span className="truncate text-sm">{p.name}</span>
                    </div>
                    <p className="mt-0.5 truncate text-xs text-muted-foreground font-mono">
                      {p.branch} · {p.commit} · {p.author}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <StatusBadge status={p.status} />
                    <span className="text-[11px] font-mono text-muted-foreground">{p.duration}</span>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </section>
      </div>
    </div>
  );
}

function MiniStat({ icon: Icon, label, value }: { icon: typeof Cpu; label: string; value: string }) {
  return (
    <div className="rounded-md border border-border/60 bg-background/40 p-2.5">
      <div className="flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
        <Icon className="h-3 w-3" /> {label}
      </div>
      <div className="mt-1 text-sm font-semibold">{value}</div>
    </div>
  );
}

"use client";

import {
  Boxes,
  GitMerge,
  BellRing,
  ExternalLink,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Server,
  Database,
  Cloud,
  BookOpen,
  Code2 as Github,
  Gauge,
  Workflow,
} from "lucide-react";
import Link from "next/link";

/**
 * HomeLab-style supplementary dashboard sections.
 * Rendered after the existing dashboard widgets. Designed to match
 * the platform-portal aesthetic from homelab.html (Backstage-inspired).
 *
 * Sections:
 *  1. Software Catalog snapshot (entities by kind)
 *  2. GitOps sync status
 *  3. Alerts & Incidents
 *  4. Quick Links / Bookmarks
 */
export function HomelabSections() {
  return (
    <div className="mt-6 grid gap-6 xl:grid-cols-2">
      <SoftwareCatalogCard />
      <GitOpsSyncCard />
      <AlertsCard />
      <QuickLinksCard />
    </div>
  );
}

/* ---------------------------------- 1 ---------------------------------- */
function SoftwareCatalogCard() {
  const entities = [
    { kind: "Service", count: 24, icon: Server, color: "text-cyan-400", bg: "bg-cyan-500/10" },
    { kind: "Library", count: 11, icon: BookOpen, color: "text-purple-400", bg: "bg-purple-500/10" },
    { kind: "Database", count: 6, icon: Database, color: "text-emerald-400", bg: "bg-emerald-500/10" },
    { kind: "Website", count: 9, icon: Cloud, color: "text-amber-400", bg: "bg-amber-500/10" },
  ];
  const total = entities.reduce((a, b) => a + b.count, 0);

  return (
    <section className="rounded-xl border border-border bg-card p-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <Boxes className="h-4 w-4 text-primary" /> Software Catalog
        </h2>
        <span className="text-xs text-muted-foreground">{total} entities</span>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {entities.map((e) => (
          <div
            key={e.kind}
            className="flex items-center justify-between rounded-lg border border-border bg-background/40 p-3"
          >
            <div className="flex items-center gap-3">
              <div className={`rounded-md p-2 ${e.bg}`}>
                <e.icon className={`h-4 w-4 ${e.color}`} />
              </div>
              <span className="text-sm text-foreground">{e.kind}</span>
            </div>
            <span className="text-sm font-semibold tabular-nums text-foreground">{e.count}</span>
          </div>
        ))}
      </div>
      <Link
        href="/platform"
        className="mt-4 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
      >
        Browse catalog <ExternalLink className="h-3 w-3" />
      </Link>
    </section>
  );
}

/* ---------------------------------- 2 ---------------------------------- */
function GitOpsSyncCard() {
  const apps = [
    { name: "platform-api", status: "Synced", health: "Healthy", revision: "a14f2c1" },
    { name: "edge-gateway", status: "Synced", health: "Healthy", revision: "b09c8e2" },
    { name: "auth-service", status: "OutOfSync", health: "Degraded", revision: "77d31aa" },
    { name: "metrics-agent", status: "Synced", health: "Healthy", revision: "fe1290b" },
  ];

  const badge = (status: string) => {
    const ok = status === "Synced";
    return (
      <span
        className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium ${
          ok
            ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
            : "border-amber-500/30 bg-amber-500/10 text-amber-400"
        }`}
      >
        {ok ? <CheckCircle2 className="h-3 w-3" /> : <AlertTriangle className="h-3 w-3" />}
        {status}
      </span>
    );
  };

  return (
    <section className="rounded-xl border border-border bg-card p-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <GitMerge className="h-4 w-4 text-primary" /> GitOps Sync
        </h2>
        <span className="text-xs text-muted-foreground">Argo CD · main</span>
      </div>
      <ul className="space-y-2">
        {apps.map((a) => (
          <li
            key={a.name}
            className="flex items-center justify-between rounded-lg border border-border bg-background/40 px-3 py-2 text-sm"
          >
            <div className="min-w-0">
              <p className="truncate font-medium text-foreground">{a.name}</p>
              <p className="font-mono text-[11px] text-muted-foreground">{a.revision}</p>
            </div>
            <div className="flex items-center gap-2">
              {badge(a.status)}
              <span className="text-xs text-muted-foreground">{a.health}</span>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

/* ---------------------------------- 3 ---------------------------------- */
function AlertsCard() {
  const alerts = [
    {
      severity: "critical",
      title: "auth-service pod CrashLoopBackOff",
      ns: "auth",
      time: "2m ago",
    },
    {
      severity: "warning",
      title: "Node node-02 disk usage > 80%",
      ns: "kube-system",
      time: "14m ago",
    },
    {
      severity: "warning",
      title: "Pipeline build-frontend slower than baseline",
      ns: "ci",
      time: "1h ago",
    },
    {
      severity: "info",
      title: "Certificate api.amer.dev renews in 7 days",
      ns: "cert-manager",
      time: "3h ago",
    },
  ];

  const sev = {
    critical: { icon: XCircle, cls: "text-rose-400 bg-rose-500/10 border-rose-500/30" },
    warning: { icon: AlertTriangle, cls: "text-amber-400 bg-amber-500/10 border-amber-500/30" },
    info: { icon: BellRing, cls: "text-cyan-400 bg-cyan-500/10 border-cyan-500/30" },
  } as const;

  return (
    <section className="rounded-xl border border-border bg-card p-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <BellRing className="h-4 w-4 text-primary" /> Active Alerts
        </h2>
        <Link href="/monitoring" className="text-xs font-medium text-primary hover:underline">
          View all
        </Link>
      </div>
      <ul className="space-y-2">
        {alerts.map((a, i) => {
          const s = sev[a.severity as keyof typeof sev];
          return (
            <li
              key={i}
              className="flex items-start gap-3 rounded-lg border border-border bg-background/40 p-3"
            >
              <div className={`rounded-md border p-1.5 ${s.cls}`}>
                <s.icon className="h-3.5 w-3.5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-foreground">{a.title}</p>
                <p className="text-xs text-muted-foreground">
                  {a.ns} · {a.time}
                </p>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/* ---------------------------------- 4 ---------------------------------- */
function QuickLinksCard() {
  const links = [
    { label: "Grafana", href: "/monitoring", icon: Gauge, hint: "Dashboards" },
    { label: "Pipelines", href: "/pipelines", icon: Workflow, hint: "CI / CD" },
    { label: "Infrastructure", href: "/infrastructure", icon: Server, hint: "Clusters & nodes" },
    { label: "Deployments", href: "/deployments", icon: Cloud, hint: "Releases" },
    { label: "GitHub", href: "https://github.com/Amer30004ever", icon: Github, hint: "Source", external: true },
    { label: "Docs", href: "/documentation", icon: BookOpen, hint: "Runbooks" },
  ];

  return (
    <section className="rounded-xl border border-border bg-card p-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <ExternalLink className="h-4 w-4 text-primary" /> Quick Links
        </h2>
        <span className="text-xs text-muted-foreground">Bookmarked tools</span>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {links.map((l) => {
          const cls =
            "group flex flex-col items-start gap-2 rounded-lg border border-border bg-background/40 p-3 transition hover:border-primary/40 hover:bg-background/70";
          const inner = (
            <>
              <div className="rounded-md bg-primary/10 p-2 text-primary">
                <l.icon className="h-4 w-4" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">{l.label}</p>
                <p className="text-[11px] text-muted-foreground">{l.hint}</p>
              </div>
            </>
          );
          return l.external ? (
            <a key={l.label} href={l.href} target="_blank" rel="noopener noreferrer" className={cls}>
              {inner}
            </a>
          ) : (
            <Link key={l.label} href={l.href} className={cls}>
              {inner}
            </Link>
          );
        })}
      </div>
    </section>
  );
}

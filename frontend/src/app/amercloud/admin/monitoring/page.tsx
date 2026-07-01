"use client";

import { useEffect, useState, useCallback, useRef } from "react";

interface ServiceHealth {
  id: string;
  name: string;
  icon: string;
  category: string;
  status: "UP" | "DOWN" | "DEGRADED";
  responseTimeMs: number;
  statusCode?: number;
  detail?: string;
  url: string;
  checkedAt: string;
}

interface HealthResponse {
  healthScore: number;
  summary: { up: number; degraded: number; down: number; total: number };
  avgResponseMs: number;
  services: ServiceHealth[];
  generatedAt: string;
}

interface AlertManagerAlert {
  labels: Record<string, string>;
  annotations: Record<string, string>;
  state: string;
  activeAt: string;
}

const REFRESH_INTERVAL = 30; // seconds

function StatusDot({ status }: { status: string }) {
  if (status === "UP") return <span className="inline-block h-2.5 w-2.5 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(74,222,128,0.8)] animate-pulse" />;
  if (status === "DEGRADED") return <span className="inline-block h-2.5 w-2.5 rounded-full bg-amber-400 shadow-[0_0_6px_rgba(251,191,36,0.8)]" />;
  return <span className="inline-block h-2.5 w-2.5 rounded-full bg-red-500 shadow-[0_0_6px_rgba(239,68,68,0.7)]" />;
}

function ResponseBar({ ms }: { ms: number }) {
  const pct = Math.min(100, (ms / 1000) * 100);
  const color = ms < 100 ? "bg-emerald-500" : ms < 300 ? "bg-amber-500" : ms < 600 ? "bg-orange-500" : "bg-red-500";
  return (
    <div className="mt-1 h-1 overflow-hidden rounded-full bg-white/10">
      <div className={`h-full rounded-full transition-all duration-700 ${color}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

function ScoreArc({ score }: { score: number }) {
  const color = score >= 90 ? "#22c55e" : score >= 70 ? "#f59e0b" : score >= 50 ? "#f97316" : "#ef4444";
  const r = 44, cx = 56, cy = 56;
  const circ = 2 * Math.PI * r;
  const dash = (score / 100) * circ;
  return (
    <svg width={112} height={112} viewBox="0 0 112 112">
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={10} />
      <circle cx={cx} cy={cy} r={r} fill="none" stroke={color} strokeWidth={10}
        strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
        transform={`rotate(-90 ${cx} ${cy})`}
        style={{ transition: "stroke-dasharray 1s ease, stroke 0.5s ease" }}
      />
      <text x={cx} y={cy + 6} textAnchor="middle" fill={color} fontSize={22} fontWeight={700}>{score}</text>
      <text x={cx} y={cy + 22} textAnchor="middle" fill="rgba(255,255,255,0.35)" fontSize={9}>HEALTH %</text>
    </svg>
  );
}

export default function AdminMonitoringPage() {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [countdown, setCountdown] = useState(REFRESH_INTERVAL);
  const [alerts, setAlerts] = useState<AlertManagerAlert[]>([]);
  const [activeTab, setActiveTab] = useState<"services" | "grafana" | "loki" | "alerts">("services");
  const [filterCategory, setFilterCategory] = useState<"all" | "backend" | "frontend" | "infra">("all");
  const [grafanaOrg] = useState(1);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const countdownRef = useRef<NodeJS.Timeout | null>(null);

  const fetchHealth = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/health-check", { cache: "no-store" });
      const data: HealthResponse = await res.json();
      setHealth(data);
      setLastRefresh(new Date());
      setCountdown(REFRESH_INTERVAL);
    } catch {
      // keep old data
    } finally { setLoading(false); }
  }, []);

  const fetchAlerts = useCallback(async () => {
    try {
      const res = await fetch("/api/monitoring/alertmanager/api/v2/alerts?active=true");
      const data = await res.json();
      setAlerts(Array.isArray(data) ? data : []);
    } catch { setAlerts([]); }
  }, []);

  useEffect(() => {
    fetchHealth();
    fetchAlerts();

    timerRef.current = setInterval(() => {
      fetchHealth();
      fetchAlerts();
    }, REFRESH_INTERVAL * 1000);

    countdownRef.current = setInterval(() => {
      setCountdown((c) => Math.max(0, c - 1));
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, [fetchHealth, fetchAlerts]);

  const filteredServices = health?.services.filter(
    (s) => filterCategory === "all" || s.category === filterCategory
  ) ?? [];

  const categories: Array<{ key: "all" | "backend" | "frontend" | "infra"; label: string }> = [
    { key: "all", label: "All" },
    { key: "backend", label: "Backend (12)" },
    { key: "frontend", label: "Frontend" },
    { key: "infra", label: "Infra" },
  ];

  const scoreColor = !health ? "text-white/40"
    : health.healthScore >= 90 ? "text-emerald-400"
    : health.healthScore >= 70 ? "text-amber-400"
    : "text-red-400";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white">Platform Monitoring</h1>
          <p className="mt-1 text-sm text-white/40">
            Real-time health · Auto-refresh every {REFRESH_INTERVAL}s
          </p>
        </div>
        <div className="flex items-center gap-3">
          {lastRefresh && (
            <span className="text-xs text-white/30">
              Last: {lastRefresh.toLocaleTimeString()} · Next in {countdown}s
            </span>
          )}
          <button
            onClick={() => { fetchHealth(); fetchAlerts(); }}
            disabled={loading}
            className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/60 hover:bg-white/10 disabled:opacity-40"
          >
            {loading ? "Checking…" : "↻ Refresh now"}
          </button>
        </div>
      </div>

      {/* Summary row */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {/* Score arc */}
        <div className="flex items-center justify-center rounded-2xl border border-white/10 bg-white/5 p-4 sm:col-span-2 lg:col-span-1">
          <ScoreArc score={health?.healthScore ?? 0} />
        </div>

        {[
          { label: "Services UP", value: health?.summary.up ?? "—", color: "text-emerald-400", icon: "✓" },
          { label: "Degraded", value: health?.summary.degraded ?? "—", color: "text-amber-400", icon: "⚠" },
          { label: "Down", value: health?.summary.down ?? "—", color: "text-red-400", icon: "✗" },
          { label: "Avg Response", value: health ? `${health.avgResponseMs}ms` : "—", color: "text-cyan-400", icon: "⚡" },
        ].map((c) => (
          <div key={c.label} className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <div className="text-xl">{c.icon}</div>
            <div className={`mt-1 text-3xl font-bold ${c.color}`}>{c.value}</div>
            <div className="mt-0.5 text-xs text-white/40">{c.label}</div>
          </div>
        ))}
      </div>

      {/* Alert banner */}
      {alerts.length > 0 && (
        <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-4">
          <p className="mb-2 text-sm font-semibold text-red-300">🚨 {alerts.length} Active Alert{alerts.length !== 1 ? "s" : ""}</p>
          <div className="space-y-1">
            {alerts.slice(0, 5).map((a, i) => (
              <div key={i} className="text-xs text-red-200/70">
                <span className="font-medium">{a.labels.alertname ?? "Unknown"}</span>
                {a.labels.severity && <span className="ml-2 opacity-60">[{a.labels.severity}]</span>}
                {a.annotations.summary && <span className="ml-2 opacity-60">— {a.annotations.summary}</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 rounded-xl border border-white/10 bg-white/5 p-1">
        {(["services", "grafana", "alerts", "loki"] as const).map((t) => (
          <button key={t} onClick={() => setActiveTab(t)}
            className={`flex-1 rounded-lg py-2 text-sm font-medium capitalize transition ${activeTab === t ? "bg-white/10 text-white" : "text-white/40 hover:text-white"}`}>
            {t === "grafana" ? "📊 Grafana" : t === "loki" ? "📝 Loki Logs" : t === "alerts" ? `🚨 Alerts${alerts.length > 0 ? ` (${alerts.length})` : ""}` : "🩺 Services"}
          </button>
        ))}
      </div>

      {/* Services tab */}
      {activeTab === "services" && (
        <>
          <div className="flex flex-wrap gap-1">
            {categories.map((cat) => (
              <button key={cat.key} onClick={() => setFilterCategory(cat.key)}
                className={`rounded-xl border px-3 py-1.5 text-xs font-medium transition ${filterCategory === cat.key ? "border-red-500/30 bg-red-500/10 text-red-300" : "border-white/10 bg-white/5 text-white/40 hover:text-white"}`}>
                {cat.label}
              </button>
            ))}
          </div>

          {loading && !health ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {[...Array(9)].map((_, i) => (
                <div key={i} className="h-24 animate-pulse rounded-2xl bg-white/5" />
              ))}
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {filteredServices.map((svc) => (
                <div key={svc.id} className={`relative rounded-2xl border p-4 transition ${
                  svc.status === "UP" ? "border-emerald-500/15 bg-emerald-500/5" :
                  svc.status === "DEGRADED" ? "border-amber-500/15 bg-amber-500/5" :
                  "border-red-500/20 bg-red-500/5"
                }`}>
                  {/* Reload overlay shimmer when refreshing */}
                  {loading && <div className="absolute inset-0 rounded-2xl bg-white/[0.02] animate-pulse" />}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xl leading-none">{svc.icon}</span>
                      <div>
                        <p className="text-sm font-semibold text-white leading-tight">{svc.name}</p>
                        <p className="text-[10px] text-white/30 capitalize">{svc.category}</p>
                      </div>
                    </div>
                    <StatusDot status={svc.status} />
                  </div>
                  <div className="mt-3 flex items-center justify-between">
                    <span className={`text-xs font-bold ${
                      svc.status === "UP" ? "text-emerald-400" :
                      svc.status === "DEGRADED" ? "text-amber-400" : "text-red-400"
                    }`}>{svc.status}</span>
                    <span className="text-xs text-white/40">{svc.responseTimeMs}ms</span>
                  </div>
                  <ResponseBar ms={svc.responseTimeMs} />
                  {svc.detail && (
                    <p className="mt-2 text-[10px] text-red-300/80 truncate">{svc.detail}</p>
                  )}
                  {svc.statusCode && (
                    <p className="text-[10px] text-white/20 mt-0.5">HTTP {svc.statusCode}</p>
                  )}
                </div>
              ))}
            </div>
          )}

          {health && (
            <p className="text-center text-xs text-white/20">
              Last checked at {new Date(health.generatedAt).toLocaleTimeString()} ·{" "}
              <span className={scoreColor}>Platform health: {health.healthScore}%</span>
            </p>
          )}
        </>
      )}

      {/* Grafana tab */}
      {activeTab === "grafana" && (
        <div className="overflow-hidden rounded-2xl border border-white/10">
          <div className="border-b border-white/5 bg-white/5 px-4 py-2 text-xs text-white/40">
            Grafana dashboards at{" "}
            <a href="https://grafana.voidcloud.cc.cd" target="_blank" rel="noopener noreferrer" className="text-cyan-300 hover:underline">
              grafana.voidcloud.cc.cd ↗
            </a>
          </div>
          <iframe
            src={`https://grafana.voidcloud.cc.cd/d/k8s_cluster/kubernetes-cluster-overview?orgId=${grafanaOrg}&refresh=30s&kiosk=tv`}
            className="h-[700px] w-full border-0 bg-slate-950"
            title="Grafana Dashboard"
            allow="fullscreen"
          />
        </div>
      )}

      {/* Alerts tab */}
      {activeTab === "alerts" && (
        <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/5">
          {alerts.length === 0 ? (
            <div className="p-12 text-center">
              <p className="text-4xl mb-3">✅</p>
              <p className="text-sm text-white/50">No active alerts — platform looks healthy</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="border-b border-white/5">
                <tr className="text-[11px] uppercase tracking-wider text-white/30">
                  <th className="px-5 py-3 text-left">Alert</th>
                  <th className="py-3">Severity</th>
                  <th className="py-3">State</th>
                  <th className="hidden py-3 md:table-cell">Namespace</th>
                  <th className="py-3">Since</th>
                </tr>
              </thead>
              <tbody>
                {alerts.map((a, i) => (
                  <tr key={i} className="border-t border-white/5 hover:bg-white/[0.03]">
                    <td className="px-5 py-3">
                      <p className="font-medium text-white">{a.labels.alertname ?? "Unknown"}</p>
                      {a.annotations.summary && <p className="text-xs text-white/40 mt-0.5">{a.annotations.summary}</p>}
                    </td>
                    <td className="py-3">
                      <span className={`rounded border px-2 py-0.5 text-xs font-medium ${
                        a.labels.severity === "critical" ? "border-red-500/30 bg-red-500/10 text-red-300" :
                        a.labels.severity === "warning" ? "border-amber-500/30 bg-amber-500/10 text-amber-300" :
                        "border-blue-500/30 bg-blue-500/10 text-blue-300"
                      }`}>{a.labels.severity ?? "info"}</span>
                    </td>
                    <td className="py-3 text-xs text-white/60">{a.state ?? "firing"}</td>
                    <td className="hidden py-3 text-xs text-white/40 md:table-cell">{a.labels.namespace ?? "—"}</td>
                    <td className="py-3 text-xs text-white/40 whitespace-nowrap">{new Date(a.activeAt).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Loki tab */}
      {activeTab === "loki" && (
        <div className="space-y-4">
          <LokiLogViewer />
        </div>
      )}
    </div>
  );
}

/* ── Loki log viewer ────────────────────────────────────────────── */
function LokiLogViewer() {
  const [query, setQuery] = useState('{namespace="voidcloud"}');
  const [logs, setLogs] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [limit, setLimit] = useState(50);
  const bottomRef = useRef<HTMLDivElement>(null);

  async function fetchLogs() {
    setLoading(true);
    try {
      const now = Date.now() * 1_000_000;
      const start = (Date.now() - 15 * 60 * 1000) * 1_000_000;
      const url = `/api/monitoring/loki/loki/api/v1/query_range?query=${encodeURIComponent(query)}&start=${start}&end=${now}&limit=${limit}&direction=backward`;
      const res = await fetch(url);
      const data = await res.json();
      const entries: string[] = [];
      for (const stream of data?.data?.result ?? []) {
        for (const [ts, line] of stream.values ?? []) {
          entries.push(`[${new Date(Number(ts) / 1_000_000).toLocaleTimeString()}] ${line}`);
        }
      }
      setLogs(entries.reverse());
    } catch { setLogs(["Error fetching logs from Loki"]); }
    finally { setLoading(false); }
  }

  useEffect(() => { fetchLogs(); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { bottomRef.current?.scrollIntoView(); }, [logs]);

  const PRESETS = [
    { label: "voidcloud", q: '{namespace="voidcloud"}' },
    { label: "auth", q: '{app="auth-service"}' },
    { label: "vps", q: '{app="vps-service"}' },
    { label: "errors only", q: '{namespace="voidcloud"} |= "error"' },
  ];

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        {PRESETS.map((p) => (
          <button key={p.label} onClick={() => { setQuery(p.q); }} className="rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white/60 hover:text-white">{p.label}</button>
        ))}
        <select value={limit} onChange={(e) => setLimit(Number(e.target.value))} className="rounded-xl border border-white/10 bg-white/5 px-2 py-1.5 text-xs text-white/60">
          {[25, 50, 100, 200].map(n => <option key={n} value={n}>{n} lines</option>)}
        </select>
      </div>
      <div className="flex gap-2">
        <input value={query} onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && fetchLogs()}
          className="flex-1 rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 font-mono text-sm text-cyan-300 outline-none focus:border-cyan-400/50"
          placeholder='{namespace="voidcloud"}'
        />
        <button onClick={fetchLogs} disabled={loading} className="rounded-xl bg-gradient-to-r from-red-500 to-orange-500 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
          {loading ? "…" : "Run"}
        </button>
      </div>
      <div className="h-[400px] overflow-y-auto rounded-2xl border border-white/10 bg-slate-950/80 p-4 font-mono text-xs">
        {logs.length === 0
          ? <p className="text-white/30">No log entries returned.</p>
          : logs.map((l, i) => (
            <div key={i} className={`leading-5 ${l.includes("error") || l.includes("Error") ? "text-red-300" : l.includes("warn") ? "text-amber-300" : "text-white/60"}`}>
              {l}
            </div>
          ))
        }
        <div ref={bottomRef} />
      </div>
    </>
  );
}

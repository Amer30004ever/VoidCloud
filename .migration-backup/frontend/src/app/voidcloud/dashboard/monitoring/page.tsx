"use client";

import { useEffect, useState, useCallback } from "react";

interface PrometheusResult {
  metric: Record<string, string>;
  value: [number, string];
}

interface MetricCard {
  title: string;
  query: string;
  unit: string;
  color: string;
}

const METRIC_CARDS: MetricCard[] = [
  { title: "CPU Usage", query: '100 - (avg by (instance) (rate(node_cpu_seconds_total{mode="idle"}[5m])) * 100)', unit: "%", color: "from-cyan-500 to-blue-600" },
  { title: "Memory Usage", query: '(1 - (node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes)) * 100', unit: "%", color: "from-violet-500 to-purple-600" },
  { title: "Disk Usage", query: '(1 - (node_filesystem_avail_bytes{mountpoint="/"} / node_filesystem_size_bytes{mountpoint="/"})) * 100', unit: "%", color: "from-fuchsia-500 to-pink-600" },
  { title: "Active Pods", query: 'count(kube_pod_status_phase{phase="Running"})', unit: "", color: "from-emerald-500 to-teal-600" },
  { title: "Network In", query: 'sum(rate(node_network_receive_bytes_total[5m])) / 1024 / 1024', unit: "MB/s", color: "from-amber-500 to-orange-600" },
  { title: "Network Out", query: 'sum(rate(node_network_transmit_bytes_total[5m])) / 1024 / 1024', unit: "MB/s", color: "from-rose-500 to-red-600" },
];

const GRAFANA_DASHBOARDS = [
  { name: "Node Exporter", uid: "rYdddlPWk" },
  { name: "Kubernetes Cluster", uid: "6581e46064c457744098" },
  { name: "Loki Logs", uid: "liz0yRCZz" },
];

const ALERT_STATES = ["active", "suppressed", "unprocessed"] as const;

interface AlertGroup {
  labels: Record<string, string>;
  annotations: Record<string, string>;
  state: string;
  startsAt: string;
}

export default function MonitoringPage() {
  const [metrics, setMetrics] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [alerts, setAlerts] = useState<AlertGroup[]>([]);
  const [alertsLoading, setAlertsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"overview" | "alerts" | "grafana" | "logs">("overview");
  const [logQuery, setLogQuery] = useState('{namespace="voidcloud"}');
  const [logs, setLogs] = useState<string[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [selectedDash, setSelectedDash] = useState(GRAFANA_DASHBOARDS[0]);

  const GRAFANA_EXTERNAL =
    typeof window !== "undefined" &&
    window.location.hostname.includes("voidcloud.cc.cd")
      ? "https://grafana.voidcloud.cc.cd"
      : null;

  const fetchMetrics = useCallback(async () => {
    setLoading(true);
    setError(null);
    const results: Record<string, string> = {};
    await Promise.allSettled(
      METRIC_CARDS.map(async (card) => {
        try {
          const res = await fetch(
            `/api/monitoring/prometheus/api/v1/query?query=${encodeURIComponent(card.query)}`
          );
          const json = await res.json();
          const data: PrometheusResult[] = json?.data?.result ?? [];
          if (data.length > 0) {
            const raw = parseFloat(data[0].value[1]);
            results[card.title] = isNaN(raw) ? "—" : raw.toFixed(card.unit === "MB/s" ? 2 : 1);
          } else {
            results[card.title] = "—";
          }
        } catch {
          results[card.title] = "—";
        }
      })
    );
    setMetrics(results);
    setLoading(false);
  }, []);

  const fetchAlerts = useCallback(async () => {
    setAlertsLoading(true);
    try {
      const res = await fetch("/api/monitoring/alertmanager/api/v2/alerts");
      if (res.ok) {
        const data = await res.json();
        setAlerts(Array.isArray(data) ? data : []);
      }
    } catch {
      setAlerts([]);
    } finally {
      setAlertsLoading(false);
    }
  }, []);

  const fetchLogs = useCallback(async () => {
    setLogsLoading(true);
    try {
      const end = Math.floor(Date.now() / 1000);
      const start = end - 3600;
      const res = await fetch(
        `/api/monitoring/loki/loki/api/v1/query_range?query=${encodeURIComponent(logQuery)}&start=${start}&end=${end}&limit=100`
      );
      const json = await res.json();
      const streams = json?.data?.result ?? [];
      const lines: string[] = [];
      for (const stream of streams) {
        for (const [ts, line] of stream.values ?? []) {
          const date = new Date(parseInt(ts) / 1e6).toLocaleTimeString();
          lines.push(`${date}  ${line}`);
        }
      }
      setLogs(lines.reverse().slice(0, 200));
    } catch {
      setLogs(["Failed to fetch logs from Loki"]);
    } finally {
      setLogsLoading(false);
    }
  }, [logQuery]);

  useEffect(() => {
    fetchMetrics();
    fetchAlerts();
    const iv = setInterval(fetchMetrics, 30_000);
    return () => clearInterval(iv);
  }, [fetchMetrics, fetchAlerts]);

  useEffect(() => {
    if (activeTab === "logs") fetchLogs();
  }, [activeTab, fetchLogs]);

  const criticalAlerts = alerts.filter((a) => a.labels?.severity === "critical");
  const warningAlerts = alerts.filter((a) => a.labels?.severity === "warning");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Monitoring</h1>
          <p className="mt-1 text-sm text-white/40">Live cluster metrics from Prometheus · Grafana · Loki</p>
        </div>
        <div className="flex items-center gap-3">
          <span className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${criticalAlerts.length > 0 ? "bg-red-500/20 text-red-400" : "bg-emerald-500/20 text-emerald-400"}`}>
            <span className={`inline-block h-1.5 w-1.5 rounded-full ${criticalAlerts.length > 0 ? "bg-red-400" : "bg-emerald-400"} animate-pulse`} />
            {criticalAlerts.length > 0 ? `${criticalAlerts.length} Critical` : "Healthy"}
          </span>
          <button
            onClick={fetchMetrics}
            className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white/60 transition hover:bg-white/10 hover:text-white"
          >
            ↻ Refresh
          </button>
        </div>
      </div>

      <div className="flex gap-1 rounded-xl border border-white/10 bg-white/5 p-1">
        {(["overview", "alerts", "grafana", "logs"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 rounded-lg py-2 text-sm font-medium capitalize transition ${activeTab === tab ? "bg-white/10 text-white" : "text-white/40 hover:text-white/70"}`}
          >
            {tab === "alerts" && (alerts.length > 0 ? `Alerts (${alerts.length})` : "Alerts")}
            {tab !== "alerts" && tab}
          </button>
        ))}
      </div>

      {activeTab === "overview" && (
        <div className="space-y-6">
          {error && (
            <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-300">
              {error} — make sure Prometheus is reachable inside the cluster.
            </div>
          )}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-6">
            {METRIC_CARDS.map((card) => (
              <div key={card.title} className="group relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-xl transition hover:border-white/20">
                <div className={`absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r ${card.color}`} />
                <p className="text-xs text-white/40">{card.title}</p>
                <p className="mt-2 text-2xl font-bold text-white">
                  {loading ? (
                    <span className="inline-block h-7 w-16 animate-pulse rounded bg-white/10" />
                  ) : (
                    <>
                      {metrics[card.title] ?? "—"}
                      {metrics[card.title] && metrics[card.title] !== "—" && (
                        <span className="ml-0.5 text-sm font-normal text-white/40">{card.unit}</span>
                      )}
                    </>
                  )}
                </p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
              <h3 className="mb-4 text-sm font-semibold text-white/70">Stack Health</h3>
              <div className="space-y-2">
                {[
                  { name: "Prometheus", url: "/api/monitoring/prometheus/-/healthy", port: "9090" },
                  { name: "Grafana", url: "/api/monitoring/grafana/api/health", port: "3000" },
                  { name: "AlertManager", url: "/api/monitoring/alertmanager/-/healthy", port: "9093" },
                  { name: "Loki", url: "/api/monitoring/loki/ready", port: "3100" },
                ].map((svc) => (
                  <ServiceHealthRow key={svc.name} name={svc.name} url={svc.url} port={svc.port} />
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
              <h3 className="mb-4 text-sm font-semibold text-white/70">Alert Summary</h3>
              {alertsLoading ? (
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => <div key={i} className="h-8 animate-pulse rounded bg-white/5" />)}
                </div>
              ) : alerts.length === 0 ? (
                <div className="flex h-24 items-center justify-center text-sm text-emerald-400">
                  ✓ No active alerts
                </div>
              ) : (
                <div className="space-y-2">
                  {[
                    { label: "Critical", count: criticalAlerts.length, color: "text-red-400 bg-red-500/10" },
                    { label: "Warning", count: warningAlerts.length, color: "text-amber-400 bg-amber-500/10" },
                    { label: "Other", count: alerts.length - criticalAlerts.length - warningAlerts.length, color: "text-blue-400 bg-blue-500/10" },
                  ].map((row) => (
                    <div key={row.label} className={`flex items-center justify-between rounded-lg px-3 py-2 ${row.color}`}>
                      <span className="text-sm">{row.label}</span>
                      <span className="text-sm font-bold">{row.count}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === "alerts" && (
        <div className="space-y-3">
          {alertsLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => <div key={i} className="h-20 animate-pulse rounded-xl bg-white/5" />)}
            </div>
          ) : alerts.length === 0 ? (
            <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-12 text-center">
              <div className="mb-2 text-3xl">✓</div>
              <p className="text-sm text-emerald-400">No active alerts — your cluster is healthy</p>
            </div>
          ) : (
            alerts.map((alert, i) => (
              <div key={i} className={`rounded-2xl border p-4 ${alert.labels?.severity === "critical" ? "border-red-500/30 bg-red-500/10" : "border-amber-500/30 bg-amber-500/10"}`}>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-semibold text-white">{alert.labels?.alertname ?? "Unknown Alert"}</p>
                    <p className="mt-1 text-sm text-white/60">{alert.annotations?.summary ?? alert.annotations?.description ?? ""}</p>
                  </div>
                  <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${alert.labels?.severity === "critical" ? "bg-red-500/20 text-red-300" : "bg-amber-500/20 text-amber-300"}`}>
                    {alert.labels?.severity ?? alert.state}
                  </span>
                </div>
                {alert.labels?.namespace && (
                  <p className="mt-2 text-xs text-white/30">namespace: {alert.labels.namespace}</p>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {activeTab === "grafana" && (
        <div className="space-y-4">
          <div className="flex gap-2 overflow-x-auto pb-1">
            {GRAFANA_DASHBOARDS.map((d) => (
              <button
                key={d.uid}
                onClick={() => setSelectedDash(d)}
                className={`shrink-0 rounded-lg px-4 py-2 text-sm font-medium transition ${selectedDash.uid === d.uid ? "bg-white/15 text-white" : "text-white/40 hover:text-white/70"}`}
              >
                {d.name}
              </button>
            ))}
          </div>
          {GRAFANA_EXTERNAL ? (
            <iframe
              src={`${GRAFANA_EXTERNAL}/d/${selectedDash.uid}?orgId=1&kiosk`}
              className="h-[70vh] w-full rounded-2xl border border-white/10"
              title={selectedDash.name}
            />
          ) : (
            <div className="rounded-2xl border border-white/10 bg-white/5 p-12 text-center">
              <div className="mb-3 text-4xl">📊</div>
              <p className="text-sm text-white/60">
                Grafana is accessible inside the cluster at{" "}
                <code className="rounded bg-white/10 px-1.5 py-0.5 text-cyan-300">
                  grafana.monitoring.svc.cluster.local:3000
                </code>
              </p>
              <p className="mt-2 text-xs text-white/30">
                Expose Grafana via Ingress (add an entry to k8s/ingress.yaml) to embed it here.
              </p>
            </div>
          )}
        </div>
      )}

      {activeTab === "logs" && (
        <div className="space-y-4">
          <div className="flex gap-2">
            <input
              value={logQuery}
              onChange={(e) => setLogQuery(e.target.value)}
              placeholder='LogQL query e.g. {namespace="voidcloud"}'
              className="flex-1 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white placeholder-white/30 outline-none focus:border-cyan-400/50 focus:ring-1 focus:ring-cyan-400/30"
            />
            <button
              onClick={fetchLogs}
              disabled={logsLoading}
              className="rounded-xl bg-gradient-to-r from-cyan-500 to-fuchsia-500 px-5 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              {logsLoading ? "Loading…" : "Run Query"}
            </button>
          </div>
          <div className="h-[55vh] overflow-y-auto rounded-2xl border border-white/10 bg-slate-950/60 p-4 font-mono text-xs">
            {logsLoading ? (
              <p className="text-white/30">Fetching logs from Loki…</p>
            ) : logs.length === 0 ? (
              <p className="text-white/30">No logs found for this query in the last hour.</p>
            ) : (
              logs.map((line, i) => (
                <div key={i} className="border-b border-white/5 py-0.5 text-white/70 hover:text-white">
                  {line}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function ServiceHealthRow({ name, url, port }: { name: string; url: string; port: string }) {
  const [status, setStatus] = useState<"checking" | "up" | "down">("checking");

  useEffect(() => {
    fetch(url, { signal: AbortSignal.timeout(5000) })
      .then((r) => setStatus(r.ok ? "up" : "down"))
      .catch(() => setStatus("down"));
  }, [url]);

  return (
    <div className="flex items-center justify-between rounded-lg border border-white/5 bg-white/5 px-3 py-2">
      <div>
        <span className="text-sm text-white">{name}</span>
        <span className="ml-2 text-xs text-white/30">:{port}</span>
      </div>
      <span className={`flex items-center gap-1.5 text-xs font-medium ${status === "up" ? "text-emerald-400" : status === "down" ? "text-red-400" : "text-white/30"}`}>
        <span className={`h-1.5 w-1.5 rounded-full ${status === "up" ? "bg-emerald-400 animate-pulse" : status === "down" ? "bg-red-400" : "bg-white/20"}`} />
        {status === "checking" ? "checking…" : status}
      </span>
    </div>
  );
}

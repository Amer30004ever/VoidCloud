"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import api from "@/lib/api";
import { statusAnalytics } from "@/lib/analytics";

type Incident = {
  id: string;
  title: string;
  description: string;
  severity: string;
  status: string;
  createdAt: string;
  resolvedAt?: string;
  updates: Array<{ id: string; message: string; status: string; createdAt: string }>;
};

type StatusData = { overall: string; incidents: Incident[] };

type Component = {
  key: string;
  label: string;
  status: "UP" | "DEGRADED" | "DOWN";
  responseTimeMs: number | null;
  lastChecked: string;
};

type ServiceStatus = {
  overall: string;
  healthPercent: number;
  components: Component[];
  checkedAt: string;
};

export default function PublicStatusPage() {
  const [data, setData] = useState<StatusData | null>(null);
  const [services, setServices] = useState<ServiceStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const attemptRef = useRef(0);

  const load = useCallback(async (trigger: "initial" | "retry") => {
    setLoading(true);
    setError(null);
    attemptRef.current += 1;
    const attempt = attemptRef.current;
    const startedAt = Date.now();
    if (trigger === "retry") statusAnalytics.retryClicked(attempt);

    const [incidentsRes, servicesRes] = await Promise.allSettled([
      api.get<StatusData>("/monitoring/incidents/public"),
      api.get<ServiceStatus>("/monitoring/status/services"),
    ]);

    const incidentsOk = incidentsRes.status === "fulfilled";
    const servicesOk = servicesRes.status === "fulfilled";

    setData(incidentsOk ? incidentsRes.value.data : null);
    setServices(servicesOk ? servicesRes.value.data : null);

    if (incidentsOk || servicesOk) {
      setLastUpdated(new Date());
      statusAnalytics.apiOutcome({
        outcome: "reachable",
        trigger,
        attempt,
        durationMs: Date.now() - startedAt,
        incidents: incidentsOk,
        services: servicesOk,
        overall: servicesOk ? servicesRes.value.data?.overall : undefined,
      });
    } else {
      setError(
        "We couldn't reach the status service. This usually means a temporary network issue.",
      );
      statusAnalytics.apiOutcome({
        outcome: "unreachable",
        trigger,
        attempt,
        durationMs: Date.now() - startedAt,
        incidents: false,
        services: false,
      });
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    void load("initial");
  }, [load]);

  const statusColor: Record<string, string> = {
    OPERATIONAL: "text-emerald-300",
    DEGRADED: "text-yellow-300",
    PARTIAL_OUTAGE: "text-orange-300",
    MAJOR_OUTAGE: "text-red-300",
  };

  const severityColor: Record<string, string> = {
    DEGRADED: "bg-yellow-500/20 text-yellow-300 border-yellow-500/30",
    PARTIAL_OUTAGE: "bg-orange-500/20 text-orange-300 border-orange-500/30",
    MAJOR_OUTAGE: "bg-red-500/20 text-red-300 border-red-500/30",
  };

  const componentDot: Record<Component["status"], string> = {
    UP: "bg-emerald-400",
    DEGRADED: "bg-yellow-400",
    DOWN: "bg-red-400",
  };

  const overall = services?.overall ?? data?.overall;

  return (
    <div className="min-h-screen vc-page text-white">
      <div className="mx-auto max-w-3xl px-4 py-16">
        <h1 className="section-title text-left">VoidCloud Status</h1>
        <p className="mt-2 text-sm text-white/60">
          Real-time platform status and incident history.
          {lastUpdated && ` Last updated ${lastUpdated.toLocaleTimeString()}.`}
        </p>

        {loading && (
          <div className="mt-8 space-y-4" data-testid="status-loading">
            <div className="h-32 animate-pulse rounded-2xl border border-white/10 bg-white/5" />
            <div className="h-24 animate-pulse rounded-2xl border border-white/10 bg-white/5" />
          </div>
        )}

        {!loading && error && (
          <div
            data-testid="status-error"
            role="alert"
            className="mt-8 rounded-2xl border border-yellow-500/30 bg-yellow-500/10 p-8 text-center backdrop-blur-xl"
          >
            <div
              className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-yellow-400/40 bg-yellow-400/10 text-xl font-bold text-yellow-300"
              aria-hidden
            >
              !
            </div>
            <h2 className="mt-3 text-lg font-semibold text-white">Status data is unavailable</h2>
            <p className="mx-auto mt-2 max-w-md text-sm text-white/60">{error}</p>
            <p className="mt-2 text-xs text-white/40">
              An unreachable status page does not necessarily mean your services are down.
            </p>
            <button
              type="button"
              data-testid="status-retry"
              onClick={() => void load("retry")}
              className="mt-5 rounded-xl bg-gradient-to-r from-cyan-400 to-fuchsia-500 px-5 py-2.5 text-sm font-semibold text-slate-950 transition hover:opacity-90"
            >
              Retry
            </button>
            <div className="mt-4 text-xs text-white/40">
              Still stuck?{" "}
              <a className="text-cyan-300 hover:underline" href="mailto:nova-cloud-2026@outlook.com">
                Contact support
              </a>
            </div>
          </div>
        )}

        {!loading && !error && (
          <>
            <div className="mt-8 rounded-2xl border border-white/10 bg-white/5 p-8 backdrop-blur-xl">
              <div className="text-center">
                <div className={`text-2xl font-bold ${statusColor[overall ?? ""] || "text-emerald-300"}`}>
                  {overall ?? "OPERATIONAL"}
                </div>
                <p className="mt-2 text-sm text-white/60">
                  {overall === "OPERATIONAL" || !overall
                    ? "All systems operational."
                    : "Some systems are experiencing issues."}
                </p>
                {services && (
                  <p className="mt-1 text-xs text-white/40">
                    {services.healthPercent}% platform health · checked{" "}
                    {new Date(services.checkedAt).toLocaleTimeString()}
                  </p>
                )}
              </div>
            </div>

            <div className="mt-10" data-testid="status-components">
              <h2 className="card-title">Components</h2>
              <div className="mt-4 space-y-2">
                {!services && (
                  <p className="text-sm text-white/50">
                    Per-service readiness is temporarily unavailable.
                  </p>
                )}
                {services?.components.map((c) => (
                  <div
                    key={c.key}
                    data-testid={`status-component-${c.key}`}
                    className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-4 py-3"
                  >
                    <div className="flex items-center gap-3">
                      <span className={`h-2.5 w-2.5 rounded-full ${componentDot[c.status]}`} aria-hidden />
                      <span className="text-sm text-white/80">{c.label}</span>
                    </div>
                    <div className="flex items-center gap-3 text-xs">
                      {c.responseTimeMs != null && (
                        <span className="text-white/40">{c.responseTimeMs} ms</span>
                      )}
                      <span
                        className={
                          c.status === "UP"
                            ? "text-emerald-300"
                            : c.status === "DEGRADED"
                            ? "text-yellow-300"
                            : "text-red-300"
                        }
                      >
                        {c.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-12">
              <h2 className="card-title">Incident History</h2>
              <div className="mt-4 space-y-4">
                {(!data || data.incidents.length === 0) && (
                  <p className="text-center text-white/50 py-8">No incidents reported.</p>
                )}
                {data?.incidents.map((incident) => (
                  <div
                    key={incident.id}
                    className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h3 className="font-semibold text-white">{incident.title}</h3>
                        <p className="mt-1 text-sm text-white/60">{incident.description}</p>
                      </div>
                      <span
                        className={`shrink-0 rounded-full border px-3 py-1 text-xs ${
                          severityColor[incident.severity] || "bg-gray-500/20 text-gray-300"
                        }`}
                      >
                        {incident.severity}
                      </span>
                    </div>

                    {incident.updates?.length > 0 && (
                      <div className="mt-4 space-y-2">
                        {incident.updates.map((update) => (
                          <div
                            key={update.id}
                            className="rounded-lg border border-white/5 bg-white/5 p-3 text-sm"
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-xs text-white/50">
                                {new Date(update.createdAt).toLocaleString()}
                              </span>
                              <span className="text-xs text-cyan-300">{update.status}</span>
                            </div>
                            <p className="mt-1 text-white/80">{update.message}</p>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="mt-3 text-xs text-white/40">
                      {new Date(incident.createdAt).toLocaleString()}{" "}
                      {incident.resolvedAt &&
                        `· Resolved ${new Date(incident.resolvedAt).toLocaleString()}`}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

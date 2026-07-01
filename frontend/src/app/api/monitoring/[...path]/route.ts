import { NextRequest, NextResponse } from "next/server";

const PROMETHEUS_URL =
  process.env.PROMETHEUS_URL ??
  "http://prometheus-operated.monitoring.svc.cluster.local:9090";

const GRAFANA_URL =
  process.env.GRAFANA_URL ??
  "http://grafana.monitoring.svc.cluster.local:3000";

const ALERTMANAGER_URL =
  process.env.ALERTMANAGER_URL ??
  "http://alertmanager-operated.monitoring.svc.cluster.local:9093";

const LOKI_URL =
  process.env.LOKI_URL ??
  "http://loki.monitoring.svc.cluster.local:3100";

function resolveBase(service: string): string {
  switch (service) {
    case "grafana": return GRAFANA_URL;
    case "alertmanager": return ALERTMANAGER_URL;
    case "loki": return LOKI_URL;
    default: return PROMETHEUS_URL;
  }
}

async function handler(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  const [service, ...rest] = path;
  const base = resolveBase(service);
  const upstream = `${base}/${rest.join("/")}${
    req.nextUrl.search ? req.nextUrl.search : ""
  }`;

  try {
    const res = await fetch(upstream, {
      method: req.method,
      headers: { "Content-Type": "application/json" },
      body: req.method !== "GET" && req.method !== "HEAD"
        ? await req.text()
        : undefined,
      signal: AbortSignal.timeout(10_000),
    });
    const text = await res.text();
    return new NextResponse(text, {
      status: res.status,
      headers: { "Content-Type": res.headers.get("Content-Type") ?? "application/json" },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { error: "Monitoring service unreachable", detail: message, upstream },
      { status: 503 }
    );
  }
}

export const GET = handler;
export const POST = handler;

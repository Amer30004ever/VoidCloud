import { NextResponse } from "next/server";

const NS = process.env.K8S_NAMESPACE ?? "voidcloud";
const CLUSTER_DOMAIN = process.env.CLUSTER_DOMAIN ?? "svc.cluster.local";

const SERVICES: Array<{
  id: string;
  name: string;
  port: number;
  path?: string;
  category: "backend" | "frontend" | "infra";
  icon: string;
}> = [
  // Backend microservices
  { id: "auth",         name: "Auth Service",         port: 3001, category: "backend",  icon: "🔐" },
  { id: "user",         name: "User Service",          port: 3002, category: "backend",  icon: "👤" },
  { id: "tenant",       name: "Tenant Service",        port: 3003, category: "backend",  icon: "🏢" },
  { id: "vps",          name: "VPS Service",           port: 3004, category: "backend",  icon: "🖥️" },
  { id: "billing",      name: "Billing Service",       port: 3005, category: "backend",  icon: "💳" },
  { id: "crm",          name: "CRM Service",           port: 3006, category: "backend",  icon: "🤝" },
  { id: "whatsapp",     name: "WhatsApp Service",      port: 3007, category: "backend",  icon: "💬" },
  { id: "email",        name: "Email Service",         port: 3008, category: "backend",  icon: "📧" },
  { id: "notification", name: "Notification Service",  port: 3009, category: "backend",  icon: "🔔" },
  { id: "monitoring",   name: "Monitoring Service",    port: 3010, category: "backend",  icon: "📡" },
  { id: "audit",        name: "Audit Service",         port: 3011, category: "backend",  icon: "📋" },
  { id: "analytics",    name: "Analytics Service",     port: 3012, category: "backend",  icon: "📈" },
  // Frontend
  { id: "frontend",     name: "Frontend (Next.js)",    port: 3000, path: "/amercloud",  category: "frontend", icon: "🌐" },
  // Infra (exposed via monitoring proxy)
  { id: "prometheus",   name: "Prometheus",            port: 9090, category: "infra",   icon: "🔥" },
  { id: "grafana",      name: "Grafana",               port: 3000, category: "infra",   icon: "📊" },
  { id: "alertmanager", name: "AlertManager",          port: 9093, category: "infra",   icon: "🚨" },
  { id: "loki",         name: "Loki",                  port: 3100, category: "infra",   icon: "📝" },
];

// Build the health URL for a service
function healthUrl(svc: typeof SERVICES[0]): string {
  if (svc.category === "infra") {
    // Hit the monitoring proxy (runs server-side so can reach cluster services)
    const infraMap: Record<string, string> = {
      prometheus:   `http://prometheus-operated.monitoring.${CLUSTER_DOMAIN}:9090/-/healthy`,
      grafana:      `http://grafana.monitoring.${CLUSTER_DOMAIN}:3000/api/health`,
      alertmanager: `http://alertmanager-operated.monitoring.${CLUSTER_DOMAIN}:9093/-/healthy`,
      loki:         `http://loki.monitoring.${CLUSTER_DOMAIN}:3100/ready`,
    };
    return infraMap[svc.id] ?? `http://${svc.id}.monitoring.${CLUSTER_DOMAIN}:${svc.port}/-/healthy`;
  }
  if (svc.id === "frontend") {
    return `http://frontend.${NS}.${CLUSTER_DOMAIN}:${svc.port}${svc.path ?? "/"}`;
  }
  const host = `${svc.id}-service.${NS}.${CLUSTER_DOMAIN}`;
  return `http://${host}:${svc.port}/health`;
}

async function pingService(svc: typeof SERVICES[0]): Promise<{
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
}> {
  const url = healthUrl(svc);
  const start = Date.now();
  try {
    const res = await fetch(url, {
      method: "GET",
      signal: AbortSignal.timeout(5_000),
      headers: { Accept: "application/json, text/plain, */*" },
    });
    const responseTimeMs = Date.now() - start;
    const status = res.ok ? "UP" : res.status >= 500 ? "DOWN" : "DEGRADED";
    return {
      id: svc.id, name: svc.name, icon: svc.icon, category: svc.category,
      status, responseTimeMs, statusCode: res.status,
      detail: res.ok ? undefined : `HTTP ${res.status}`,
      url, checkedAt: new Date().toISOString(),
    };
  } catch (err: unknown) {
    const responseTimeMs = Date.now() - start;
    const msg = err instanceof Error ? err.message : "unknown";
    const isTimeout = msg.includes("abort") || msg.includes("timeout");
    return {
      id: svc.id, name: svc.name, icon: svc.icon, category: svc.category,
      status: "DOWN", responseTimeMs,
      detail: isTimeout ? "Timeout (5s)" : `Connection refused`,
      url, checkedAt: new Date().toISOString(),
    };
  }
}

export async function GET() {
  const results = await Promise.all(SERVICES.map(pingService));

  const up = results.filter(r => r.status === "UP").length;
  const degraded = results.filter(r => r.status === "DEGRADED").length;
  const down = results.filter(r => r.status === "DOWN").length;
  const total = results.length;

  // Weight: UP=1, DEGRADED=0.5, DOWN=0
  const healthScore = Math.round(((up + degraded * 0.5) / total) * 100);

  const avgResponseMs = Math.round(
    results.filter(r => r.status === "UP").reduce((a, r) => a + r.responseTimeMs, 0) /
    Math.max(1, up)
  );

  return NextResponse.json({
    healthScore,
    summary: { up, degraded, down, total },
    avgResponseMs,
    services: results,
    generatedAt: new Date().toISOString(),
  });
}

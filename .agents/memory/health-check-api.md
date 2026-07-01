---
name: Health check API
description: Server-side health check endpoint that pings all microservices and returns status
---

`/api/health-check` (GET) — Next.js API route in `frontend/src/app/api/health-check/route.ts`.

Pings 17 endpoints in parallel (5s timeout each):
- 12 backend microservices at `http://{id}-service.{NS}.svc.cluster.local:{port}/health`
- 1 frontend (port 3000)
- 4 infra: Prometheus /-/healthy, Grafana /api/health, AlertManager /-/healthy, Loki /ready

Returns: `{ healthScore (0-100), summary { up, degraded, down, total }, avgResponseMs, services[] }`.
Score formula: `((up + degraded*0.5) / total) * 100`.

**Why:** Need a server-side check (not frontend fetch) because cluster-internal services aren't reachable from the browser.

**How to apply:** Use `K8S_NAMESPACE` env var to override namespace (default: "voidcloud"). `CLUSTER_DOMAIN` overrides cluster DNS (default: "svc.cluster.local").

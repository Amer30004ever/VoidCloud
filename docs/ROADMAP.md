# Roadmap & recommendations

Prioritized suggestions based on current codebase state (June 2026).

Legend: **P0** critical · **P1** high value · **P2** enhancement · **P3** nice-to-have

---

## Fixes & tech debt

| Priority | Item | Why |
|----------|------|-----|
| **P0** | Fix webhook route duplication (`/api/v1/api/v1/webhook`) | `@Controller('api/v1/webhook')` conflicts with global prefix — change to `@Controller('webhook')` |
| **P0** | K8s local Docker: HTTP kubeconfig errors | Allow dev-only `K8S_SKIP_TLS_VERIFY` or document HTTPS kubeconfig; dashboard shows errors without cluster |
| **P1** | Wire remaining “+” create dialogs | Several pages still use stub handlers; connect to `settings`, `projects`, `integrations` APIs |
| **P1** | Force password change UI | Backend returns `mustChangePassword`; add modal/route on first login |
| **P1** | Frontend role-based navigation | Hide admin-only settings sections for non-ADMIN users |
| **P2** | Rename “MaVoid CRM” strings in logs/bootstrap | Branding leftover in `main.ts` |
| **P2** | Align `.env.example` with `voidcloud` DB name | Was `mavoid_crm`; keep one naming convention |
| **P2** | Add backend e2e test for auth + health | CI confidence |
| **P3** | Squash or baseline Prisma migrations | Simplify fresh installs if init-db legacy DBs are gone |

---

## Features to add

### Platform hub (API exists, UI missing)

Backend `/platform/*` exposes observability links, GitOps sync, topology, capacity heatmap, multi-cluster config. **Build a `/platform` page** that consumes `frontend/src/lib/platform.ts`.

### Live logs viewer

Backend supports `GET /logs/stream/:namespace/:podName` (SSE). Add a logs page component with namespace/pod picker and streaming terminal UI.

### Real-time chat UI

`ChatGateway` exists (`joinChannel`, `sendMessage`). Wire `/collaboration/chat` to Socket.IO client with JWT auth.

### GitOps dashboard

Surface `GET /platform/gitops/status` and `POST /platform/gitops/sync` with sync history and drift indicators.

### Pipeline run details

Deployments page shows history; add drill-down to GitHub Actions logs via `/pipelines/workflows/:owner/:repo/:runId`.

### Alerting notifications

Alert rules support email/Slack flags — implement delivery via `IntegrationsModule` and test webhook path.

### Audit log viewer

Settings API returns audit logs; add filterable table in Settings with export (reuse `export.ts`).

### Multi-cluster switcher

`ClusterConfig` model + `/platform/clusters` — UI to activate cluster context for all K8s calls.

### Runbooks & incidents

`Document.isRunbook` and `incidentId` in schema — link documentation to alerts/incidents.

### Public login page metrics

Per [dashboard-feature-specification.md](dashboard-feature-specification.md): public system status and namespace cards on login (partially implemented on dashboard).

### Mobile / responsive pass

Spec marks many views as responsive; audit sidebar and tables on tablet widths.

### Observability deep links

Platform observability endpoint — configurable links to Grafana, Jaeger, Prometheus per environment.

---

## Infrastructure & DevOps

| Priority | Item |
|----------|------|
| **P1** | GitHub Actions: run `prisma migrate deploy` in deploy job before rollout |
| **P1** | Secrets: move default `JWT_SECRET` / admin password out of compose for prod |
| **P2** | Postgres backups: scheduled `pg_dump` CronJob in K8s |
| **P2** | Health probes: frontend readiness should hit `/api` proxy or static health route |
| **P3** | Helm chart for single-chart deploy instead of raw YAML |

---

## Suggested implementation order

1. Webhook path fix + K8s dev ergonomics (quick wins)
2. Platform page + logs SSE UI (high visibility)
3. Force password change + RBAC nav (security)
4. Wire all create dialogs (consistency)
5. Chat WebSocket UI (collaboration)
6. CI tests + production secrets hardening

---

## How to propose changes

1. Add or update an item in this file with priority and rationale
2. Link to a GitHub issue or PR when work starts
3. Update [docs/README.md](README.md) “Recent changes” when shipped

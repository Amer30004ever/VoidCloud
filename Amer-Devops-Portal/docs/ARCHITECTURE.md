# Void Cloud Architecture

## Current state (Phase 1 — Microservices extraction)

```
                    Cloudflare Tunnel
                           │
              ┌────────────┴────────────┐
              ▼                         ▼
        frontend:3000            Traefik Ingress
              │                         │
              │         ┌───────────────┼───────────────┐
              │         ▼               ▼               ▼
              │    auth:3001      user:3002      … analytics:3012
              │         │               │               │
              └─────────┴───────────────┴───────────────┘
                                    │
                    ┌───────────────┼───────────────┐
                    ▼               ▼               ▼
              PostgreSQL         Redis          RabbitMQ
              (single DB)      (cache/sessions)  (async events)
```

All 12 services share **one PostgreSQL database** via Prisma (`database/prisma/schema.prisma`). This is normal for an early microservices migration: you split **application boundaries** first, database boundaries later.

---

## Is the database also microservices?

**Not yet — and that is intentional for your current stage.**

| Approach | When to use | Your status |
|----------|-------------|-------------|
| **Shared database** (now) | Early migration, no production users, fast iteration | ✅ Current |
| **Database per service** | High scale, independent teams, strict isolation | 🔜 Phase 3 |
| **Read replicas** | Read-heavy workloads (analytics, CRM lists) | 🔜 Phase 2 |
| **CQRS + event store** | Complex domains, audit replay | 🔜 Phase 4 |

### Why shared DB is OK now

- No production users yet — schema changes are cheap
- One migration pipeline (`database/`) avoids 12 divergent schemas
- Services already communicate via REST + RabbitMQ events (ready to decouple data later)

### When to split databases

Split when you hit **one or more** of these:

1. **Team scale** — 3+ teams blocking each other on migrations
2. **Load** — one service (e.g. WhatsApp) dominates I/O
3. **Compliance** — tenant data must be physically isolated
4. **Deploy independence** — CRM schema change must not risk VPS billing

---

## Recommended roadmap

### Phase 2 — Production hardening (next 1–3 months)

| Item | Purpose |
|------|---------|
| **API Gateway middleware** | Rate limiting, JWT validation at Traefik |
| **Read replica** | Route analytics/reporting queries off primary |
| **Redis session store** | Centralized auth sessions across auth pods |
| **RabbitMQ event bus** | Replace direct service calls (use `shared/src/events`) |
| **Observability stack** | Prometheus + Grafana + Loki (or Datadog) |
| **Health dashboard** | `/voidcloud/admin/health` wired to all `/health` endpoints |
| **Secrets manager** | External Secrets Operator or Vault (not plain K8s secrets in git) |

### Phase 3 — Data decomposition (when you have paying tenants)

| Service | Own database | Notes |
|---------|--------------|-------|
| auth | `voidcloud_auth` | Users, tokens, 2FA |
| tenant | `voidcloud_tenant` | Tenants, RBAC |
| vps | `voidcloud_vps` | Deployments, Proxmox state |
| billing | `voidcloud_billing` | Invoices, subscriptions |
| crm | `voidcloud_crm` | Leads, deals (tenant-scoped) |
| whatsapp | `voidcloud_whatsapp` | Conversations, messages |
| audit | `voidcloud_audit` | Append-only logs (never shared) |

Use **Saga pattern** via RabbitMQ for cross-service transactions (e.g. VPS create + invoice + notification).

### Phase 4 — Multi-region & scale (large sites)

- **Tenant sharding** — route by `tenant_id` to dedicated DB/schema
- **CDN + edge** — static assets, WAF at Cloudflare
- **Proxmox multi-node** — VPS service already supports multiple nodes
- **Kubernetes HPA** — auto-scale services by CPU/RabbitMQ queue depth
- **Disaster recovery** — Postgres PITR backups to offsite storage
- **Service mesh** (optional) — Istio/Linkerd for mTLS between pods

---

## Event-driven communication (target)

```
auth ──► user.registered ──► RabbitMQ ──► email (welcome)
                                      └──► audit (log)
                                      └──► analytics (counter)

vps ──► vps.created ──► billing (usage)
                    └──► notification (WebSocket)
                    └──► whatsapp (optional alert)
```

Event names are defined in `shared/src/events/index.ts`.

---

## Security layers

1. **Edge:** Cloudflare Tunnel + WAF
2. **Ingress:** Traefik TLS + rate limit middleware
3. **Service:** JWT guards + role guards per service
4. **Tenant:** Row-level isolation via `tenant_id` + RBAC
5. **Audit:** All admin actions → audit-service

---

## CI/CD (only automated pipelines)

- **GitHub:** `.github/workflows/ci-cd.yaml`
- **GitLab:** `.gitlab-ci.yml`

No manual deploy scripts. All builds use repo-root context:

```bash
docker build -f services/auth/Dockerfile -t voidcloud/auth-service:latest .
```

---

## Folder rules

| Path | Contains |
|------|----------|
| `frontend/` | Next.js only |
| `services/*/` | One deployable microservice per folder |
| `database/` | Schema, migrations, seed — **single source of truth** |
| `shared/` | Cross-service TypeScript library |
| `kubernetes/` | YAML manifests only |
| `docs/` | Architecture, runbooks |

Do **not** add monolithic backends or manual shell deploy scripts.

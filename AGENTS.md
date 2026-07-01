# Void Cloud Agent Instructions

## Project Overview

Void Cloud is a multi-tenant VPS hosting platform with WhatsApp CRM. The codebase uses **microservices only** — there is no monolithic backend.

## Repository Layout

```
frontend/          → Next.js UI (port 3000)
services/          → NestJS microservices (ports 3001–3012)
  auth/ user/ tenant/ vps/ billing/ crm/
  whatsapp/ email/ notification/ monitoring/ audit/ analytics/
shared/            → Events, Redis, RabbitMQ helpers
database/          → Prisma schema, migrations, seed (single source of truth)
kubernetes/        → K8s YAML only — no manual scripts
docs/              → Architecture documentation
```

## Critical Rules

### NEVER add:
- Monolithic backend code
- Manual deploy scripts (`.ps1`, `.sh`) — use `.gitlab-ci.yml` or `.github/workflows/ci-cd.yaml` only
- Files in repository root except: `README.md`, `AGENTS.md`, `package.json`, `lovable.toml`, `docker-compose.yaml`, CI configs

### ALWAYS:
- Put landing components in `frontend/src/components/landing/`
- Put UI components in `frontend/src/components/ui/`
- Put new microservices in `services/<name>/`
- Use `database/prisma/schema.prisma` for all schema changes
- Run migrations from `database/` package

## Locked Files

- `frontend/src/components/landing/Integrations.tsx`
- `frontend/src/components/landing/Pricing.tsx`
- `lovable.toml`
- `AGENTS.md` (unless explicitly asked to update)

## Services & Ports

| Service | Port | Ingress path |
|---------|------|--------------|
| auth | 3001 | /api/v1/auth |
| user | 3002 | /api/v1/users |
| tenant | 3003 | /api/v1/tenants |
| vps | 3004 | /api/v1/vps |
| billing | 3005 | /api/v1/billing |
| crm | 3006 | /api/v1/crm |
| whatsapp | 3007 | /api/v1/whatsapp, /api/v1/webhooks |
| email | 3008 | /api/v1/email |
| notification | 3009 | /api/v1/notifications |
| monitoring | 3010 | /api/v1/monitoring |
| audit | 3011 | /api/v1/audit |
| analytics | 3012 | /api/v1/analytics |
| frontend | 3000 | voidcloud.cc.cd |

## Docker Build

Build from repo root:

```bash
docker build -f services/auth/Dockerfile -t voidcloud/auth-service:latest .
```

## Domains

- https://voidcloud.cc.cd
- https://api.voidcloud.cc.cd

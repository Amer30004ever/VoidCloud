# Documentation index

Central index for Amer DevOps Portal documentation.

## Getting started

| Doc | Audience | Content |
|-----|----------|---------|
| [../README.md](../README.md) | Everyone | Quick start, repo layout, commands |
| [../backend/prisma/README.md](../backend/prisma/README.md) | Backend devs | Migrations, seed, DB reset |
| [../backend/README.md](../backend/README.md) | Backend devs | API modules, local dev |
| [../frontend/README.md](../frontend/README.md) | Frontend devs | Routes, env vars, Docker build |

## Architecture & design

| Doc | Content |
|-----|---------|
| [ARCHITECTURE.md](ARCHITECTURE.md) | Components, request flow, auth, real-time |
| [dashboard-feature-specification.md](dashboard-feature-specification.md) | Detailed UI/UX spec per page |

## Deployment & operations

| Doc | Content |
|-----|---------|
| [../kubernetes/README.md](../kubernetes/README.md) | K8s + Cloudflare Tunnel production guide |
| [../kubernetes/users-management.md](../kubernetes/users-management.md) | K8s user/RBAC notes |
| [../.github/workflows/README.md](../.github/workflows/README.md) | CI/CD manual triggers |

## Planning

| Doc | Content |
|-----|---------|
| [ROADMAP.md](ROADMAP.md) | Suggested features, fixes, and priorities |

## Recent changes (2026-06)

- **Database:** Replaced legacy `init-db.sh` with **Prisma Migrate + seed** (`prisma/seed.ts`, `scripts/docker-entrypoint.sh`)
- **Docker Compose:** Backend uses image entrypoint; no custom compose `command`
- **Login fix:** Correct bcrypt seed + `NEXT_PUBLIC_API_URL` must include `/api/v1`
- **K8s:** Removed backend init-container ConfigMap; migrations run inside backend pod

If upgrading from a DB created by the old init script, reset once:

```bash
docker compose down -v && docker compose up -d --build
```

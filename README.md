# Void Cloud

Multi-tenant VPS hosting platform with WhatsApp CRM. Microservices architecture on Kubernetes.

## Production URLs

| Surface | URL |
|---------|-----|
| Web UI | https://voidcloud.cc.cd |
| API Gateway | https://api.voidcloud.cc.cd/api/v1 |

## Repository structure

```
voidcloud/
├── frontend/                 # Next.js UI (port 3000)
├── services/                 # NestJS microservices (3001–3013)
│   ├── auth/                 # JWT, login, 2
│   │    ├── dist/
│   │    ├── src/
│   │    ├── Dockerfile
│   ├── user/                 # User CRUD
│   ├── tenant/               # Multi-tenant isolation
│   ├── vps/                  # Proxmox provisioning
│   ├── billing/              # Plans, invoices, subscriptions
│   ├── crm/                  # Leads, deals, customers
│   ├── whatsapp/             # Webhooks & messaging
│   ├── email/                # SMTP transactional email
│   ├── notification/         # Real-time notifications
│   ├── monitoring/           # Cluster health
│   ├── audit/                # Activity logs
│   ├── analytics/            # Usage & revenue reports
│   └── sub2api/              # Subscription management API
├── shared/                   # Shared events, Redis, RabbitMQ helpers
├── database/                 # Single Prisma schema, migrations, seed
├── kubernetes/               # K8s manifests only (no manual scripts)
│   ├── frontend
│   ├── openwa
├── docs/                     # Architecture & runbooks
│   ├── ARCHITECTURE.md
│   ├── dashboard-feature-specification.md
│   ├── SMTP-SETUP.md
├── .github/workflows/        # GitHub Actions CI/CD
├── docker-compose.yaml
└── .gitlab-ci.yml            # GitLab CI/CD
```

## Package manager: pnpm only

> **This workspace uses pnpm exclusively. Never run `npm install` (or `npm ci`)
> anywhere in this repo — not at the root, and not inside `frontend/`,
> `services/*`, `lib/*`, `database/`, or `tests/`.**

Running npm in any folder rewrites `node_modules` with a flat, non-workspace
layout, drops the `@workspace/*` links, and breaks the Next.js CLI resolution.
Every recurring "Cannot find module 'next'" / "Module not found" incident in
this repo has had the same root cause: a session or tool defaulting to npm.
It is not caused by any single config file, and no config fix will prevent it —
only using pnpm will.

```bash
pnpm install            # always from the repo root
pnpm --filter <pkg> add <dep>   # add a dependency to one workspace package
```

Do not commit `package-lock.json`. If one appears, delete it, remove the
affected `node_modules`, and re-run `pnpm install` at the root.

## Local development

```bash
# Infrastructure
docker compose up -d postgres redis rabbitmq

# Install once, from the repo root (never npm)
pnpm install

# Run a service (example: auth)
pnpm --filter auth build && pnpm --filter auth start

# Frontend
pnpm --filter frontend dev
```

Set `NEXT_PUBLIC_API_URL=https://api.voidcloud.cc.cd/api/v1` for production builds.

## Deploy

CI/CD builds all service images from repo root and applies `kubernetes/` manifests.

**GitLab:** push to `main` → `.gitlab-ci.yml`  
**GitHub:** push to `main` → `.github/workflows/ci-cd.yaml`

Required secrets: `DOCKER_HUB_USERNAME`, `DOCKER_HUB_TOKEN`, `KUBECONFIG` (or `KUBECONFIG_B64` on GitLab).

## Database migrations

```bash
cd database
npm ci
DATABASE_URL=postgresql://... npm run migrate:deploy
DATABASE_URL=postgresql://... npm run seed
```

Or apply `kubernetes/migrate-job.yaml` after deploy.

## Documentation

- [Architecture & scaling roadmap](docs/ARCHITECTURE.md)

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
│   ├── auth/                 # JWT, login, 2FA
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
├── docs/                     # Architecture & runbooks
├── .github/workflows/        # GitHub Actions CI/CD
└── .gitlab-ci.yml            # GitLab CI/CD
```

## Local development

```bash
# Infrastructure
docker compose up -d postgres redis rabbitmq

# Run a service (example: auth)
cd services/auth && npm ci && npm run build && npm start

# Frontend
cd frontend && npm ci && npm run dev
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

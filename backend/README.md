# Amer DevOps Portal — Backend

NestJS REST API and WebSocket server for the Amer DevOps Portal.

## Stack

- **NestJS 11** — modules, guards, Swagger
- **Prisma 7** — PostgreSQL ORM with `@prisma/adapter-pg`
- **Passport JWT** — global auth; use `@Public()` to opt out
- **Socket.IO** — metrics (`/metrics`) and chat (`/chat`) gateways
- **@kubernetes/client-node** — cluster operations (optional; requires valid kubeconfig)

## Quick start

### With Docker (recommended)

From repo root:

```bash
docker compose up -d --build backend
```

The container entrypoint (`scripts/docker-entrypoint.sh`) waits for Postgres, runs migrations, seeds the admin user, then starts the API.

### Local development

```bash
cd backend
npm install
cp ../.env.example ../.env
# Set DATABASE_URL to your local Postgres

npm run db:setup      # migrate + seed
npm run start:dev     # watch mode on :3001
```

## Scripts

| Script | Description |
|--------|-------------|
| `npm run start:dev` | Dev server with hot reload |
| `npm run start:prod` | Run compiled `dist/main.js` |
| `npm run build` | TypeScript compile |
| `npm run db:migrate` | `prisma migrate deploy` |
| `npm run db:seed` | Seed admin user |
| `npm run db:setup` | Migrate + seed |
| `npm run prisma:generate` | Regenerate Prisma client |

## API

| Resource | Base path |
|----------|-----------|
| Health | `GET /api/v1/health` |
| Auth | `/api/v1/auth/*` |
| Dashboard & stats | `/api/v1/dashboard/*`, `/api/v1/stats/*` |
| Infrastructure | `/api/v1/infrastructure/*` |
| Cluster | `/api/v1/cluster/*` |
| Logs | `/api/v1/logs/*` (includes SSE stream) |
| Alerts | `/api/v1/alerts/*` |
| GitHub | `/api/v1/github/*` |
| Pipelines | `/api/v1/pipelines/*` |
| Projects | `/api/v1/projects/*` |
| Platform | `/api/v1/platform/*` |
| Settings | `/api/v1/settings/*` |
| Security | `/api/v1/security/*` |
| Learning | `/api/v1/learning/*` |
| Collaboration | `/api/v1/collaboration/*` |
| Integrations | `/api/v1/integrations/*` |

Interactive docs: http://localhost:3001/api/docs

## Authentication

- Global `JwtAuthGuard` — all routes require JWT unless marked `@Public()`
- Global `RolesGuard` — restrict with `@Roles(Role.ADMIN)`
- Login: `POST /api/v1/auth/login` with `{ email, password }`
- Default seed user: see [prisma/README.md](prisma/README.md)

## Database

Schema: `prisma/schema.prisma`  
Migrations: `prisma/migrations/`  
Seed: `prisma/seed.ts`

Do **not** hand-edit production schema with raw SQL. Add a Prisma migration:

```bash
npx prisma migrate dev --name describe_your_change
```

## Docker image

Built from `Dockerfile` (multi-stage):

1. **Builder** — `npm ci`, `prisma generate`, `tsc`
2. **Runner** — production deps, `dist/`, `prisma/`, entrypoint script

Default `CMD`: `sh /app/scripts/docker-entrypoint.sh`

## Kubernetes integration

When `~/.kube/config` is mounted (Docker Compose) or in-cluster RBAC is configured (K8s), the backend can list pods, deployments, namespaces, etc.

If you see `HTTP protocol is not allowed when skipTLSVerify is not set`, your kubeconfig points at an HTTP API server. Use HTTPS or set `insecure-skip-tls-verify: true` on that cluster entry for local/dev clusters only.

## Proxmox VPS Integration

The backend includes Proxmox VPS provisioning capabilities for the AmerCloud customer portal.

### Required Environment Variables

| Variable | Required | Default | Purpose |
|----------|----------|---------|---------|
| `PROXMOX_HOST` | Yes | - | Proxmox server URL (e.g., `https://10.51.100.10:8006`) |
| `PROXMOX_TOKEN_ID` | Yes | - | API token ID (format: `username@realm!tokenid`) |
| `PROXMOX_TOKEN_SECRET` | Yes | - | API token secret |
| `PROXMOX_NODE` | No | `workernode01` | Target Proxmox node |
| `PROXMOX_STORAGE` | No | `local-lvm` | Storage name for VPS disks |
| `PROXMOX_BRIDGE` | No | `vmbr0` | Network bridge for VPS networking |
| `PROXMOX_TEMPLATE` | No | `ubuntu-22.04` | Default template for VPS creation |
| `PROXMOX_IP_POOL_CIDR` | No | `10.51.100.0/24` | IP pool for VPS allocation |
| `PROXMOX_GATEWAY` | No | `10.51.100.1` | Gateway IP for VPS network |

### Setting Up Proxmox API Tokens

1. Log in to Proxmox web UI
2. Go to Datacenter → Permissions → API Tokens
3. Create a new token or use existing one
4. Copy the Token ID and Secret
5. Add to Kubernetes secrets or environment variables

### Current Status

✅ Proxmox integration configured with:
- Host: `https://10.51.100.10:8006`
- Node: `workernode01`
- Storage: `local-lvm`
- Bridge: `vmbr0`
- Template: `ubuntu-22.04`
- IP Pool: `10.51.100.0/24`
- Gateway: `10.51.100.1`

## Project structure

```
backend/
├── prisma/           Schema, migrations, seed
├── scripts/          docker-entrypoint.sh
├── src/
│   ├── auth/
│   ├── dashboard/
│   ├── infrastructure/
│   ├── platform/
│   ├── settings/
│   └── ...
└── Dockerfile
```

## Tests

```bash
npm run test
npm run test:e2e
```

## Maintenance & Status

Models: `Maintenance`, `Incident`, `IncidentUpdate` (see `prisma/schema.prisma`).
Service: `src/cloud/maintenance/maintenance.service.ts`.
Middleware: `src/cloud/maintenance/maintenance.middleware.ts` — blocks non-admin
traffic with `503` + `Retry-After` while an active window exists; status,
auth and admin routes are allowlisted.

Endpoints:

```
GET    /api/v1/status
GET    /api/v1/status/incidents
GET    /api/v1/cloud/admin/maintenance?upcoming=true
POST   /api/v1/cloud/admin/maintenance
PUT    /api/v1/cloud/admin/maintenance/:id
DELETE /api/v1/cloud/admin/maintenance/:id
GET    /api/v1/cloud/admin/incidents
POST   /api/v1/cloud/admin/incidents
POST   /api/v1/cloud/admin/incidents/:id/updates
PUT    /api/v1/cloud/admin/incidents/:id/resolve
```

## Security & Backup add-ons

- `VpsSecuritySettings` model (Prisma) + `VpsSecurityService` + `CloudVpsSecurityController`.
- `BackupSchedule` gains `offsiteProvider`, `offsiteBucket`, `offsiteAccessKey`, `offsiteSecretKey`.
- Migration: `20260622000000_vps_security_backup_offsite`.

## Developer Tools & Scalability endpoints (stubbed)

All endpoints are JWT-protected. Storage is in-memory pending Prisma models.

- `GET/PUT /cloud/vps/:vpsId/cicd` — read/update GitHub/GitLab + webhook config
- `POST /cloud/vps/:vpsId/cicd/webhook/regenerate` — rotate token + secret
- `POST /cloud/vps/:vpsId/clone` — body `{ suffix, syncData }`; returns clone job
- `GET /cloud/databases/plans` — pricing for managed DBs
- `GET/POST /cloud/databases` and `GET/PUT/DELETE /cloud/databases/:id` — managed PostgreSQL/MySQL/Redis CRUD
- `GET /cloud/databases/:id/backups` — backup list (stub)
- `GET/POST /cloud/load-balancers` and `PUT/DELETE /cloud/load-balancers/:id` — load balancer CRUD ($5/mo)

Public webhook endpoint `/api/public/deploy/:webhookToken` is generated client-side but not yet implemented; add a TanStack server route or NestJS public controller in a follow-up.

## Enterprise endpoints

- `GET/PUT /cloud/enterprise` — feature flags (SOC2, HIPAA, SLA, VPC, dedicated HW, branding)
- `GET /cloud/enterprise/soc2/report` — generate compliance report snapshot
- `GET/POST/DELETE /cloud/enterprise/team[/:id]` — team members
- `GET/PUT /cloud/enterprise/reseller` — white-label config
- `GET/POST/DELETE /cloud/enterprise/api-keys[/:id]` — automation API keys
- `POST /cloud/enterprise/bulk-provision` — bulk VPS provisioning job

Stubs live in `src/cloud/enterprise/enterprise.controller.ts` (in-memory). Replace with Prisma + Proxmox bulk provisioning when wiring real backend.

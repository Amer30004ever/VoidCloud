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

# Amer DevOps Portal

A self-hosted, full-stack **DevOps control plane** and **personal productivity hub** — combining Kubernetes operations, CI/CD pipelines, monitoring, security, learning, team collaboration, and 50+ productivity tools into a single web application.

Built with **NestJS 11**, **Next.js 16**, **PostgreSQL 15**, **Prisma 7**, and deployed on **Kubernetes** behind a **Cloudflare Tunnel**.

---

## Table of Contents

1. [Surfaces & URLs](#surfaces--urls)
2. [Quick Start (Docker)](#quick-start-docker)
3. [Repository Layout](#repository-layout)
4. [Tech Stack](#tech-stack)
5. [Architecture](#architecture)
6. [Backend (NestJS API)](#backend-nestjs-api)
7. [Frontend (Next.js App)](#frontend-nextjs-app)
8. [Database (PostgreSQL + Prisma)](#database-postgresql--prisma)
9. [Authentication & Security](#authentication--security)
10. [Real-Time (WebSockets)](#real-time-websockets)
11. [Integrations](#integrations)
12. [Environment Variables](#environment-variables)
13. [Local Development](#local-development)
14. [Production Deployment (K8s + Cloudflare)](#production-deployment-k8s--cloudflare)
15. [CI/CD](#cicd)
16. [Documentation Index](#documentation-index)

---

## Surfaces & URLs

| Surface       | Local                                   | Production                                |
|---------------|-----------------------------------------|-------------------------------------------|
| Web UI        | http://localhost:3000                   | https://amer-portal.cc.cd                 |
| REST API      | http://localhost:3001/api/v1            | https://api.amer-portal.cc.cd/api/v1      |
| Swagger Docs  | http://localhost:3001/api/docs          | https://api.amer-portal.cc.cd/api/docs    |
| Health Check  | http://localhost:3001/api/v1/health     | https://api.amer-portal.cc.cd/api/v1/health |
| WebSocket     | ws://localhost:3001                     | wss://api.amer-portal.cc.cd               |
| WhatsApp Hook | http://localhost:3001/api/v1/webhook    | https://api.amer-portal.cc.cd/api/v1/webhook |

---

## Quick Start (Docker)

**Requirements:** Docker 24+, Docker Compose v2, 4 GB free RAM.

```bash
git clone https://github.com/Amer30004ever/Amer-Devops-Poral.git
cd Amer-Devops-Poral
docker compose up -d --build
```

Open http://localhost:3000 and sign in:

| Field    | Default          |
|----------|------------------|
| Email    | `admin@amer.dev` |
| Password | `AmerDevOps2026!` |

Override with `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `ADMIN_NAME` env vars.

**Reset everything (DB + volumes):**

```bash
docker compose down -v && docker compose up -d --build
```

---

## Repository Layout

```
Amer-Devops-Poral/
├── backend/                NestJS API (REST + WebSocket + Prisma)
│   ├── src/
│   │   ├── auth/           JWT login, roles, password reset
│   │   ├── alerts/         Cluster alert rules & evaluation
│   │   ├── automation/     Scripts, workflow templates
│   │   ├── cluster/        Kubernetes cluster info
│   │   ├── collaboration/  Channels, chat, knowledge base, code reviews
│   │   ├── dashboard/      Aggregated stats for home page
│   │   ├── documentation/  Docs, categories, tags, versions, collaborators
│   │   ├── github/         GitHub repos, branches, workflows
│   │   ├── infrastructure/ Namespaces, deployments, services, configmaps
│   │   ├── integrations/   3rd-party connectors
│   │   ├── kubernetes/     K8s client wrapper
│   │   ├── learning/       Jobs, paths, certs, CVs, books, conferences
│   │   ├── logs/           Pod logs (REST + SSE stream)
│   │   ├── metrics/        Prometheus-style metrics
│   │   ├── notes/          Markdown notes + tags + pin + search
│   │   ├── pipelines/      CI/CD pipeline history & rollback
│   │   ├── platform/       Observability links, GitOps, topology
│   │   ├── projects/       Project registry
│   │   ├── prisma/         Prisma module/service
│   │   ├── security/       Vulnerability scans, encrypted secrets
│   │   ├── settings/       Users, roles, API keys, audit log, backups
│   │   ├── stats/          Live counters via WebSocket
│   │   └── webhook/        WhatsApp + GitHub inbound webhooks
│   └── prisma/             schema.prisma (42 models) + migrations + seed
├── frontend/               Next.js 16 (App Router)
│   └── src/app/            53+ route pages (see Frontend section)
├── kubernetes/             Production manifests
│   ├── backend/            Backend deployment + service
│   ├── frontend/           Frontend deployment + service
│   ├── postgres/           StatefulSet + PVC
│   ├── cert-manager/       TLS automation
│   ├── ingress.yaml        Traefik ingress
│   ├── ingress-tls.yaml    HTTPS ingress
│   ├── traefik-middlewares.yaml
│   ├── namespace.yaml
│   ├── configmaps.yaml
│   ├── cloudflare-tunnel-config.yaml
│   └── *.ps1 / *.sh        Build/deploy automation
├── docs/                   Architecture, roadmap, feature specs
├── .github/workflows/      ci.yaml, ci-cd.yaml, deploy.yaml
├── docker-compose.yaml     Local dev stack
├── docker-compose.prod.yaml  Production compose (alternative to K8s)
└── setup.sh                Bootstrap script
```

---

## Tech Stack

| Layer            | Technology                                                              |
|------------------|-------------------------------------------------------------------------|
| Frontend         | Next.js 16, React 19, TypeScript, Tailwind CSS, Socket.IO client        |
| Backend          | NestJS 11, Express, Passport JWT, Socket.IO, Class Validator            |
| ORM              | Prisma 7 (Migrate + Client + Seed)                                      |
| Database         | PostgreSQL 15                                                           |
| Auth             | JWT (HS256), bcrypt password hashing, role-based guards                 |
| Real-time        | Socket.IO (cluster stats, chat, logs, alerts), Server-Sent Events       |
| Container        | Docker (multi-stage), Docker Compose                                    |
| Orchestration    | Kubernetes (Deployments, StatefulSet, Services, Ingress, ConfigMaps)    |
| TLS / Cert Mgmt  | cert-manager + Let's Encrypt                                            |
| Public Access    | Cloudflare Tunnel (zero-trust ingress, no open ports)                   |
| Reverse Proxy    | Traefik (in-cluster ingress controller)                                 |
| CI/CD            | GitHub Actions → Docker Hub → kubectl rollout                           |
| Integrations     | Kubernetes API, GitHub REST API, WhatsApp Cloud API, Prometheus         |

---

## Architecture

```
                 ┌─────────────────────┐
   Internet ───► │  Cloudflare Tunnel  │  (zero open ports)
                 └──────────┬──────────┘
                            │
                  ┌─────────▼──────────┐
                  │  Traefik Ingress   │  (TLS via cert-manager)
                  └─────┬──────────┬───┘
                        │          │
        ┌───────────────▼─┐   ┌────▼──────────────┐
        │ Frontend (Next) │   │ Backend (NestJS)  │
        │  port 3000      │   │  port 3001        │
        └─────────────────┘   └────┬─────┬────────┘
                                   │     │
                  ┌────────────────▼┐   ┌▼────────────┐
                  │ PostgreSQL 15   │   │ Kubernetes  │
                  │  (Prisma)       │   │  API server │
                  └─────────────────┘   └─────────────┘
                                        ┌─────────────┐
                                        │ GitHub API  │
                                        ├─────────────┤
                                        │ WhatsApp    │
                                        └─────────────┘
```

Full design: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

---

## Backend (NestJS API)

**Base URL:** `/api/v1` · **Total endpoints:** ~238 across 20 modules · **Swagger:** `/api/docs`

### Modules & route prefixes

| Module            | Prefix              | Responsibility |
|-------------------|---------------------|----------------|
| `auth`            | `/auth`             | Login, profile, password reset, JWT issuance |
| `alerts`          | `/alerts`           | Alert rules, triggered alerts, ack/resolve |
| `automation`      | `/automation`       | Reusable scripts, workflow templates |
| `cluster`         | `/cluster`          | Cluster info, version, nodes, capacity |
| `collaboration`   | `/collaboration`    | Channels, chat messages, knowledge articles, code reviews, calendar |
| `dashboard`       | `/dashboard`        | Aggregated home-page metrics |
| `documentation`   | `/documentation`    | Docs, categories, tags, versioning, collaborators |
| `github`          | `/github`           | Repo list, branches, workflow runs, dispatch |
| `infrastructure`  | `/infrastructure`   | Namespaces, deployments, pods, services, configmaps, secrets |
| `integrations`    | `/integrations`     | Connector registry (Slack, Jira, etc.) |
| `learning`        | `/learning`         | Saved jobs, paths, modules, certs, CVs, books, conferences, blog |
| `logs`            | `/logs`             | Pod log query, SSE stream, search |
| `notes`           | `/notes`            | Markdown notes CRUD + tags + pin + full-text search |
| `pipelines`       | `/pipelines`        | Deployment history, rollback, manual trigger |
| `platform`        | `/platform`         | Observability targets, GitOps state, topology |
| `projects`        | `/projects`         | Project registry |
| `security`        | `/security`         | Vulnerability scans, encrypted app secrets |
| `settings`        | `/settings`         | Users, roles, API keys, audit log, backups |
| `stats`           | `/stats`            | Live counters (WebSocket-backed) |
| `webhook`         | `/webhook`          | WhatsApp + GitHub inbound webhooks (signature-verified) |

### Common endpoints (examples)

```http
POST   /api/v1/auth/login              { email, password } → { token, user }
GET    /api/v1/auth/profile            (Bearer JWT)        → User
POST   /api/v1/auth/change-password
GET    /api/v1/dashboard               → aggregated stats
GET    /api/v1/cluster/info            → cluster version, node count
GET    /api/v1/infrastructure/namespaces
GET    /api/v1/infrastructure/deployments?namespace=default
GET    /api/v1/logs/pods/:name?namespace=default&tail=200
GET    /api/v1/logs/pods/:name/stream  (Server-Sent Events)
GET    /api/v1/notes?tag=ops&pinned=true
POST   /api/v1/notes                   { title, content, tags[], pinned }
GET    /api/v1/github/repos
POST   /api/v1/pipelines/:id/rollback
POST   /api/v1/webhook/whatsapp        (verify-token query)
GET    /api/v1/health                  → { status: "ok" }
```

Generate the full live list at `/api/docs` (Swagger UI).

---

## Frontend (Next.js App)

**Framework:** Next.js 16 App Router · **Pages:** 53+ top-level routes

### Operations & infrastructure
`/dashboard` · `/cluster` · `/infrastructure` · `/deployments` · `/monitoring` · `/logs` · `/pipelines` · `/automation` · `/github` · `/projects` · `/integrations` · `/platform`

### Reliability & SRE
`/incidents` · `/oncall` · `/runbooks` · `/uptime` · `/sla` · `/ssl-monitor` · `/dns` · `/backups` · `/disaster-recovery` · `/status` · `/inventory` · `/lab-environments` · `/cost`

### Security
`/security` · `/security/audit-log` · `/security/sbom`

### Productivity (personal "second brain")
`/notes` · `/bookmarks` · `/snippets` · `/calendar` · `/timeline` · `/pomodoro` · `/favorites` · `/prompts` · `/inbox` · `/notifications`

### Learning & Career
`/learning` · `/flashcards` · `/quizzes` · `/glossary` · `/interview-prep` · `/job-tracker` · `/skills-matrix` · `/cv-studio` · `/portfolio`

### Collaboration & content
`/collaboration` · `/team` · `/documentation` · `/announcements` · `/changelog`

### Account
`/login` · `/settings`

### Global UI features
- **Command Palette** (`Cmd/Ctrl+K`) — jump to any page / run any action
- **Keyboard Shortcuts** (`?` to open) — Vim-style `g + key` navigation
- **PWA manifest** — installable, dark theme by default
- **Toast notifications** + real-time updates via Socket.IO
- **Favorites & pinning** across all sections (localStorage)

---

## Database (PostgreSQL + Prisma)

**Engine:** PostgreSQL 15 · **ORM:** Prisma 7 · **Models:** 42

### Schema groups

| Group            | Models |
|------------------|--------|
| Identity & audit | `User`, `ApiKey`, `AuditLog`, `AppSecret`, `ClusterConfig` |
| Messaging        | `Conversation`, `Message`, `WhatsappContact`, `WebhookLog`, `Webhook` |
| Cluster ops      | `AlertRule`, `Alert`, `DeploymentHistory`, `Project` |
| Documentation    | `Document`, `DocumentCategory`, `DocumentTag`, `DocumentVersion`, `DocumentCollaborator` |
| Learning         | `SavedJob`, `LearningPath`, `LearningModule`, `LearningResource`, `PathEnrollment`, `PathProgress`, `Certification`, `CertificationTracker`, `CV`, `CVSection`, `CVTemplate`, `Conference`, `ConferenceInterest`, `Book`, `BookTracker`, `BlogPost` |
| Automation       | `Script`, `WorkflowTemplate` |
| Collaboration    | `Channel`, `KnowledgeArticle`, `CodeReview`, `CalendarEvent` |
| Personal         | `Note` |

### Lifecycle on container start

1. `prisma migrate deploy` — apply pending migrations
2. `prisma db seed` — create admin user from env vars
3. `node dist/main.js` — boot the NestJS server

### Manual commands

```bash
cd backend
npx prisma migrate dev --name <change>   # create + apply a new migration
npx prisma studio                         # open visual DB browser
npx prisma generate                       # regenerate client after schema edits
npm run db:setup                          # migrate + seed (local non-Docker)
```

See [backend/prisma/README.md](backend/prisma/README.md) for the full migration playbook.

---

## Authentication & Security

- **JWT** issued at `POST /api/v1/auth/login`, signed with `JWT_SECRET` (HS256), default TTL `7d`.
- Send on subsequent requests: `Authorization: Bearer <token>`.
- **Passwords** hashed with bcrypt (cost 10).
- **Role-based access** via NestJS guards: `USER`, `ADMIN`, `AGENT`.
- **Forced password change** flag (`mustChangePassword`) for seeded/new accounts.
- **Webhook signatures** verified with `WEBHOOK_SECRET` (HMAC-SHA256, timing-safe compare).
- **App secrets** stored encrypted at rest in the `AppSecret` table.
- **Audit log** records every privileged settings change (`AuditLog` model).
- **API keys** (`ApiKey`) for machine-to-machine access, scoped & revocable.

---

## Real-Time (WebSockets)

The backend runs a Socket.IO gateway on the same port as the REST API (`3001`).

| Namespace / Event       | Payload                          | Used by                  |
|-------------------------|----------------------------------|--------------------------|
| `stats:update`          | `{ cpu, mem, pods, deploys }`    | `/dashboard`             |
| `alert:new`             | `Alert`                          | `/incidents`, `/alerts`  |
| `chat:message`          | `Message`                        | `/collaboration`         |
| `log:line`              | `{ pod, line, ts }`              | `/logs` (SSE alternative)|

Frontend client config in `frontend/src/lib/socket-auth.ts` (auto-attaches Bearer token via auth handshake).

---

## Integrations

| Service         | Purpose                                     | Env vars |
|-----------------|---------------------------------------------|----------|
| Kubernetes API  | Cluster/namespace/deployment management     | `KUBECONFIG`, `K8S_INSECURE_SKIP_TLS_VERIFY` |
| GitHub REST API | Repo list, branches, workflow dispatch      | `GITHUB_TOKEN` |
| WhatsApp Cloud  | Inbound messages → conversations            | `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_WABA_ID`, `WHATSAPP_VERIFY_TOKEN` |
| Prometheus      | Metrics scraping (optional)                 | `PROMETHEUS_URL` |
| Docker Hub      | CI image push target                        | `DOCKER_HUB_USERNAME`, `DOCKER_HUB_REPO` |

---

## Environment Variables

Copy `.env.example` to `.env` at the repo root.

| Variable                       | Required | Purpose |
|--------------------------------|----------|---------|
| `DATABASE_URL`                 | Yes      | PostgreSQL connection string |
| `POSTGRES_USER` / `_PASSWORD` / `_DB` | Yes | Used by the compose Postgres service |
| `JWT_SECRET`                   | Yes      | Token signing key (≥32 chars in prod) |
| `JWT_EXPIRES_IN`               | No       | Default `7d` |
| `NEXT_PUBLIC_API_URL`          | Yes      | Frontend → API base. **Must include `/api/v1`** |
| `FRONTEND_URL` / `BACKEND_URL` | Yes      | CORS + redirect URLs |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` / `ADMIN_NAME` | No | Seed admin |
| `WHATSAPP_*`                   | Optional | WhatsApp Cloud API credentials |
| `WEBHOOK_SECRET`               | Optional | Inbound webhook HMAC verification |
| `GITHUB_TOKEN`                 | Optional | GitHub REST API access |
| `K8S_INSECURE_SKIP_TLS_VERIFY` | Dev only | Skip K8s API TLS verification |
| `NODE_ENV`                     | Yes      | `development` \| `production` |
| `PROXMOX_HOST`                 | Optional | Proxmox server URL for VPS provisioning |
| `PROXMOX_TOKEN_ID`             | Optional | Proxmox API token ID (format: `username@realm!tokenid`) |
| `PROXMOX_TOKEN_SECRET`         | Optional | Proxmox API token secret |
| `PROXMOX_NODE`                 | Optional | Proxmox target node (default: `workernode01`) |
| `PROXMOX_STORAGE`              | Optional | Proxmox storage name (default: `local-lvm`) |
| `PROXMOX_BRIDGE`               | Optional | Proxmox network bridge (default: `vmbr0`) |
| `PROXMOX_TEMPLATE`             | Optional | Proxmox template name (default: `ubuntu-22.04`) |
| `PROXMOX_IP_POOL_CIDR`         | Optional | IP pool CIDR for VPS allocation (default: `10.51.100.0/24`) |
| `PROXMOX_GATEWAY`              | Optional | Gateway IP for VPS network (default: `10.51.100.1`) |
| `SMTP_HOST`                    | Optional | SMTP server host (default: `smtp.office365.com`) |
| `SMTP_PORT`                    | Optional | SMTP server port (default: `587`) |
| `SMTP_USER`                    | Optional | SMTP authentication username |
| `SMTP_PASS`                    | Optional | SMTP authentication password (app password for Office365) |
| `EMAIL_FROM`                   | Optional | From email address for notifications |

Full reference: [.env.example](.env.example).

---

## Local Development

### Full stack via Docker (recommended)

```bash
docker compose up -d --build
docker compose logs -f backend
```

### Backend only

```bash
cd backend
npm install
npm run db:setup       # migrate + seed
npm run start:dev      # watch mode on :3001
```

### Frontend only

```bash
cd frontend
npm install
npm run dev            # :3000
```

### Smoke tests

```bash
curl http://localhost:3001/api/v1/health
curl -X POST http://localhost:3001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@amer.dev","password":"AmerDevOps2026!"}'
```

---

## Production Deployment (K8s + Cloudflare)

The cluster runs **on Proxmox + k3s/Talos** (your choice), exposed to the internet through a **Cloudflare Tunnel** so no inbound ports are opened.

### Layers

1. **Namespace:** `amer-portal` (`kubernetes/namespace.yaml`)
2. **Database:** Postgres `StatefulSet` + `PersistentVolumeClaim` (`kubernetes/postgres/`)
3. **Backend:** `Deployment` + `Service` (`kubernetes/backend/`)
4. **Frontend:** `Deployment` + `Service` (`kubernetes/frontend/`)
5. **Ingress:** Traefik (`ingress.yaml` HTTP, `ingress-tls.yaml` HTTPS) with custom middlewares (`traefik-middlewares.yaml`)
6. **TLS:** cert-manager + Let's Encrypt (`kubernetes/cert-manager/`)
7. **Public access:** `cloudflared` DaemonSet using `cloudflare-tunnel-config.yaml`

### Deploy

```bash
# From repo root
./kubernetes/build-and-deploy.ps1            # Windows
./kubernetes/build-only.sh && ./kubernetes/push-only.sh   # Linux
kubectl apply -f kubernetes/
kubectl -n amer-portal rollout status deploy/backend
kubectl -n amer-portal rollout status deploy/frontend
```

### Cloudflare Tunnel

- Tunnel config: `kubernetes/cloudflare-tunnel-config.yaml`
- Hostname routing:
  - `amer-portal.cc.cd` → `frontend:3000`
  - `api.amer-portal.cc.cd` → `backend:3001`
- Setup script: `kubernetes/setup-tunnel-fresh-final.ps1`
- Linux guide: `kubernetes/cloudflare-linux.md`

Full deploy guide: [kubernetes/README.md](kubernetes/README.md).

---

## CI/CD

GitHub Actions workflows live in `.github/workflows/`:

| Workflow      | Trigger              | What it does |
|---------------|----------------------|--------------|
| `ci.yaml`     | PR + push            | Lint, typecheck (`tsc --noEmit`), unit tests, build backend & frontend |
| `ci-cd.yaml`  | push to `main`       | Build multi-arch Docker images, push to Docker Hub |
| `deploy.yaml` | manual / tag         | `kubectl rollout restart` against the cluster |

Required secrets: `DOCKER_HUB_USERNAME`, `DOCKER_HUB_TOKEN`, `KUBECONFIG_B64`.

---

## Documentation Index

| Document | Description |
|----------|-------------|
| [docs/README.md](docs/README.md) | Documentation hub |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | System design & data flow |
| [docs/ROADMAP.md](docs/ROADMAP.md) | Planned features & tech debt |
| [docs/dashboard-feature-specification.md](docs/dashboard-feature-specification.md) | UI/UX spec for the dashboard |
| [backend/README.md](backend/README.md) | API development guide |
| [backend/prisma/README.md](backend/prisma/README.md) | Migrations & seed |
| [frontend/README.md](frontend/README.md) | UI development guide |
| [kubernetes/README.md](kubernetes/README.md) | Production deployment guide |
| [kubernetes/users-management.md](kubernetes/users-management.md) | Cluster RBAC notes |
| [.github/workflows/README.md](.github/workflows/README.md) | CI/CD reference |
| [runner-cmd.md](runner-cmd.md) | Self-hosted runner commands |
| [migration.txt](migration.txt) | Migration notes |

---

## Operations & Troubleshooting

### "Login failed" / Lost admin credentials

The admin account is seeded by `backend/prisma/seed.ts` from env vars (defaults: `admin@amer.dev` / `AmerDevOps2026!`). To create or **reset** the admin password, run the seed — it upserts the user, so it works for both fresh installs and recovery:

```bash
cd backend
# Optional: override the defaults
export ADMIN_EMAIL=admin@amer.dev
export ADMIN_PASSWORD='YourNewStrongPassword!'
export ADMIN_NAME='Amer Admin'
npm run db:seed
```

The seed re-hashes the password with bcrypt (cost 10), sets `role=ADMIN`, `isActive=true`, and clears `mustChangePassword`. After it runs, sign in at `/amercloud/login` with the new credentials.

### Self-service password reset (Outlook SMTP)

The forgot/reset flow is wired end-to-end:

- Frontend: `/amercloud/forgot-password` → `/amercloud/reset-password?token=...`
- Backend: `POST /api/v1/auth/forgot-password` (always returns 200 to prevent email enumeration), `POST /api/v1/auth/reset-password`
- Tokens: 32-byte CSPRNG, stored as SHA-256 hash, 30-minute TTL, single-use, prior unused tokens auto-invalidated on new request
- Email: HTML + text via Nodemailer over Outlook SMTP

**SMTP Configuration Steps (Microsoft/Outlook):**

1. **Enable MFA on your Microsoft account** (if not already enabled)
2. **Generate an App Password:**
   - Go to https://account.live.com/proofs/AppPassword
   - Sign in with your Microsoft account
   - Click "New password"
   - Enter a name (e.g., "AmerCloud SMTP")
   - Copy the generated password (it will only be shown once)
3. **Configure environment variables:**

Required env vars on the backend pod (Kubernetes `amer-portal-secrets`):

```env
SMTP_HOST=smtp.office365.com
SMTP_PORT=587
SMTP_USER=nova-cloud-2026@outlook.com
SMTP_PASS=<app password generated from Microsoft account>
EMAIL_FROM="AmerCloud <nova-cloud-2026@outlook.com>"
FRONTEND_URL=https://amer-portal.cc.cd
```

4. **Apply the migration** that adds `password_reset_tokens`:

```bash
cd backend && npx prisma migrate deploy
```

**Current SMTP Status:** ✅ Configured with `nova-cloud-2026@outlook.com` on `smtp.office365.com:587`

### Password visibility toggle

All password inputs (`/amercloud/login`, `/register`, `/reset-password`) render an eye icon that toggles between `type="password"` and `type="text"`. Implemented in the shared `Input` component in `frontend/src/app/amercloud/login/page.tsx`. If you don't see it, hard-refresh (Ctrl/Cmd+Shift+R) — the change shipped 2026-06-12.

### Auth API surface

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| POST | `/api/v1/auth/register` | public | Create account |
| POST | `/api/v1/auth/login` | public | Returns `{ access_token, user }` |
| POST | `/api/v1/auth/forgot-password` | public | Sends reset email; always 200 |
| POST | `/api/v1/auth/reset-password` | public | Consumes token, sets new password |
| GET  | `/api/v1/auth/me` | Bearer JWT | Current user profile |

Full Swagger UI at `https://api.amer-portal.cc.cd/api/docs` when the backend is running.

---

## Contributing

1. Branch from `main`: `git checkout -b feature/<name>`
2. Run lint + build in `backend/` and `frontend/`
3. Add or update docs under `docs/` when behavior changes
4. Open a PR with a clear test plan and screenshots for UI changes

---

## License

Private / internal — see repository owner for terms.

---

## AmerCloud Phase 3 — Status of the 12 Customer-Portal Tasks

Tracking the customer-facing AmerCloud portal (`/amercloud/*`) and the
admin/internal surfaces it depends on. Updated 2026-06-13.

| #  | Task | Status | Notes |
|----|------|--------|-------|
| 1  | Full admin user management (`/amercloud/admin/users`) | Done | List, search, create, delete, change plan, suspend/activate, reset password, impersonate. |
| 2  | Admin plan management (`/amercloud/admin/plans`) | Done | Create, edit, enable/disable, delete (blocked when subscriptions exist). |
| 3  | Admin transactions (`/amercloud/admin/transactions`) | Done | View, refund (full/partial), confirm cash, CSV export. |
| 4  | Real Two-Factor Authentication | Done | TOTP (speakeasy + qrcode), 8 hashed recovery codes, login challenge, disable via password or recovery code, admin reset. |
| 5  | Real password reset over SMTP | Done | Outlook SMTP via Nodemailer, 32-byte token (hashed, 30-min TTL), branded templates (reset / welcome / invoice-paid / vps-ready), admin SMTP status + test. |
| 6  | Real VPS provisioning via Proxmox | Done | PVE REST client (token auth, optional TLS bypass), LXC create/start/stop/restart/reinstall/destroy, dynamic IP allocation from `PROXMOX_IP_POOL_CIDR`, live status, admin "all VPS" view. |
| 7  | UI polish — Arabic RTL, billing merge, logo nav, role-aware redirects | Done | `dir="rtl"` toggle + language persistence, billing/invoices merged, logo navigates by role, single sidebar. Full string translation table is partial — see "Pending polish" below. |
| 8  | Real cluster stats for admin dashboard | Done | New `AdminClusterModule` exposes `/admin/cluster/{nodes,namespaces,pods}` and `/admin/smtp/{status,test}`. Dashboard shows real users / pods / namespaces / revenue (USD + EGP) with degraded fallbacks. |
| 9  | Move old DevOps portal away from `/login` | Done | Old portal moved to `/devops/login`; `/login` redirects to `/amercloud/login`; `/portal` redirects to `/dashboard`. |
| 10 | Real account email/password change flow | Done | `CloudAccountService` with `/cloud/account/email/request-change`, `/email/confirm`, `/password/change`. Confirmation sent to old email; change notification emailed. |
| 11 | Real cluster integration / live KPIs | Done | Same `ClusterService` powers the public landing KPIs and the admin dashboard; namespace health is computed from pod phases. |
| 12 | **User registration (this task)** | **Done** | `/amercloud/register` page with full name, email, Egyptian phone, password + strength meter, confirm, plan selector. Backend validates Egyptian phone, hashes password (bcrypt cost 12), creates user + subscription (Free Trial = 7 days), sends welcome + verification emails, redirects to login. Verification page at `/amercloud/verify-email`. Resend link on login page. |

### What is NOT done yet (carry-over polish)
- **Arabic translations** — Done: `en.json`/`ar.json` expanded with `common`,
  `auth`, `dashboard` extras, full deployment status set, billing/admin/2FA
  strings. Long-form marketing copy still falls back to English by design.
- **API Keys curl examples + tooltips** — Done: every input/button/column on
  `/amercloud/dashboard/settings/api-keys` has a `title` tooltip, plus four
  copy-to-clipboard `curl` examples (list, create, restart, metrics) that
  inject the freshly-generated token or `$AMER_API_KEY` placeholder.
- **Proxmox per-node + IP pool draining** — Done: `PROXMOX_NODES` (CSV)
  enables multi-node provisioning with least-loaded scheduling; per-node
  storage/bridge overrides via `PROXMOX_STORAGE_<NODE>` /
  `PROXMOX_BRIDGE_<NODE>`; per-template ostemplate override via
  `PROXMOX_TEMPLATE_<ID>`; IP allocator now scans every node, tracks
  in-flight IPs to prevent double allocation under concurrent provisions,
  and releases the IP on PVE failure.
- Marketing emails / lifecycle drips — intentionally out of scope.

### New / changed endpoints in this iteration
| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| POST | `/api/v1/auth/register` | public | Now accepts `phone`, `planSlug`; creates trial subscription, issues verification token. |
| POST | `/api/v1/auth/verify-email` | public | Confirm email via emailed token. |
| POST | `/api/v1/auth/resend-verification` | public | Re-issue verification email. |

### Schema additions (migration `20260613120000_user_phone_and_email_verify`)
- `User.phone` (TEXT, nullable)
- `User.emailVerifyTokenHash` (TEXT, unique, nullable)
- `User.emailVerifyExpires` (TIMESTAMP, nullable)

No Kubernetes or CI/CD changes required — the new flow reuses existing SMTP
secrets (`SMTP_*`) and `FRONTEND_URL`. `ci-cd.yaml` is intentionally
untouched.

## Proxmox Templates

VPS provisioning clones from a curated set of Proxmox templates. The mapping
lives in `backend/src/cloud/proxmox/template-manifest.ts` and is selected by
plan slug at provision time.

| Template ID | OS | Plan | Packages |
|-------------|-----|------|----------|
| 9101 | Debian 12 | Free Trial / Starter (default) | curl, wget, git, htop, nethogs, haveged, qemu-guest-agent |
| 9102 | Ubuntu 22.04 | Pro / Business / Enterprise | + docker, docker-compose, fail2ban, ufw |
| 9100 | Alpine 3 | `free` / `alpine` slug | curl, wget, htop, openssh-server, tzdata |

`ProxmoxService.createContainer` accepts `planSlug` (or explicit `templateId`)
and logs the resolved template before issuing the PVE call. In stub mode
(no `PROXMOX_HOST`) it returns a deterministic VMID + IP + one-time root
password so dev preview keeps working.

### Admin password reset

Default super-admin: `amer30004ever@hotmail.com`.

```bash
# 1) API (must be authenticated as SUPER_ADMIN)
curl -X POST https://api.amer-portal.cc.cd/api/v1/cloud/admin/reset-admin-password \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"newPassword":"YourNewPassword123!"}'

# 2) kubectl (one-shot CLI inside the running pod)
kubectl -n amer-portal exec deploy/backend -- \
  env ADMIN_PASSWORD='YourNewPassword123!' \
  npx ts-node scripts/reset-admin-password.ts

# 3) Env var on deploy (defaults to AmerAdmin2026! when unset)
ADMIN_PASSWORD=YourNewPassword123!
```

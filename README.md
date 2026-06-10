# Amer DevOps Portal

Full-stack DevOps control plane: Kubernetes operations, CI/CD pipelines, monitoring, security, learning hub, and team collaboration — built with **NestJS**, **Next.js**, **PostgreSQL**, and **Prisma**.

| Surface | URL (local) | URL (production) |
|---------|-------------|------------------|
| Web UI | http://localhost:3000 | https://amer-portal.cc.cd |
| API | http://localhost:3001/api/v1 | https://api.amer-portal.cc.cd/api/v1 |
| Swagger | http://localhost:3001/api/docs | https://api.amer-portal.cc.cd/api/docs |
| Health | http://localhost:3001/api/v1/health | https://api.amer-portal.cc.cd/api/v1/health |

---

## Quick start (Docker)

**Requirements:** Docker 24+, Docker Compose v2, 4 GB RAM free.

```bash
git clone https://github.com/Amer30004ever/Amer-Devops-Poral.git
cd Amer-Devops-Poral
docker compose up -d --build
```

Open http://localhost:3000 and sign in:

| Field | Default (dev) |
|-------|----------------|
| Email | `admin@amer.dev` |
| Password | `AmerDevOps2026!` |

Override admin credentials with `ADMIN_EMAIL`, `ADMIN_PASSWORD`, and `ADMIN_NAME` in `.env` or `docker-compose.yaml`.

**Reset database** (fresh Prisma migrations + seed):

```bash
docker compose down -v
docker compose up -d --build
```

---

## Repository layout

```
Amer-Devops-Poral/
├── backend/          NestJS API, Prisma, WebSockets
├── frontend/         Next.js App Router UI
├── docs/             Feature specs, architecture, roadmap
├── kubernetes/       Production K8s manifests & deploy scripts
├── docker-compose.yaml
└── .env.example
```

| Document | Description |
|----------|-------------|
| [docs/README.md](docs/README.md) | Documentation index |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | System design & data flow |
| [docs/ROADMAP.md](docs/ROADMAP.md) | Planned features & tech debt |
| [backend/README.md](backend/README.md) | API development guide |
| [frontend/README.md](frontend/README.md) | UI development guide |
| [backend/prisma/README.md](backend/prisma/README.md) | Database migrations & seed |
| [kubernetes/README.md](kubernetes/README.md) | Production deployment (K8s + Cloudflare) |
| [docs/dashboard-feature-specification.md](docs/dashboard-feature-specification.md) | UI/UX feature specification |

---

## Tech stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 16, React, TypeScript, Tailwind |
| Backend | NestJS 11, Passport JWT, Socket.IO |
| Database | PostgreSQL 15, Prisma 7 |
| Infra | Docker Compose (local), Kubernetes (prod) |
| Integrations | Kubernetes client, GitHub API, WhatsApp webhooks |

---

## Database setup

Schema is managed by **Prisma Migrate**. On container start the backend runs:

1. `prisma migrate deploy`
2. `prisma db seed` (admin user)
3. `node dist/main.js`

Local without Docker:

```bash
cd backend
cp ../.env.example ../.env   # edit DATABASE_URL as needed
npm install
npm run db:setup
npm run start:dev
```

See [backend/prisma/README.md](backend/prisma/README.md) for details.

---

## Environment variables

Copy `.env.example` to `.env` at the repo root. Key variables:

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_SECRET` | Auth token signing (min 32 chars in prod) |
| `NEXT_PUBLIC_API_URL` | Frontend → API base (**must include** `/api/v1`) |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | Seed admin user |
| `FRONTEND_URL` / `BACKEND_URL` | CORS & redirect URLs |

Full list: [.env.example](.env.example)

---

## Main features

- **Dashboard** — cluster metrics, live WebSocket stats, recent activity
- **Projects & pipelines** — GitHub workflows, deployment history, rollback
- **Infrastructure** — namespaces, deployments, services, configmaps, secrets
- **Logs & monitoring** — pod logs, search, SSE stream, alerts
- **Security** — vulnerability scans, encrypted app secrets
- **Settings** — users, roles, API keys, audit logs, backups
- **Platform** — observability links, GitOps status, topology, capacity (API)
- **Learning hub** — jobs, certifications, CV studio, books, conferences
- **Collaboration** — channels, chat WebSocket, knowledge base, calendar

---

## Development commands

```bash
# Full stack (Docker)
docker compose up -d --build
docker compose logs -f backend

# Backend only (local)
cd backend && npm run start:dev

# Frontend only (local)
cd frontend && npm run dev

# API smoke test
curl http://localhost:3001/api/v1/health
curl -X POST http://localhost:3001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@amer.dev","password":"AmerDevOps2026!"}'
```

---

## Production deployment

Production runs on Kubernetes with Cloudflare Tunnel for public HTTPS access. See [kubernetes/README.md](kubernetes/README.md) for the full guide.

CI/CD workflows: [.github/workflows/README.md](.github/workflows/README.md)

---

## Contributing

1. Create a feature branch from `main`
2. Run lint/build in `backend` and `frontend`
3. Add or update docs under `docs/` when behavior changes
4. Open a pull request with a clear test plan

---

## License

Private / internal use — see repository owner for terms.

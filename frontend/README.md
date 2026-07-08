# Amer DevOps Portal — Frontend

Next.js App Router application for the Amer DevOps Portal dashboard.

## Stack

- **Next.js 16** (App Router, standalone Docker output)
- **React 19**, **TypeScript**
- **Tailwind CSS** + shared UI components under `src/components/ui/`
- **AuthContext** — JWT stored client-side, attached to API calls

## Quick start

### With Docker

From repo root:

```bash
docker compose up -d --build frontend
```

Open http://localhost:3000

### Local development

```bash
cd frontend
npm install
cp ../.env.example ../.env.local   # optional

# Required: API base URL must include /api/v1
echo "NEXT_PUBLIC_API_URL=http://localhost:3001/api/v1" >> .env.local

npm run dev
```

Start the backend separately (`cd backend && npm run start:dev`) or via Docker Compose.

## Environment variables

| Variable | Description | Example |
|----------|-------------|---------|
| `NEXT_PUBLIC_API_URL` | Backend API base URL | `http://localhost:3001/api/v1` |

**Important:** `NEXT_PUBLIC_*` values are embedded at **build time** in the Docker image. After changing the API URL, rebuild:

```bash
docker compose build frontend
```

Production build args are set in `docker-compose.yaml` and `Dockerfile`.

## Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Dev server on :3000 |
| `npm run build` | Production build |
| `npm run start` | Serve production build |
| `npm run lint` | ESLint |

## App routes

| Route | Area |
|-------|------|
| `/login` | Authentication |
| `/dashboard` | Main overview, live metrics |
| `/projects` | DevOps projects |
| `/pipelines`, `/deployments` | CI/CD |
| `/infrastructure`, `/cluster` | K8s resources |
| `/logs`, `/monitoring` | Observability |
| `/security/*` | Vulnerabilities, secrets |
| `/settings` | Users, roles, API keys |
| `/learning/*` | Jobs, certs, CV, books |
| `/collaboration/*` | Chat, knowledge, calendar |
| `/integrations/*` | Slack, webhooks |
| `/github` | Repository insights |
| `/documentation` | Internal docs |

## API client libraries

Shared fetch helpers live in `src/lib/`:

- `constants.ts` — `API_BASE_URL`
- `settings.ts`, `projects.ts`, `platform.ts`, `learning.ts` — domain APIs
- `export.ts` — CSV / print-to-PDF helpers

WebSocket hook: `src/hooks/useMetricsWebSocket.ts` (metrics namespace)

## Docker image

Multi-stage `Dockerfile`:

1. **Builder** — `npm ci`, `NEXT_PUBLIC_API_URL` arg, `next build`
2. **Runner** — standalone output, non-root `nextjs` user, port 3000

## UI conventions

- Use `AddItemButton` / `IconAddButton` from `create-item-dialog.tsx` for “+” actions
- Wire create dialogs to real API calls in `src/lib/*` (avoid stub `Promise.resolve()`)
- Role-gated UI should read user role from `AuthContext`

## Agent notes

See `AGENTS.md` / `CLAUDE.md` for Next.js version-specific guidance in this repo.

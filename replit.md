# VoidCloud Platform

A multi-tenant VPS hosting platform with a full admin/business/agent/user role hierarchy.

## Architecture

- **Frontend** (`artifacts/voidcloud/`): React + Vite + Wouter + TanStack Query + Tailwind + shadcn/ui
- **API Gateway** (`artifacts/api-server/`): Express 5 + Drizzle ORM + PostgreSQL
- **Original microservices** (`services/`): 12 NestJS services — not modified, kept as-is
- **Shared DB lib** (`lib/db/`): Drizzle ORM schema used by the API gateway

## Running the Project

Both workflows start automatically:
- **API Server** — `PORT=8080 pnpm --filter @workspace/api-server run dev` → http://localhost:8080/api
- **VoidCloud Frontend** — `PORT=21291 BASE_PATH=/ pnpm --filter @workspace/voidcloud run dev` → http://localhost:21291

## Seeded Accounts

| Role | Email | Password |
|---|---|---|
| Super Admin | admin@voidcloud.com | VoidCloud2026! |
| Business Admin | business@voidcloud.com | Admin2026! |
| Agent | agent@voidcloud.com | Agent2026! |
| User | user@voidcloud.com | User2026! |

## Role-Based Routing

| Role | Landing page |
|---|---|
| SUPER_ADMIN | `/admin/dashboard` |
| ADMIN | `/business/dashboard` |
| AGENT | `/agent/dashboard` |
| USER | `/dashboard` |

## Key Pages

### Super Admin (`/admin/*`)
- Dashboard, Users (with impersonation), Tenants, VPS, Clusters, Monitoring, Pods, Plans, Billing, WhatsApp, Security, Audit, Settings

### Business Admin (`/business/*`)
- Dashboard, Team, CRM, VPS, Billing, Settings

### Agent (`/agent/*`)
- Dashboard, Conversations, Leads

### User (`/user → /dashboard, /vps, /billing, /settings`)

## Environment Variables

- `DATABASE_URL` — PostgreSQL connection string (provisioned by Replit)
- `SESSION_SECRET` — Session signing secret

## User Preferences

- Do not replace or overwrite the existing microservices in `services/`
- All new features target the Replit artifacts only (`artifacts/voidcloud`, `artifacts/api-server`)

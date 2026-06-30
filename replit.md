# VoidCloud — Amer Portal

A full-featured DevOps platform and cloud hosting portal with Egyptian local payment support (Fawry / InstaPay) and global Stripe. Includes a public-facing landing page, user dashboard, admin panels, and a comprehensive DevOps toolset.

## Run & Operate

- `pnpm --filter @workspace/voidcloud run dev` — run the frontend (Vite, port auto-assigned)
- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm run typecheck` — full typecheck across all packages
- Required env: `DATABASE_URL` — Postgres connection string
- Optional env: `VITE_API_URL` — API base URL (defaults to `http://localhost:3001/api/v1`)

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React 19 + Vite + wouter (routing) + Tailwind CSS v4
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- State: Redux Toolkit + React Query
- Build: esbuild (CJS bundle for API), Vite (frontend)

## Where things live

- `artifacts/voidcloud/` — React + Vite frontend
- `artifacts/voidcloud/src/app/` — All page components (Next.js-style file structure preserved, converted to wouter routes)
- `artifacts/voidcloud/src/components/` — Shared UI components
- `artifacts/voidcloud/src/compat/` — Next.js → Vite shims (useRouter, Link, Image)
- `artifacts/voidcloud/src/contexts/` — Auth, Theme, Locale, Notification contexts
- `artifacts/api-server/` — Express API server
- `lib/db/` — Drizzle ORM schema + migrations

## Architecture decisions

- Migrated from Next.js 16 to Vite + React + wouter; all 122 routes preserved as lazy-loaded components
- Next.js navigation/link/image replaced with compat shims in `src/compat/`
- CSS theme uses oklch color space (Tailwind v4 compatible); variables preserved from original
- Backend microservices (auth, billing, VPS, etc.) are separate services pointed to by `VITE_API_URL`

## Product

VoidCloud is a Kubernetes-powered hosting platform targeting Egyptian and global users. Features: VPS management, deployments, billing with Fawry/InstaPay/Stripe, admin panels, CRM, monitoring, DevOps toolkit (pipelines, runbooks, incidents, etc.).

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- The frontend connects to external backend microservices at `VITE_API_URL`. Set this env var to point at the real API.
- `process.env.NEXT_PUBLIC_*` vars are now `import.meta.env.VITE_*` in the frontend.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details

# AmerCloud — Hosting as a Service Platform

This is a very large scope (auth, billing with Stripe+Fawry+InstaPay, K8s/Proxmox provisioning, admin panel, multi-tenant deployments, monitoring, i18n RTL). Shipping all of it in one pass would be low-quality. I'll deliver it in phases on top of your existing NestJS + Prisma + Next.js stack.

## Phase 1 — Foundation (this turn)
**Backend (NestJS + Prisma)**
- Extend `backend/prisma/schema.prisma` with: `User` extensions (role, planId, trialEndsAt, subscriptionStatus, 2FA), `Plan`, `Deployment`, `Invoice`, `PaymentMethod`, `ApiKey` + all enums. Migration file.
- New modules:
  - `auth/` — register, login (JWT + remember-me), refresh, forgot/reset password, verify-email stubs, role guard with `SUPER_ADMIN | ADMIN | USER | BILLING_MANAGER`
  - `plans/` — public list + admin CRUD
  - `deployments/` — CRUD scoped to user, quota check against plan, status transitions (K8s integration stubbed behind a `K8sService` interface so we can wire your existing cluster module next phase)
  - `billing/` — current plan, subscribe, cancel, invoices list, Stripe checkout stub, Fawry checkout stub (reference + QR payload), InstaPay stub, webhook endpoints with signature verification skeleton
  - `admin/` — users list/search, change plan, suspend, override limits, refund, broadcast announcement, stats overview
  - `api-keys/` — generate (returns plaintext once), list, revoke, hashed at rest
- Seed: 4 default plans (FREE, STARTER, PRO, BUSINESS) + ENTERPRISE template, plus a SUPER_ADMIN from `ADMIN_EMAIL`/`ADMIN_PASSWORD` env.

**Frontend (Next.js)**
- Landing `/` — hero, pricing grid (4 tiers from API), feature comparison, CTA, dark glassmorphism
- `/login`, `/register` (with plan preselect from query), `/forgot-password`, `/reset-password`
- `/dashboard` shell with collapsible sidebar, command palette (reuse existing), notification bell, user dropdown, breadcrumbs, dark/light toggle, EN/AR toggle with RTL
- `/dashboard` home — plan card, resource gauges (CPU/RAM/Storage/API), recent deployments, quick actions
- `/dashboard/deployments`, `/dashboard/deployments/new` (wizard: source → resources → env → domains → review), `/dashboard/deployments/[id]` (logs tab, metrics tab, env tab, danger zone)
- `/dashboard/billing`, `/dashboard/billing/invoices`, `/dashboard/settings`, `/dashboard/settings/api-keys`, `/dashboard/settings/team`
- `/admin`, `/admin/users`, `/admin/plans`, `/admin/billing`
- `/status` reuse existing

## Phase 2 — Real integrations (next turn, after you confirm Phase 1)
- Wire `K8sService` to your existing cluster module: namespace create, ResourceQuota, Deployment+Service+Ingress, cert-manager annotations, metrics-server reads, log streaming via WebSocket
- Stripe real keys + webhook signature verification + invoice PDF generation
- Fawry Pay real API (FawryPay v1) + InstaPay deep links
- Proxmox VE API for LXC
- Prometheus/Loki proxying

## Phase 3 — Polish
- Email (Resend), 2FA TOTP, OAuth GitHub/Google, team members, promo codes, retention flow, knowledge base, support tickets, Arabic translations

## Technical notes
- Stripe/Fawry/InstaPay live calls require secrets I'll prompt for in Phase 2 (`STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `FAWRY_MERCHANT_CODE`, `FAWRY_SECURITY_KEY`, `INSTAPAY_*`). Phase 1 ships the endpoints with safe stubs that return deterministic mock references so the full UI flow is testable end-to-end.
- All money math stored as `Float` per your schema (recommend switching to `Decimal` in Phase 2).
- Quota enforcement: every deployment create/update sums user's existing deployments and rejects if it exceeds the plan; admin override (`overrideLimits` JSON on User) bypasses.
- New tables include explicit GRANTs in the migration (no public anon).

## Files Phase 1 will add/edit (high level)
- `backend/prisma/schema.prisma` (edit) + new migration
- `backend/src/auth/*`, `plans/*`, `deployments/*`, `billing/*`, `admin/*`, `api-keys/*` (new modules + DTOs + controllers + services)
- `backend/src/app.module.ts` (register modules)
- `backend/src/seed.ts` (plans + super admin)
- `frontend/src/app/(marketing)/page.tsx` (landing), `frontend/src/app/(auth)/login|register|forgot-password|reset-password/page.tsx`
- `frontend/src/app/dashboard/*` (home, deployments list/new/[id], billing, billing/invoices, settings, settings/api-keys, settings/team)
- `frontend/src/app/admin/*` (users, plans, billing)
- `frontend/src/components/cloud/*` (PlanCard, ResourceGauge, DeploymentWizard, InvoiceTable, AdminUserTable, etc.)
- `frontend/src/lib/api/cloud.ts` (typed API client for all new endpoints)
- `frontend/src/lib/i18n.ts` (EN/AR dictionary + RTL helper)
- `frontend/src/app/layout.tsx` (add ThemeProvider + LangProvider)

Confirm and I'll build Phase 1.

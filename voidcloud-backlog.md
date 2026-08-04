# VoidCloud — Optimized Backlog & Prompt Library (v2)

**Status of this revision:** reordered and merged for a solo founder building a real, paid hosting product with revenue/customers at risk. Nothing from Tier 0 has been completed yet as of this revision. Manual credential rotation is assumed done outside of this document (see "Manual Steps" note below) — this file covers everything that gets pasted into Lovable.

---

## HOW TO USE THIS

1. Paste the **Shared Context Block** once at the start of a session (or keep it pinned).
2. Then paste **one task prompt** at a time, strictly in order within a tier. Each is self-contained.
3. **Do not skip ahead within Tier 0** for prompts whose prerequisites aren't done yet. That said: **the numbering (0.1, 0.1a, 0.17, etc.) reflects priority/dependency grouping, not a literal chronological queue.** If a new prompt gets added later into a tier position "behind" work you've already completed (e.g. Prompt 0.17 added after you've already finished 1.1), don't go back — just do it next, in your actual current position, as long as whatever it depends on is already done. Check the Current Status Tracker below for what's actually done vs. still open, and treat that — not the numeric position — as the source of truth for "what's next."
4. Everything in Tier 0 either touches live credentials, live infrastructure provisioning, or the identity layer everything else depends on. Tier 2+ features built on top of an unhardened provisioner/auth layer just compound risk on a product with real money moving through it.
5. A short list of **manual steps that are not Lovable prompts** (credential rotation, external dashboard actions) is called out separately at the end — do those yourself, they should not be delegated to an agent.

---

## SHARED CONTEXT BLOCK (paste once per session)

```
Project: VoidCloud — multi-tenant VPS hosting platform with WhatsApp CRM.
Architecture: independent microservices in services/*, each = one pod. Do not merge services or introduce cross-service DB access — communicate via REST or RabbitMQ only.
Stack: NestJS (backend services), Next.js/React + Tailwind (frontend/), Prisma + PostgreSQL (database/prisma/schema.prisma), Redis, RabbitMQ, Kubernetes (kubernetes/*.yaml), Proxmox API for VM provisioning.
Roles: SUPER_ADMIN, ADMIN (business admin), AGENT, USER — enforced via RoleGuard + @Roles decorator in services/auth.
Status: this is a real product with paying customers planned — treat all security/data-isolation work as production-grade, not prototype-grade. I am a solo founder; keep deliverables scoped so they can be verified and shipped one at a time.
Rules: never replace existing services, never delete existing frontend structure, add Prisma migrations rather than editing schema destructively, keep microservices independently deployable, all new endpoints must respect RBAC.
```

---

## INFRASTRUCTURE & BUSINESS MODEL CONTEXT (not a prompt — background for sequencing decisions)

- **Hosting**: homelab Proxmox cluster, staying homelab-hosted deliberately (not migrating to a commercial datacenter/cloud provider). Planned scaling trigger: a Dell PowerEdge server (~48 cores) once customer volume justifies it, plus a second modem with an MPTCP router for bandwidth line-aggregation. A personal laptop (8GB VRAM GPU, 128GB RAM, 8 cores) is a candidate second Proxmox node, deferred until real customers exist — worth knowing ahead of time that a 2-node Proxmox cluster has a quorum limitation (if either node drops, the survivor can't achieve quorum alone and won't auto-fail-over); real HA needs 3 nodes or a lightweight QDevice as a tie-breaker. Note for future reference: line aggregation improves throughput, not redundancy — a single physical location/power/ISP remains a single point of failure regardless, which is an accepted tradeoff for now, not an oversight.
- **Timeline**: fully self-paced, no external launch deadline or investor commitment. Prioritization should reflect risk/impact ordering (as this backlog already does), not artificial urgency.
- **Target market**: undecided between Egypt/MENA-first (matching the existing Fawry/InstaPay/Vodafone Cash rails) and genuinely global — leaning toward global with local payment methods as one option among several (see Prompt 0.16a).
- **Billing model**: two distinct, mutually exclusive tracks chosen per-VPS at creation — PAY_AS_YOU_GO (prepaid credits, metered by running time, auto-stop at zero balance until topped up) and SUBSCRIPTION (flat monthly CloudPlan, unlimited VPS runtime for the month, stops only if the subscription itself lapses). Not blended — a subscription does not grant credits, and credits are not consumed on subscription VPS instances. See Prompt 2.2a.
- **Support model**: solo-operated. SUPER_ADMIN gets Slack alerts for both platform-service outages (Prompt 6.3) and tenant VPS outages (Prompt 6.3a) — no on-call rotation or 24/7 SLA exists yet, and none is assumed by any prompt in this backlog.

---

## CURRENT STATUS TRACKER (update this as work actually lands — the prompt library below doesn't track completion on its own)

**✅ TIER 0 — FULLY CLOSED.** All of 0.1–0.18 done, verified with real test output: 0.1 (secret hygiene), 0.2 (idempotent seed), 0.3 (RBAC — see severity note below), 0.4 (2FA scoped-token), 0.5 (token lifecycle), 0.6 (scheduler race, 250-attempt concurrency test), 0.7 (cluster audit logging), 0.8 (safe cluster delete), 0.9 (monitoring dedup), 0.10 (retention rollup + failure classification), 0.11 (tenant isolation audit), 0.12 (cross-service JWT revocation), 0.13 (Zod v3 pin resolved), 0.14 (SSRF — confirmed already complete from an earlier session, status note had been stale), 0.15 (tenant VM network isolation, 15 tests + confirmed still correct after 2.1's static-IP feature), 0.16 (Paymob), 0.16a (Stripe + PayPal adapters, 10 tests), 0.17 (abuse/AUP handling, 27 tests, Slack webhook confirmed already present), 0.18 (whatsapp-service crash-loop — root cause fixed + preventive hardening added; confirmed the service is intentionally a thin stub, real automation lives in the separate `openwa` pod, nothing further needed there).

**✅ TIER 1 — FULLY CLOSED.** 1.1 (auth test suite + brute-force lockout), 1.2 (2FA test suite, 17 tests via real speakeasy TOTP), 1.3 (role-guard matrix, 7 tests).

**✅ TIER 2 — IN PROGRESS:**
- **2.1 (real-time VPS provisioner)** — done. Real RabbitMQ (not Redis) per the architecture decision made mid-session, idempotency-key dedup, job-status polling (no WebSocket gateway — descoped per that same decision), notification-service consumes `vps.provisioned` via RMQ topic. A follow-up check on `vps.ownership.spec.ts` (feared broken/excluded from build) turned out to be a false alarm — it was already passing 9/9; the actual issue was two real bugs in `static-ip.validator.ts` (a syntax error masked by tsc's parsing + a wrong relative import path) plus a wrong fixture IP in its own test, all found and fixed. 0.15's firewall ruleset reconfirmed to still apply correctly regardless of which in-pool IP a VPS is assigned.
- **2.2 (tenant resource quotas)** — done. `TenantQuota` model with cached usage aggregates, enforcement on create/resize/remove, a reconciliation job on both boot *and* hourly cron (matches the original prompt's ask exactly), admin quota-management endpoints, frontend gauges, 8 new tests (61/70 passing in the VPS suite overall, 9 skipped).
- **2.2a (two-track PAYG/subscription billing)** — done. Billing-mode selector on VPS creation, independent start-blocking for both modes, RabbitMQ metering events for low-balance/insufficient-balance/subscription-lapsed, trial credits via env var, wallet UI with real invoice-backed top-ups.
- **2.3 (rate limiting / abuse dashboard)** — done, fully verified. `redis.keys()` → `scanIterator()` fix landed, real Redis-backed block-list sync + scheduled refresh (every 5 min + on module init) implemented. `reference-only/` confirmed via `git log --all -- reference-only/` to have zero commits — no git-history leak, no filter-repo cleanup needed. `monitoring.service.spec.ts` explicitly re-run after the pnpm fix (below): 3/3 passing.
- **2.4 (billing revenue dashboard)** — done, fully verified (11/11 service-level tests + a new controller-level integration test). MRR/churn/revenue-by-plan/top-tenants/failed-payments all wired to real Prisma-aggregated data, webhook-driven payment alerts (Stripe/PayPal/Paymob) with signature verification. The follow-up controller-level test (`payment-webhook.controller.spec.ts`, via supertest against the real HTTP pipeline) specifically confirmed raw-body preservation is correctly configured via Nest's `express.raw()` middleware on both `/billing/webhooks/stripe` and `/billing/webhooks/paypal` — closing the one gap a service-level test alone couldn't catch.
- **2.5 (WhatsApp broadcast center)** — done. `WhatsappTemplate` + `WhatsappBroadcastRecipient` models, RabbitMQ-driven async delivery consumer with a 2s per-message rate limit, segment filtering by plan type/activity level/signup date range plus a manual phone list (matches original scope exactly). 14/14 real tests: rate-limit enforcement (fake timers), per-recipient status transitions, broadcast counter rollup reconciling against individual records, and template variable substitution rendering distinct values per recipient. **Business decision made and documented**: bulk broadcast through the unofficial `openwa` library carries real WhatsApp-ban risk (bulk marketing-style sends are a classic anti-spam trigger regardless of rate limiting) — accepted as a known tradeoff for now rather than building a parallel Meta Business Cloud API integration. Documented in-app (`services/whatsapp/src/main.ts`) and locked here: **if broadcast-related bans start happening in practice, migrate broadcast sends specifically to Meta's official WhatsApp Business Cloud API** (individual conversation relay through openwa is a different, lower-risk usage pattern and doesn't need to change).
- **2.6 (user impersonation with audit trail)** — done, with one explicitly tracked follow-up remaining open. Short-lived 15-min JWT with `impersonatedBy` claim issued from `POST /auth/admin/users/:id/impersonate`; SUPER_ADMIN can target anyone, ADMIN scoped to same tenant; audit log written BEFORE token issuance; frontend banner + one-click exit. Manual exit now also audit-logged (`POST /auth/impersonate/exit` writes `IMPERSONATION_SESSION_ENDED`) — token-expiry-without-manual-exit remains invisible in logs, accepted as a minor gap. **Open follow-up, not yet done**: `impersonatedBy` propagation into audit details is wired for `services/user` only — `services/billing`, `services/vps`, `services/crm`, `services/monitoring` still need the same `logAudit(..., impersonatedBy)` pattern applied incrementally. 39/39 auth tests passing (34 + 5 exit-logging tests).
- **2.7 (K8s pod manager)** — done. Real `@kubernetes/client-node` calls (`listPods`, `restartDeployment` via rollout-restart strategic-merge-patch, `getLogStream`), namespace allowlist (`voidcloud` only) enforced at the service layer, scoped `ServiceAccount`/`Role`/`RoleBinding` YAML (get/list/watch pods, get logs, patch deployments — never cluster-admin). Live log tailing via a Socket.IO gateway — a deliberate, correct exception to the earlier "avoid WebSockets, use polling" decision, since a continuous log stream is a genuinely different problem than a one-time job-completion notification. A real gap was found and fixed: the restart endpoint originally trusted the frontend's re-auth modal without server-side verification — now `verifyReauth()` checks password/TOTP server-side before the K8s call proceeds, with `reauthMethod` recorded in the audit log. 8 new tests, full monitoring suite 51/51 passing.
- **2.8 (activity timeline)** — done. Reusable `ActivityTimeline` component wired into VPS detail, Super Admin user detail, and global audit log pages, with pagination for heavy history.
- **2.9 (onboarding wizard for new tenants)** — done. 3-step wizard at `/voidcloud/onboarding` for ADMIN tenants: connect WhatsApp phone → confirm business profile → create first CRM lead. Backend tracking via `User.onboardingCompleted`/`onboardingSkipped`, `PATCH /auth/me/onboarding` endpoint. New ADMIN tenants redirected from dashboard layout until onboarding completes or is skipped; "getting started" checklist widget added to the dashboard.
- **2.10 (dark/light theme toggle)** — done. `themePreference` stored on User, `PATCH /auth/me/theme`, `ThemeContext` with CSS class switching, toggle button with id `topbar-theme-toggle` in Topbar.
- **2.11 (2FA for business admin)** — done. `POST /auth/two-factor/status`, `/verify`, `/recovery-codes/regenerate`, `/disable` endpoints; Security tab in settings with 2FA setup/disable UI.
- **2.12 (OAuth — Google/GitHub, role-aware)** — done. HMAC-signed state, `upsertOAuthLogin` decision tree enforcing SUPER_ADMIN exclusion, admin/user/agent context branching, account linking/unlinking; Google/GitHub buttons on login/register; settings accounts tab; state signed/verified, CSRF protected.

**✅ TIER 2 — FULLY CLOSED.**

**✅ TIER 3 — FULLY CLOSED.**
- **3.1 (Business Admin: Team + Settings)** — done. Team invite/list/deactivate endpoints in `services/auth`, business settings via `Tenant.settings` JSON, API key CRUD; frontend pages at `dashboard/settings/team`, `dashboard/settings/business`, api-keys wired to new `/auth/admin/api-keys`.
- **3.2 (Business Admin: CRM + VPS view)** — done. CRM page at `dashboard/crm` (leads + tasks), VPS detail snapshot creation added; backend CRM endpoints tenant-scoped via `tenantFilter`.
- **3.3 (Agent Interface)** — done. Agent dashboard at `/voidcloud/agent/dashboard` (conversation count, lead status summary), conversations page using WhatsApp contacts/messages with reply interface, leads page showing only assigned leads with status dropdowns; all pages redirect non-AGENT roles.
- **3.4 (User Panel)** — verified complete. Dashboard overview, VPS list/detail with start/stop/restart/snapshot, billing, and settings tabs all tenant-scoped to the logged-in user.

**✅ TIER 4 — FULLY CLOSED.**
- **4.1 (GitHub Actions: build + test + security scan)** — done in `.gitlab-ci.yml` (canonical CI is GitLab). Per-service matrix lint → test → build with multi-arch Docker images (linux/amd64, linux/arm64). Trivy image scan now fails on HIGH/CRITICAL. Added `dependency-audit` job running `npm audit --audit-level=high` across all services + frontend, plus optional Snyk scan. Path filtering: jobs only run when their own paths change.
- **4.2 (Deploy: staging → production with health verification)** — done. Auto-deploy to `voidcloud-staging` namespace on pushes to main/master/develop. Production deploy requires manual approval via GitLab environment protection. Post-deploy health checks hit `/health` on critical services; failure triggers automatic rollback and pipeline failure.
- **4.3 (Rollback capability)** — done. Every production image tagged with `latest` + timestamp-SHA. `rollback-service` job takes `SERVICE` + `TARGET_TAG` variables, sets the deployment image via `kubectl set image`, and waits for rollout. `rollback-all` job undoes every deployment. Documented in `DEPLOYMENT.md`.
- **4.4 (Migration safety in CI)** — done. `check-migration-safety` job scans new Prisma migration SQL files for `DROP COLUMN`, `DROP TABLE`, `DROP INDEX`, `TRUNCATE`. Blocks merge by default unless PR description/title contains `ALLOW_DESTRUCTIVE_MIGRATION`.


**⚠️ 0.3's real findings — worth remembering even though it's closed:** the RBAC audit found genuinely severe, live gaps — `services/user` had dead `@Roles` (any authenticated USER could suspend/delete any other user's account), `services/audit` allowed reading/forging others' audit logs, `services/email` had a fully open unauthenticated send relay. All fixed, now covered by a dual-mode `rbac-audit.ts` CI check (dead-decorator + fully-unguarded-route detection) that supersedes the earlier `scan-controller-auth.mjs` scanner.

**✅ Resolved: recurring pnpm/build-script install failures.** This had blocked real verification across multiple batches (0.16a/0.17/0.18's "node_modules not installed," then 2.3's install abort). A dedicated full pass found and fixed four separate issues at once: `allowBuilds` had placeholder/missing entries for `@prisma/client`, `@prisma/engines`, `bcrypt`, `esbuild`, and `prisma`; `pnpm-workspace.yaml`'s `packages:` list was missing `frontend` and `services/*` entirely (breaking hoisting, which is why `next` resolved to a broken nested path); a Windows-required native binding (`@tailwindcss/oxide-win32-x64-msvc`) was incorrectly excluded; plus two unrelated pre-existing bugs (an undefined `logout()` reference and a wrong import path on the pods page). Verified: clean `pnpm install` across all 21 workspace projects, `next build` succeeds with 0 TypeScript errors across all 120 pages, monitoring suite 51/51 passing. Treat this as genuinely closed now — the pattern of repeated ad-hoc symptom-patching is what's resolved, not just the latest symptom.

**✅ Resolved: recurring pnpm/build-script install failures.** This had blocked real verification across multiple batches (0.16a/0.17/0.18's "node_modules not installed," then 2.3's install abort). A dedicated full pass found and fixed four separate issues at once: `allowBuilds` had placeholder/missing entries for `@prisma/client`, `@prisma/engines`, `bcrypt`, `esbuild`, and `prisma`; `pnpm-workspace.yaml`'s `packages:` list was missing `frontend` and `services/*` entirely (breaking hoisting, which is why `next` resolved to a broken nested path); a Windows-required native binding (`@tailwindcss/oxide-win32-x64-msvc`) was incorrectly excluded; plus two unrelated pre-existing bugs (an undefined `logout()` reference and a wrong import path on the pods page). Verified: clean `pnpm install` across all 21 workspace projects, `next build` succeeds with 0 TypeScript errors across all 120 pages, monitoring suite 51/51 passing. Treat this as genuinely closed now — the pattern of repeated ad-hoc symptom-patching is what's resolved, not just the latest symptom.

**🐛 Known issues, still open:**
- **0.15's pre-existing-VM migration status** — still unconfirmed whether any tenant VPS instances existed before the firewall fix landed and, if so, whether they've been migrated to the new ruleset.
- **0.16's real-sandbox verification** — a live Paymob sandbox transaction (not just the mocked gateway in unit tests) has still not been confirmed run end-to-end; also confirm the Paymob webhook secret is stored via Vault, not a plain env var.
- **2.6's cross-service `impersonatedBy` propagation** — ✅ **CLOSED.** All four remaining services (`billing`, `vps`, `crm`, `monitoring`) now surface `impersonatedBy` from the JWT payload in `src/strategies/jwt.strategy.ts`, matching `services/user`, so every downstream audit write can tag it.

**✅ All earlier remaining open issues are now resolved:**
- **0.15 (network isolation)** — already implemented in `services/vps/src/proxmox/vm-network-isolation.ts` with per-VM firewall rules blocking VM-to-VM and K8s-internal traffic. Applied during VPS provisioning via `proxmox.service.ts` `applyVmFirewall()`. Tests pass (`vm-network-isolation.spec.ts`).
- **0.16 (local payments)** — Paymob gateway already integrated in `services/billing` with Fawry/Vodafone Cash/InstaPay support, reference code generation, PENDING→PAID lifecycle, and HMAC-verified webhooks. Frontend billing page (`dashboard/billing/page.tsx`) shows all payment methods with method-specific UI (phone for Fawry, InstaPay ID for InstaPay). Stripe/PayPal adapters also present.
- **2.6 (impersonatedBy propagation)** — propagated to all services that create audit logs: `services/vps/src/clusters/clusters.service.ts`, `services/monitoring/src/pods/pods.controller.ts`, `services/monitoring/src/abuse/abuse.service.ts` + `abuse.controller.ts`, `services/monitoring/src/incidents/incidents.controller.ts`. `billing`/`crm`/`notification` don't create direct audit logs (confirmed via grep). Every mutation now tags `impersonatedBy` when present.

**Open issues remaining in Tier 6.**

**🔍 Verification workflow update (effective immediately):** Every "done" claim must include a file-existence check (`ls` / `Test-Path`) on every named file path, not just test results. 6.5 proved that exact-path claims can be fabricated even when no file exists. Treat file-existence verification as a mandatory part of acceptance criteria for all future prompts.

**⚠️ TIER 6 — RE-AUDITED (direct file reads + fresh test run). Mostly real; 3 items corrected.**
_Fresh suite this session: `cd tests && npx jest --config jest.config.cjs --rootDir ..  --ci` → **37 suites passed / 37 total, 354 passed, 17 skipped, 0 failed**. Plus `node --test scripts/__tests__/*.test.mjs` → 3/3 pass. **Tier 6 has coverage**: `tests/monitoring/alerting.service.spec.ts` (8 tests) covers 6.3/6.3a; `tests/shared/logging/*` covers 6.1 against the consolidated module._

- **6.1 (structured logging + correlation IDs)** — ✅ **FIXED / de-duplicated.** The dead repo-root `shared/logging/` copy was deleted; `services/shared/logging.ts` is now the single canonical implementation (JSON output when `LOG_FORMAT=json`/production, correlation-id middleware, `withCorrelationId` RMQ propagation). All 13 services already import it via `../../shared/logging`. Tests in `tests/shared/logging/*` repointed and passing.
- **6.2 (distributed tracing)** — ✅ real, but in `services/shared/tracing/tracing.ts` (not the audited root path). OTLP default `http://jaeger:4318/v1/traces` confirmed. **No test.**
- **6.3 (on-call alerting)** — ✅ **FIXED.** `tcpConnect` now uses a real `net.Socket` with timeout/error handling (the bogus `net.createSocket` call is gone). Covered by `tests/monitoring/alerting.service.spec.ts` (8 tests, passing).
- _(historical)_ ⚠️ **was partially broken.** Slack webhook + `CONSECUTIVE_FAILURE_THRESHOLD = 2` are real and correctly applied. **Confirmed live bug:** `services/monitoring/src/alerting/alerting.service.ts:138` calls `require('net').createSocket({ timeout })` — Node's `net` module has **no** `createSocket` export. `checkRabbitMq` will throw `TypeError` at runtime. Never caught because no test covers it. **OPEN.**
- **6.3a (tenant VPS-down "TCP probe")** — ✅ **FIXED.** `probeVps` now performs a genuine TCP connect on ports 22/80/443 (no HTTP HEAD), records `TIMEOUT` vs `NETWORK` and the failing port in `errorMessage`. Tested.
- _(historical)_ 🚨 **was OPEN.** `VpsHealthLog` model + migration are real and written to. But `probeVps` (alerting.service.ts:213-247) is **not a TCP probe** — it issues `fetch(http://ip:port/, {method:'HEAD'})` against ports 22/80/443. An HTTP HEAD against SSH port 22 can never succeed, so the reachability signal is wrong by construction. **OPEN.**
- **6.4 (error tracking)** — ✅ real. `SentrySpanProcessor` from `@sentry/opentelemetry` wired in `services/shared/tracing/tracing.ts:6,29`.
- **6.5 (DB backup + restore drill)** — ✅ **prior "fabricated path" flag RESOLVED — it now holds up.** `database/scripts/backup.sh` (real `pg_dump | gzip` + `find -mtime` retention) and `restore-drill.sh` (real `dropdb`/`createdb`/`psql` + row-count verification, exits non-zero on failure) both exist. `kubernetes/postgres/backup-cronjob.yaml` (`0 2 * * *`) and `restore-drill-cronjob.yaml` (`0 3 1 * *`) both exist. **No test** (shell scripts, never executed in CI).
- **6.6 (connection pooling + HPA)** — ✅ real. PgBouncer manifests present; `DATABASE_URL_POOLED` read in all 13 `prisma.service.ts:12`; **exactly 13** `kubernetes/*/hpa.yaml` files counted — claim checks out.
- **6.7 (GDPR deletion + ToS)** — ✅ real, ⚠️ **duplicated.** `ToSAcceptance` model at `schema.prisma:258-265`. But `/auth/me/tos-accept` is declared **twice** (`tos-acceptance.controller.ts:25` and `auth.controller.ts:506`) and `/auth/me/delete-account` has **two competing implementations** (`account-deletion.service.ts:20` vs `cloud-auth/account.service.ts:188`). Which one wins depends on module registration order — undetermined. **Needs dedup.**
- **6.8 (OpenAPI docs)** — ✅ real. `setupSwagger(...)` confirmed called in all 13 `main.ts` files.
- **6.9 (Platform Secrets Manager)** — ✅ real, one gap. AES-256-GCM confirmed (`createCipheriv('aes-256-gcm')`, `iv:tag:enc` packing). `@Roles(Role.SUPER_ADMIN)` on all CRUD. Reveal **is** audit-logged — but `platform-secrets.service.ts:54-67` fires the audit write **un-awaited with `.catch(() => {})`**, so a reveal succeeds silently even if its audit record fails to persist. **Minor gap, should await.**
- **6.10 (frontend modularization)** — ✅ real. `@workspace/ui-kit` with 10 components; `frontend/src/features/` has 8 domain folders.


**Recommended next:** Continue with **Tier 7** — UI/UX polish (command palette, breadcrumbs, notification center, bulk actions, accessibility).

**⚠️ TIER 5 — RE-AUDITED (direct file reads). Mostly real; 3 items corrected. The stale duplicate Tier 5 block has been removed; this is the single source of truth for Tier 5.**
- **5.1–5.11** — ✅ real. Spot-verified: `/status` (`status/page.tsx:51-54`) does a real `Promise.allSettled` against `/monitoring/incidents/public` + `/monitoring/status/services` with genuine loading/error/retry states; webhook resend (`webhooks.service.ts:214-242`) really re-signs and re-delivers, recording a new `webhookDelivery` row; domain DNS verification (`domain-verification.scheduler.ts:11-46`) is a real hourly `@Cron` calling `dns.promises.resolveTxt()`.
- **5.12 / 5.13 (app marketplace)** — ✅ **FIXED.** The addons page now polls `GET /vps/:vpsId/apps/:appId/status` every 10s and maps real backend states onto the badge; no optimistic "running".
- _(historical)_ ⚠️ **was fake.** `vps.service.ts:515-585` has real `installApp`/`uninstallApp`/`getAppStatus` calling `k8sApp.deploy/remove/getStatus`. But `frontend/src/app/voidcloud/dashboard/addons/page.tsx:33` sets `setStates(s => ({...s, [appId]: 'running'}))` **immediately after the install call resolves** and never polls `getAppStatus`. Textbook "status set once, never re-checked" — the real status endpoint exists and sits unused. **OPEN.**
- **5.13a (OIDC bootstrap)** — ✅ real. `oidc-bootstrap.service.ts:27-78/94-133` makes genuine `fetch` calls to Gitea `/api/v1/admin/auths` and Portainer `/api/settings`, with idempotency checks. Real `oidc-provider` instance with WebCrypto RSA keygen. K8s Job manifests + 4 `.gitlab-ci.yml` jobs confirmed present. **No test.**
- **5.13b (semantic code indexing)** — ✅ real. `extension.js:109-136` posts to `${ollamaUrl}/api/embeddings` with `nomic-embed-text`; `:139-148` is real cosine-similarity math; `:150-164` embeds query, filters `score > 0.5`, returns top 20. **No test.**
- **5.14 (desktop client)** — ❌ **DESCOPED (not shipped).** The fake `/api/v1/placeholder-desktop-download` link has been removed from the addons page; code-server is browser-only. Re-open only if a real Tauri client is built.
- _(historical)_ 🚨 confirmed fake. `addons/page.tsx:91` links to `/api/v1/placeholder-desktop-download`. Repo-wide grep returns **exactly one hit** — that link. No controller, route, or build pipeline registers this path anywhere. Dead link whose own name admits it. No Tauri project exists.
- **5.15 (native AI assistant)** — ✅ **real, prior "fake AI assistant" flag RESOLVED.** `ai-assistant.service.ts:218-250` `chatOllama()` really POSTs to `${ollamaUrl}/api/chat`; `:252-315` `chatHosted()` really calls an OpenAI-compatible endpoint with tool-calling and falls back to Ollama. Tool execution writes real audit logs and real Prisma updates. Covered by `ai-assistant.spec.ts` (passing in this session's run).
- **5.16 (AI-driven features)** — ⚠️ **soft-fake, downgraded.** `AiUsageAdvisor.tsx:11-18` fetches real data from `/analytics/usage/me`, but the "advice" is one of **two hardcoded strings** selected by a single `if (usage.totalCalls < 100)` threshold. No LLM call despite the name. Canned copy, not AI. **Rename or implement.**
- **5.17 (managed WAF)** — ✅ files exist as claimed.

**✅ TIER 9.1 (Public API + tenant-scoped API tokens) — FIXED. `PublicApiModule` is now registered in `services/vps/src/app.module.ts`, so `/public/v1/vps` is reachable at runtime.**
- Guards are genuine, not stubs: `api-key.guard.ts:22-31` does real SHA-256 hashing + `prisma.apiKey.findFirst({where:{keyHash}})` with expiry check; `scope.guard.ts:20-26` does real scope-array enforcement. Keys are hashed at creation (`auth.service.ts:995-999`), never stored plaintext. Tenant isolation is real at the DB layer via `vps.service.ts:485-492` `findOwned` (404s, doesn't leak).
- Real spec exists and passes: `services/vps/src/public-api/public-api.controller.spec.ts` — 18 tests covering ApiKeyGuard rejection paths, `vps:write`/`vps:delete` scope denial against the **real** `ScopesGuard`, and 6 parametrized cross-tenant IDOR cases. **Verified running green this session.**
- 🚨 **BUT: `PublicApiModule` is never imported.** `services/vps/src/app.module.ts` imports only `VpsModule`, `HealthModule`, `ClustersModule`, `PrismaModule`. `PublicApiModule` is defined (`public-api.module.ts:14`) and never registered. **`/public/v1/vps` does not exist at runtime.** The tests pass because they instantiate the controller directly, bypassing Nest's module graph — the exact failure mode this audit was looking for. **OPEN — one-line fix.**
- ⚠️ Isolation caveat: the IDOR spec mocks `vpsService` entirely, so it proves the controller *delegates* correctly but never exercises `findOwned`'s real Prisma filtering. No `vps.service.spec.ts` exists. Isolation is real in code, but **not proven end-to-end by a test.**

**✅ 3.3 (Agent Interface) — FIXED. The agent dashboard, leads and conversations pages now call `/agent/dashboard`, `/agent/leads`, `/agent/conversations`, `/agent/conversations/:id/reply` and `/agent/leads/:id/status` via `cloudAgent` — all client-side `assignedTo` filtering removed, so the tested server-side isolation is the live authorization surface.**
- Prior "completely missing backend" claim is **wrong** — `services/agent/src/agent/agent.service.ts` is real Prisma logic with `where: { assignedTo: agent.id }` filtering and `NotFoundException` on cross-agent access. `agent.isolation.spec.ts` genuinely proves Agent A cannot reply to Agent B's conversation or mutate B's leads. **Verified passing this session.**
- 🚨 **But no frontend page calls `/agent/*`.** `agent/dashboard/page.tsx:14-18` calls `/auth/me`, `/crm/leads`, `/whatsapp/contacts`; `leads/page.tsx:28-29` calls `/crm/leads` and does **client-side** `.filter(l => l.assignedTo)`. Grep for `/agent` in the agent pages returns only nav hrefs. So the entire tested isolation guarantee is unreachable, and the live authorization surface is `/crm/leads` + `/whatsapp/contacts` — **whose agent-level `assignedTo` server-side filtering is unverified.** Client-side filtering is not isolation. **OPEN — highest-priority item in this audit alongside 9.1.**


---

## TIER 0 — FOUNDATION HARDENING (do this before any new feature work)

This tier merges the original Tier 0 (security), Tier 0.5 (cluster/monitoring hardening), and Tier 0.6 (auth hardening) into one sequence, reordered by actual dependency and blast radius on a live revenue product. Two already-shipped subsystems — the Proxmox cluster scheduler and the auth/RBAC layer — created concrete new attack surface, so their hardening prompts are pulled ahead of everything else.

### Prompt 0.1 — Secret hygiene guardrail
```
I have already manually rotated all previously-exposed credentials (JWT secret, SMTP password, Proxmox token, WhatsApp tokens, Docker Hub token, Cloudflare tunnel secret). Your task is to make sure this never silently happens again.

Task:
1. Grep the entire repo for any hardcoded secrets, API keys, tokens, or passwords in any committed file (not just .env files — check seed scripts, YAML manifests, and test fixtures too). Report every match with file:line.
2. Confirm kubernetes/secrets.yaml, any .env files, and env-example files are in .gitignore going forward, and replace any committed real-value file with a *.example version containing only placeholder values.
3. Add a gitleaks (or trufflehog) step to CI that fails the pipeline if a secret pattern is detected in a diff.
Acceptance: no secret exists in any tracked file going forward; CI fails on an injected test secret.
```

### Prompt 0.2 — Idempotent, non-destructive seed script
```
Task: Audit database/prisma/seed.ts and its CI/deploy wiring.
1. Confirm (or add) an existence check: if a user with the seed admin's email already exists, the script must skip creating/updating that user entirely — never reset an existing admin's password, 2FA settings, or other fields on a re-run.
2. Confirm the admin password is sourced from a required env var (e.g. SEED_ADMIN_PASSWORD) with no hardcoded fallback anywhere in the script — fail loudly at startup if missing.
3. Confirm this script only runs on genuine first-bootstrap (explicit --seed flag or one-time job), not automatically on every deploy.
4. Grep the repo for any other hardcoded credential defaults and remove them.
Acceptance: running the seed script twice against a DB where the admin already exists leaves that admin's credentials and 2FA state untouched; running it with the env var unset fails the deploy.
```

### Prompt 0.3 — Server-side route/endpoint RBAC enforcement + tests
```
Task: Verify role-based access is enforced at the API layer for every route, independent of frontend redirect logic.
1. For every /admin/*, /business/*, /agent/* frontend route, confirm the corresponding backend endpoint(s) are decorated with @Roles and protected by RolesGuard.
2. Write an automated test suite that, for each role (SUPER_ADMIN, ADMIN, AGENT, USER), directly calls every protected endpoint with that role's JWT and asserts correct 200/403 behavior. Include a case with no token and an expired token.
3. Fix any endpoint found missing proper role decoration.
4. Add a lint/test that scans controllers for undecorated routes so this can't silently regress.
Acceptance: a USER-role JWT calling any SUPER_ADMIN-only endpoint directly (via curl, bypassing the frontend) receives 403 for every one, with no exceptions found.
```

### Prompt 0.4 — Server-enforced 2FA completion (no bypass via API)
```
Task: Verify and, if needed, fix services/auth so a user with 2FA enabled cannot obtain a fully-privileged JWT from login without completing the TOTP step, regardless of client.
1. POST /auth/login for a 2FA-enabled user must return only a short-lived, limited-scope "pending 2FA" token, valid only against the TOTP verification endpoint.
2. Only after successful POST /auth/2fa/verify does the service issue the real, fully-scoped access JWT.
3. Add a test calling /auth/login directly for a 2FA-enabled test user, confirming the returned token is rejected by every non-2FA-verification endpoint.
Acceptance: hitting /auth/login directly for a 2FA-enabled account never yields a token usable for anything beyond completing 2FA verification.
```

### Prompt 0.5 — Token lifecycle safety for reset/verification links
```
Task: Audit the password-reset and email-verification token implementation in services/auth.
1. Confirm tokens are generated via a cryptographically secure random source (not sequential IDs, not predictable from timestamp/user ID), sufficiently long (256 bits of entropy).
2. Confirm each token is single-use — invalidated immediately upon successful use, even if the underlying expiry window hasn't passed.
3. Confirm expiry windows are short for password reset (15-30 min) and reasonable for email verification (can be longer, e.g. 24h).
4. Add tests: reusing an already-consumed reset token fails; an expired token fails; a tampered/guessed token fails.
Acceptance: all four test cases pass; token generation is verified to use a CSPRNG, not Math.random or similar.
```

### Prompt 0.6 — Fix scheduler race condition with capacity reservation
```
Task: The cluster scheduler in services/vps picks a target cluster by checking free CPU/RAM/disk at request time, then provisions. Two near-simultaneous requests can both read the same free capacity and get scheduled onto the same cluster before either VM exists to decrement it — an overcommit bug.

Fix:
1. Add a PendingAllocation model (clusterId, cpu, ramMb, diskGb, requestId, createdAt, expiresAt) via Prisma migration.
2. Wrap "check capacity → reserve → provision" in a DB transaction: when the scheduler selects a cluster, immediately write a PendingAllocation row inside the same transaction that reads current capacity, so a concurrent request's capacity check sees the reservation and excludes/deprioritizes it.
3. On provisioning success, convert the pending allocation into the real VM record. On failure/timeout, expire and release it (cleanup job or TTL check).
4. Add a test firing two concurrent provisioning requests against a cluster with only enough capacity for one, asserting only one succeeds.
Acceptance: the concurrency test passes consistently (run 20+ times) with no double-allocation.
```

### Prompt 0.7 — Audit logging for cluster credential actions
```
Task: Extend the audit service to log every create, edit, delete, and credential-reveal action on Proxmox clusters in services/vps/src/clusters.
1. Log actor, action type (create/edit/delete/reveal), cluster ID/name, timestamp on every relevant endpoint.
2. If cluster credentials can be viewed/revealed in the UI (even masked-then-revealed), that reveal action must also be logged, not just edits.
Acceptance: adding, editing, deleting, and revealing a cluster's credentials each produce a corresponding audit log entry, visible in the existing audit log view.
```

### Prompt 0.8 — Safe cluster deletion
```
Task: Prevent deleting a Proxmox cluster that still has active VMs referencing it, and add a disable/maintenance state as an alternative to hard delete.
1. Add a status field to the cluster model supporting ACTIVE / UNREACHABLE / DISABLED (in addition to existing states) — DISABLED means "stop scheduling new VMs here, but existing VMs and history remain untouched."
2. On DELETE /clusters/:id, check for VPS records referencing this cluster; if any exist, reject the deletion with a clear error listing the count of affected VMs, unless an explicit ?force=true is passed (which still requires typing the cluster name to confirm).
3. Add a PUT /clusters/:id/disable (and /enable) endpoint that sets DISABLED/ACTIVE without touching credentials or history — the scheduler must exclude DISABLED clusters from its candidate list.
4. Frontend: add a "Disable" action distinct from "Delete" in the clusters UI, each clearly labeled with what it does.
Acceptance: attempting to delete a cluster with active VMs is blocked by default with a clear count shown; disabling a cluster removes it from scheduler candidates without losing its data or credentials.
```

### Prompt 0.9 — Server-owned monitoring loop (not frontend-triggered)
```
Task: Verify and, if needed, fix services/monitoring so the health checks run on a server-side interval/cron independent of any browser tab being open, persisting each result to ServiceHealthLog. The frontend's GET /monitoring/services/health should read the latest persisted result (cache), not trigger a fresh round of pings itself.

1. If the current implementation pings services in response to the frontend's poll request, move the ping loop into a server-side scheduled job (e.g. NestJS @Interval or a cron-triggered RabbitMQ job) that runs regardless of whether anyone has the monitoring page open.
2. Add a separate POST /monitoring/services/health/check-now endpoint (SUPER_ADMIN only) for an explicit manual "force check" button in the UI, distinct from the auto-polled cached read.
3. Confirm: opening the monitoring page in 3 browser tabs simultaneously does not triple the number of outbound pings to the 13 services.
Acceptance: outbound ping volume to the 13 services stays constant regardless of how many admin browser tabs have the monitoring page open.
```

### Prompt 0.10 — Health-log retention and richer failure classification
```
Task: Two robustness fixes to the delivered monitoring feature.
1. Retention: add a scheduled cleanup job that rolls up ServiceHealthLog data — keep raw per-check rows for 48h, then collapse to hourly aggregates (uptime %, avg response time) for anything older, deleting raw rows after rollup.
2. Failure classification: extend both the service health check and the Proxmox cluster "test connection" endpoint to distinguish failure types (auth/credential failure vs. network timeout vs. unexpected/malformed response) rather than a single UNREACHABLE/DOWN state, and surface the distinction in the UI.
Acceptance: ServiceHealthLog table size growth is bounded (verify with the rollup job run against a day of synthetic data); a simulated auth failure and a simulated timeout produce visibly different status/error messages in both the clusters and monitoring UI.
```

### Prompt 0.11 — Tenant data isolation audit
```
Task: Audit every Prisma query across all services in services/*/src for tenant isolation bugs — any query that reads/writes tenant-scoped tables (VPS, CRM leads, billing, conversations) without a `WHERE tenantId = ?` (or equivalent) filter.
Deliverables:
1. A report listing every offending query by file:line.
2. Fixes applied directly, scoped per-service.
3. A lightweight ESLint rule or custom script added to CI that flags new Prisma calls on tenant-scoped models missing a tenantId filter.
Acceptance: report shows zero remaining unscoped queries; CI check exists and is wired into the pipeline.
```

### Prompt 0.12 — Session/token revocation
```
Task: Add a Redis-backed JWT revocation list to services/auth.
1. On logout, password change, or admin-forced revoke, add the token's jti to a Redis set with TTL matching remaining token life.
2. Add revocation-list check to the JwtAuthGuard used across all services (via a shared check against services/auth's revoke endpoint, or a shared Redis client).
3. Add an admin endpoint POST /admin/users/:id/revoke-sessions (SUPER_ADMIN, ADMIN only) that revokes all active tokens for a user.
Acceptance: a revoked token is rejected by every service immediately, not just at next expiry.
```

### Prompt 0.13 — Zod version tech debt ticket
```
Task: The zod v3 downgrade (to satisfy @hookform/resolvers v5's type expectations) pins a core validation library below its current major version across every service consuming the generated Zod client (lib/api-zod).
1. Investigate whether @hookform/resolvers has (or has a roadmap for) a version compatible with Zod v4.
2. If an upgrade path exists, implement it and remove the pin. If not, document the reason for staying on v3 in a comment in package.json and in this backlog.
Acceptance: either the pin is removed with tests passing on Zod v4, or a clear, dated justification for staying on v3 exists in-repo.
```

### Prompt 0.14 — SSRF protection for tenant webhooks
```
Task: Before or alongside building Prompt 5.5 (tenant webhook management), add SSRF protection to any endpoint that accepts a tenant-supplied URL for outbound calls (webhook registration, custom domain verification callbacks, or any similar feature).

1. On webhook URL registration/update, validate the URL: resolve its hostname and reject if it resolves to a private/internal IP range (10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16, 127.0.0.0/8, 169.254.0.0/16, and any Kubernetes-internal domains like *.svc.cluster.local or *.cluster.local).
2. Re-validate at delivery time, not just at registration time — an attacker could register a URL that resolves externally at registration but is re-pointed via DNS to an internal IP before delivery (DNS rebinding). Resolve immediately before each outbound call and reject if the resolved IP is private at send-time.
3. Disallow non-HTTP(S) schemes (file://, gopher://, etc.) and reject URLs with embedded credentials.
4. Add a test suite covering: a webhook URL pointing at an internal service hostname is rejected at registration; a URL that resolves to a private IP is rejected; a legitimate external HTTPS URL is accepted; a DNS-rebinding scenario (mock DNS resolution changing between registration and delivery) is caught at delivery time.
Acceptance: no combination of URL registered through this feature can result in an outbound request reaching any *.svc.cluster.local address or any private IP range, verified by test — including the delivery-time re-check, not just registration-time.
```

### Prompt 0.15 — Tenant VM network isolation audit
```
Task: Audit whether tenant VMs provisioned via services/vps are network-isolated from each other and from the management/control plane, given the current Proxmox setup uses a shared bridge (vmbr1) across the pool.

1. Document the current network topology: are all tenant VMs on the same L2 broadcast domain? Can one tenant's VM ARP-spoof, sniff, or otherwise reach another tenant's VM traffic today?
2. Confirm whether tenant VMs can reach the Kubernetes cluster's internal network (the same network hosting Postgres, Redis, RabbitMQ, and the 13 microservices) — this would be a critical finding if true, since a compromised tenant VM could then attack the platform's own infrastructure.
3. Recommend and implement isolation: per-tenant VLANs (if Proxmox/network hardware supports it), or at minimum per-VM firewall rules (Proxmox's built-in firewall, or nftables rules applied per VM) blocking VM-to-VM traffic by default and blocking all tenant VM traffic to the Kubernetes-internal CIDR range.
4. Add a verification step: provision two test VMs, confirm VM A cannot reach VM B on any port, and confirm neither can reach the K8s-internal service network.
Acceptance: a report clearly states the current isolation posture (even if the finding is "currently not isolated — here is the fix"); after the fix, the two-VM cross-traffic test and the VM-to-K8s-internal test both confirm blocked access.
```

### Prompt 0.16 — Local payment method integration (Egypt/MENA market)
```
Task: The CloudPaymentMethodType enum already includes FAWRY, INSTAPAY, VODAFONE_CASH, and CASH alongside CREDIT_CARD, and CloudPlan has both priceUSD and priceEGP — indicating local Egyptian payment methods are a real product requirement, not just credit cards via Stripe.

1. Integrate a payment gateway that supports these local rails (e.g. Paymob or Fawaterak — evaluate both for API quality, settlement time, and fee structure, and document the choice with reasoning).
2. Extend services/billing to support a payment-method-specific flow: credit card follows a standard hosted-checkout or tokenized flow; Fawry/Vodafone Cash typically generate a reference code the customer pays at a physical point or via a mobile wallet app, requiring a "pending payment" state until the gateway webhook confirms payment.
3. Update CloudInvoice status handling to correctly reflect this pending-then-confirmed lifecycle for cash-based methods (not just PENDING → PAID as if it were instant).
4. Frontend: payment method selection UI showing the correct flow per method (redirect for card, reference-code display + instructions for Fawry/Vodafone Cash), and a way for the customer to check pending payment status.
5. Webhook handler for the chosen gateway, verified with signature validation (do not trust unauthenticated webhook payloads).
Acceptance: a test payment via at least one non-card method (Fawry or Vodafone Cash) completes the full flow — reference code generated, webhook received and signature-verified, invoice status transitions from PENDING to PAID, and the tenant's subscription activates correctly.
```

### Prompt 0.16a — Global payment methods (Stripe + PayPal)
```
Task: Prompt 0.16's Paymob integration covers Egyptian/MENA-specific rails well, but Fawry, InstaPay, and Vodafone Cash don't serve customers outside that region. Extend the existing payment layer to also support genuinely global payment methods, using the PaymentGateway interface abstraction already built in Prompt 0.16 — this should be a new adapter, not a rewrite.

1. Add a StripeGateway adapter implementing the existing PaymentGateway interface, using Stripe's hosted checkout (or Elements, if more control over the flow is wanted) for global card payments — broadest currency/country coverage of any processor for this use case.
2. Add a PayPalGateway adapter, also implementing the same interface, for customers who prefer/trust PayPal over entering card details directly on VoidCloud.
3. Both new gateways follow the same webhook signature-verification discipline as Paymob's adapter (Stripe: verify via Stripe-Signature header + webhook secret; PayPal: verify via PayPal's webhook signature verification API) — no unauthenticated webhook payload is ever trusted.
4. Update CloudPaymentMethodType enum with STRIPE_CARD and PAYPAL entries (or reuse CREDIT_CARD for Stripe if that's cleaner given existing usage — decide based on whether the distinction matters for reporting).
5. Frontend: extend the existing payment method selection UI (from Prompt 0.16) with these two new options, each following its natural flow (Stripe: redirect to hosted checkout or embedded Elements form; PayPal: redirect to PayPal's own flow).
6. Currency handling: Stripe and PayPal both natively support multi-currency; ensure the checkout flow charges in the customer's selected currency rather than forcing USD/EGP only.
Acceptance: a test payment via Stripe and a test payment via PayPal both complete the full flow — checkout initiated, webhook received and signature-verified, invoice transitions PENDING → PAID, subscription/credit activates correctly — using the same PaymentGateway interface and CloudInvoice lifecycle already proven out for Paymob.
```

### Prompt 0.17 — Abuse/AUP report intake + outbound abuse detection
```
Task: This belongs in Tier 0, not a "someday" feature list — a single tenant VPS running a spam relay, crypto-miner, or DDoS launcher undetected can get VoidCloud's entire IP range blacklisted by upstream providers/mail systems within days, which is an existential risk to a real hosting business, not a nice-to-have.

1. Abuse report intake: a public, unauthenticated endpoint/form (e.g. abuse@ mailbox parsed automatically, or a /abuse web form) where third parties (other providers, ISPs, security researchers) can report a specific VoidCloud-hosted IP/domain for spam, malware, phishing, or attack traffic. Log every report with source, target IP/tenant, reported reason, timestamp.
2. Outbound abuse detection: extend services/monitoring (or a new lightweight consumer) to watch for abuse signatures originating FROM tenant VPS instances — unusual outbound connection volume/patterns (e.g. mass SMTP connections suggesting a spam relay, sustained high outbound bandwidth to many distinct IPs suggesting a DDoS launcher, sustained 100% CPU with no corresponding legitimate workload suggesting unauthorized crypto-mining).
3. Response workflow: on either an abuse report or automated detection crossing a threshold, notify the SUPER_ADMIN (reuse Prompt 6.3a's Slack alerting pattern) and provide a clear, fast path to suspend the offending VPS's networking (not delete — preserve evidence and allow the tenant to respond) pending investigation.
4. Acceptable Use Policy: a real, published AUP document linked from signup and the dashboard footer, covering what's prohibited (spam, malware distribution, DDoS, crypto-mining without disclosure, copyright infringement hosting) — this is also what gives you legal grounds to suspend an abusive tenant's service.
5. Reverse DNS (PTR) management: expose a way for tenants to request/set a PTR record for their VPS's IP — critical for any tenant intending to run outbound mail, and its absence is a common reason legitimate tenant mail gets marked as spam, which reflects on the whole platform's IP reputation.
Acceptance: a simulated abuse report against a test VPS is logged and triggers a SUPER_ADMIN notification; a synthetic mass-outbound-connection pattern from a test VPS is detected and flagged without needing an external report; the AUP is a real, linked, readable document; PTR record requests can be submitted and (at least manually, if full automation isn't feasible yet) fulfilled for a test domain.
```

### Prompt 0.18 — Fix whatsapp-service crash loop
```
Task: A prior cluster snapshot showed whatsapp-service crash-looping — 290 restarts over roughly 10 days, most recently under 2 minutes before the snapshot was taken. No deploys have happened since, so this hasn't resurfaced yet, but it will the moment this service is redeployed with real traffic flowing through it — fix this before that happens, not after.

1. Investigate the actual last termination reason: `kubectl logs whatsapp-service-<pod> -n voidcloud --previous` and `kubectl describe pod` for the last termination reason (OOMKilled, liveness probe failure, unhandled exception, or something else).
2. Likely candidates to check first, in order of likelihood: an unhandled promise rejection or uncaught exception in the openwa/whatsapp webhook handling path; a resource limit set too low for actual memory usage (check requests/limits in kubernetes/whatsapp/deployment.yaml against real usage); a liveness probe timing mismatched against openwa's actual cold-start time (openwa's Puppeteer-based session startup can be slow, and a too-aggressive liveness probe can kill a pod that's still legitimately starting up).
3. Fix the root cause, not just the symptom — if it's a resource limit issue, raise the limit AND understand why usage is that high; if it's an unhandled exception, fix the exception path, don't just add a broader try/catch that swallows it silently.
4. Add a regression test or a monitoring alert (tie into Prompt 6.3a's pattern) so a return of this crash-loop pattern is caught immediately rather than silently accumulating restarts again.
Acceptance: whatsapp-service runs for a sustained period (e.g. 24h+ under realistic test load) with zero unexpected restarts; the actual root cause is documented (not just "it's fixed now"); a monitoring alert would catch a recurrence if this pattern ever returns.
```

---

## TIER 1 — MINIMUM VIABLE TEST NET

Scaled down from the original four-part Tier 1 for solo execution. Full Playwright E2E coverage (original Prompt 1.4) is deferred until there's a team or paying-tenant volume that makes manual regression-checking impractical.

### Prompt 1.1 — Auth test suite
```
Task: Write a comprehensive Jest test suite for services/auth covering:
- Login: success, wrong password, non-existent user, inactive/suspended account, rate-limited login attempts.
- Register: success, duplicate email, weak password validation, missing fields.
- Forgot password: valid email sends reset token, invalid email doesn't leak existence, expired token rejected, used token rejected.
- Password reset: successful reset invalidates old sessions.
- Email verification: valid token verifies, expired/invalid token rejected.
Acceptance: tests run in CI, cover both success and failure paths for each endpoint, no test hits a real SMTP server (mock the email service).
```

### Prompt 1.2 — 2FA test suite
```
Task: Write Jest tests for services/auth's TOTP 2FA flow:
- Enrollment: QR/secret generation, confirming a valid code activates 2FA.
- Login with 2FA: correct code succeeds, incorrect code fails, expired/reused code fails, backup codes (if implemented) work once each.
- Disabling 2FA requires re-authentication.
Acceptance: tests pass in CI, use a real TOTP library to generate valid codes in test rather than hardcoding one.
```

### Prompt 1.3 — Role-guard test suite (extends 0.3)
```
Task: Extend the role-guard tests from Prompt 0.3 into a full matrix across services/auth and at least one consumer service (e.g. services/vps):
- Each of SUPER_ADMIN, ADMIN, AGENT, USER is correctly allowed/denied on a representative set of endpoints.
- SUPER_ADMIN override (full access) works as intended.
- Missing/invalid JWT is rejected before role check runs.
Acceptance: a matrix of role x endpoint is covered, tests fail loudly if a new endpoint is added without a Roles decorator.
```

---

## TIER 2 — CORE REVENUE FEATURES

Reordered from the original: tenant quotas now come immediately after the VPS provisioner, ahead of the billing dashboard — an unquotaed provisioner in front of real payment is the fastest way to lose real money to abuse before invoicing even exists.

### Prompt 2.1 — Real-time VPS provisioner
```
Task: Build the VM creation form at frontend/pages/admin/clusters (or wherever the cluster UI lives) that actually provisions a VM via Proxmox.
1. Form fields: cluster (or "auto-select via scheduler"), CPU cores, RAM, disk size, OS template, static IP (optional).
2. On submit, call services/vps's create endpoint, which calls the scheduler (already built and hardened) to pick a cluster, then calls Proxmox's API using that cluster's decrypted credentials.
3. Make the actual Proxmox call async via a RabbitMQ job — return a job ID immediately, poll/notify on completion via the notification service's WebSocket, rather than holding the HTTP request open.
4. Add an idempotency key (client-generated UUID) so a retried submit doesn't double-provision.
Acceptance: submitting the form creates a real LXC/VM on the target Proxmox host, UI shows a pending → success/failure state driven by the async job, retried submission with same idempotency key doesn't create a duplicate VM.
```

### Prompt 2.2 — Tenant resource quotas with enforcement
```
Task: Add per-tenant CPU/RAM/storage quotas.
1. Prisma migration adding a TenantQuota model (tenantId, maxCpu, maxRamMb, maxDiskGb) plus a computed/cached current-usage aggregate.
2. services/vps checks quota before provisioning; reject with a clear error if the new VM would exceed the tenant's quota.
3. Add a background reconciliation job (cron or RabbitMQ consumer) that recomputes actual usage from live VPS records periodically, to catch race conditions where two simultaneous requests both passed the check.
4. Frontend: usage gauges (used/limit per resource) on both the tenant's own VPS page and the Super Admin's tenant detail view.
Acceptance: provisioning past quota is rejected server-side (not just hidden in UI); gauges reflect real usage; reconciliation job logs and corrects any drift it finds.
```

### Prompt 2.2a — Two-track billing: pay-as-you-go credits vs. unlimited subscription (per-VPS choice)
```
Task: Add two distinct, mutually exclusive billing modes a tenant can choose per VPS at provisioning time — not blended, not one deriving from the other:

1. PAY_AS_YOU_GO — the VPS consumes prepaid credits based on running time. When the tenant's credit balance hits zero, the VPS is automatically stopped (not deleted), and cannot be started again until the balance is topped back up above zero (or above whatever minimum threshold covers at least the next metering tick).
2. SUBSCRIPTION — the VPS runs continuously for the full billing month with no credit consumption and no runtime limitation, for as long as the tenant's CloudPlan subscription remains ACTIVE. If the subscription lapses (PAST_DUE past its grace period, CANCELED, EXPIRED — using the existing CloudSubscriptionStatus lifecycle, don't invent a parallel one), the VPS is stopped (not deleted) the same way a zero-credit PAYG VPS is, until the tenant resubscribes.

Billing mode is chosen per-VPS at creation (Prompt 2.1's provisioning form gets a mode selector), not per-tenant-account — a tenant can run one VPS on SUBSCRIPTION (e.g. an always-on production box) and another on PAY_AS_YOU_GO (e.g. a disposable test box) simultaneously under the same account.

1. Prisma migration adding:
   - `billingMode` field on CloudDeployment: PAY_AS_YOU_GO | SUBSCRIPTION, set at creation, changeable later only through an explicit "change billing mode" flow (not silently).
   - CreditBalance (tenantId, balance — currency-agnostic "points", e.g. the 300-points-for-$25/1250-EGP top-up model)
   - CreditTransaction (tenantId, type: TOPUP | CONSUMPTION | REFUND | ADJUSTMENT, amount, relatedVpsId, balanceAfter, createdAt) — an immutable, append-only ledger, never mutate past entries.
2. Top-up flow (PAY_AS_YOU_GO only): tenant purchases a credit pack through any configured payment gateway (Paymob, Stripe, PayPal from Prompts 0.16/0.16a) — on payment confirmation, append a TOPUP transaction and increment CreditBalance.
3. Metered consumption (PAY_AS_YOU_GO VPS only): extend services/vps (or a lightweight metering consumer) to record CONSUMPTION transactions based on actual running time — deduct points per minute/hour a PAY_AS_YOU_GO VPS is in RUNNING status, triggered by the existing CloudDeployment status transitions rather than polling. Reference OpenMeter's (reference-only/openmeter/) event-aggregation patterns for batching consumption events efficiently rather than writing a transaction per second. SUBSCRIPTION-mode VPS instances are never touched by this metering logic at all.
4. Enforcement at two points, not just one:
   - **On start**: block starting a PAY_AS_YOU_GO VPS if balance is at or below zero; block starting a SUBSCRIPTION VPS if the tenant's subscription isn't ACTIVE.
   - **While running**: a scheduled check stops a running PAY_AS_YOU_GO VPS the moment balance hits zero mid-session (don't wait for the next start attempt to notice), and stops a running SUBSCRIPTION VPS if the subscription lapses mid-month.
5. Low-balance warning (PAY_AS_YOU_GO): a notification via services/notification at a configurable low-balance threshold, before the hard stop at zero — give the tenant a chance to top up before their VPS goes down.
6. Frontend:
   - VPS creation flow: explicit billing-mode selector (PAY_AS_YOU_GO vs SUBSCRIPTION) with a clear explanation of what each means.
   - VPS detail page: shows current mode, and either the live credit balance + burn rate (PAYG) or subscription status + renewal date (SUBSCRIPTION).
   - Wallet page (PAYG tenants): balance, top-up flow reusing the payment method selection UI, paginated transaction ledger.
   - Clear, actionable blocked-state UI when a VPS can't start due to zero balance or lapsed subscription — a direct "Top up" or "Resubscribe" button, not just an error message.
7. Super Admin view: per-tenant/per-VPS billing mode breakdown, platform-wide credit liability (sum of all PAYG balances — a real accounting figure), manual credit adjustment (mandatory reason + audit log entry, same pattern as other admin actions) for support/goodwill cases.
8. Free trial credit grant: on new tenant account creation, automatically append a TOPUP-type CreditTransaction for a small configurable free amount (e.g. "$5 free") — a standard, low-effort conversion lever (DigitalOcean's signup-credit model) that costs nothing extra to build once the ledger exists. Make the amount configurable (env var or PlatformSetting) rather than hardcoded, so it can be tuned or disabled without a code change.
9. **Currency/FX policy — decide this before implementing, don't let it default silently**: "300 points for $25 or 1250 EGP" implies a fixed points-to-currency rate at time of purchase, but that rate needs an explicit source of truth once more currencies (Stripe/PayPal, Prompt 0.16a) are added and exchange rates move over time. Decide and document: (a) is the points-per-dollar rate fixed permanently, or does it float with a periodically-updated FX rate; (b) if a tenant buys in EGP and EGP depreciates against USD later, does their existing point balance's USD-equivalent value change, or is it locked at purchase time (recommended — locking at purchase time avoids relitigating already-sold credit value and is simpler to reason about/audit). Store the resolved decision as a comment in the migration and in this backlog once made.
Acceptance: a PAY_AS_YOU_GO VPS's owner can top up credits, watch the balance visibly decrement while the VPS runs, get warned at low balance, and have it auto-stop at zero — then be unable to restart it until topped up again, verified by test. A SUBSCRIPTION VPS runs uninterrupted for the full month with zero credit deduction, and gets stopped (not deleted) if the subscription lapses, verified by test. The two modes never cross-contaminate each other's logic — a SUBSCRIPTION VPS is never affected by credit balance, and a PAYG VPS is never affected by subscription status.
```

### Prompt 2.3 — Rate limit / abuse dashboard with real enforcement
```
Task: Build /admin/security.
1. Backend: Redis-backed sliding-window rate limiter at the API gateway/ingress level (not just per-service) — this is the actual enforcement layer.
2. Dashboard visualizes what's being enforced: top IPs by request volume, requests/minute per tenant, current block list.
3. Block-list CRUD: add/remove IP or tenant from block list, using the existing IpBlockList schema.
4. Blocked IPs/tenants get a 429 with a clear (but not overly detailed) error at the gateway before hitting any service.
Acceptance: the dashboard reflects real enforced limits (not a separate mocked view), adding an IP to the block list actually blocks it within the same request cycle.
```

### Prompt 2.4 — Billing revenue dashboard
```
Task: Build /admin/billing with Recharts, backed by services/billing.
1. MRR chart (monthly recurring revenue, trailing 12 months).
2. Churn rate chart (cancellations / active subscriptions per month).
3. Top-paying tenants table (sortable, top 20).
4. Failed payment alerts list (from Stripe webhook events, not polled from your own DB state — subscribe to invoice.payment_failed and similar).
5. Revenue-by-plan-type breakdown chart.
Acceptance: all charts pull from real services/billing data (seed realistic test data if Stripe isn't live yet), failed-payment alerts are driven by webhook events with a retry/backoff on webhook delivery failure.
```

### Prompt 2.5 — WhatsApp broadcast center
```
Task: Build /admin/whatsapp broadcast composer.
1. Template management: CRUD for message templates (name, body with variable placeholders like {{firstName}}).
2. Audience selection: all tenants, or a segment filter (plan type, activity level, signup date range).
3. Send flow: preview → confirm → queue send via RabbitMQ (don't blast synchronously) → delivery tracking table (sent/delivered/failed per recipient).
4. Rate-limit sends per WhatsApp API constraints to avoid provider throttling/ban.
Acceptance: a test broadcast to a small segment queues correctly, delivery status table updates as the queue processes, template variables render correctly per recipient.
```

### Prompt 2.6 — User impersonation with audit trail
```
Task: Add "Login as user X" for SUPER_ADMIN (and ADMIN for their own tenant's users only).
1. Endpoint issues a scoped JWT: short TTL (15 min), includes an `impersonatedBy: <adminUserId>` claim, restricted to that tenant.
2. Write the audit log entry BEFORE issuing the token (so even a crash mid-impersonation is logged), including admin ID, target user ID, timestamp, reason (free-text field required in the UI).
3. Every downstream service that logs actions should include the impersonatedBy claim in its own audit entries when present.
4. UI: visible banner while impersonating ("Viewing as {user}, exit impersonation") with a one-click exit.
Acceptance: impersonation token expires in 15 min even if not manually exited; audit log shows every impersonation session with reason; downstream action logs are tagged when performed under impersonation.
```

### Prompt 2.7 — K8s pod manager (with guardrails)
```
Task: Build /admin/pods.
1. List pods per namespace (read-only first) using a tightly-scoped ServiceAccount — RBAC limited to only the namespaces VoidCloud actually needs, never cluster-admin.
2. Add restart and delete actions, each requiring an explicit confirmation modal AND a re-auth step (re-enter password or 2FA code) before executing.
3. Live log streaming for a selected pod via WebSocket (tail -f style).
4. Every restart/delete action writes to the audit service before executing.
Acceptance: ServiceAccount's RBAC is verifiably scoped (show the Role/RoleBinding YAML), destructive actions cannot be triggered without re-auth, all actions are audit-logged.
```

### Prompt 2.8 — Activity timeline
```
Task: Build a per-user and per-tenant activity timeline, backed by the audit service.
1. Timeline component (reusable) showing chronological events with actor, action, target, timestamp.
2. Add to Super Admin's user/tenant detail views, and to each tenant's own "activity" tab in the business admin panel.
3. Paginate/virtualize for tenants with heavy activity history.
Acceptance: timeline reflects real audit-service events, including impersonation and pod-manager actions from earlier tasks.
```

### Prompt 2.9 — Onboarding wizard for new tenants
```
Task: Build a guided setup flow shown on first login for a new ADMIN (business admin) tenant.
Steps: connect WhatsApp number (or "I'll do this later") → confirm business profile details → create first lead (guided form) → land on dashboard with a "getting started" checklist widget that persists until all steps are done.
Acceptance: wizard is skippable at every step but resumable from the dashboard checklist; completing all steps dismisses the checklist permanently for that tenant.
```

### Prompt 2.10 — Dark/light theme toggle
```
Task: Add a theme toggle to the header/nav, wired to the existing ThemeContext.
1. Toggle button (sun/moon icon) persists choice via a DB-backed user preference (not localStorage — this is a real app so a DB column on the user profile is fine).
2. Respect system preference on first load if no explicit choice made yet.
Acceptance: toggle works across every page, persists across sessions and refresh.
```

### Prompt 2.11 — 2FA for Business Admin
```
Task: Extend the existing SUPER_ADMIN TOTP 2FA (services/auth/.../two-factor.service.ts) to be enrollable by ADMIN (business admin) accounts too.
1. Settings page: enroll (QR code + manual secret), verify, disable (requires current password + current 2FA code).
2. Reuse the existing backend service — this should mostly be a role-gate change plus frontend page, not a new implementation.
Acceptance: ADMIN accounts can enroll/disable 2FA identically to SUPER_ADMIN; login flow correctly prompts for 2FA code when enabled.
```

### Prompt 2.12 — Sign up / login with Google and GitHub (OAuth, role-aware)
```
Task: Add Google and GitHub OAuth to services/auth, alongside the existing email/password flow — with role-aware behavior. OAuth is a convenience layer for accounts that get created through open signup; it must never become a second, uncontrolled path into accounts that should be provisioned deliberately (invited staff, and the super-admin seat).

Role-specific rules (implement all of these, don't collapse to one universal rule):

1. SUPER_ADMIN: OAuth is never applicable — no signup, no login, no linking. This account stays email/password + mandatory 2FA only. Reject/ignore any OAuth callback that would otherwise resolve to a SUPER_ADMIN user.

2. ADMIN (business admin) and USER (end customer): full OAuth support for both signup and login, entry point is the public /register and /login pages.
   - Two distinct entry contexts drive which role gets assigned to a brand-new account: the business signup page (context=admin_signup) creates an ADMIN + new tenant; the general signup page (context=user_signup) creates a USER. Pass this context through the OAuth state parameter (signed/verified, not just a raw query string) so the callback knows which to create — don't infer role from anything guessable.

3. AGENT: OAuth is login/linking only, never signup.
   - Agents are provisioned exclusively via business-admin invite (Prompt 3.1's invite flow), which creates a pending AgentInvite record (tenantId, email, token, expiresAt).
   - The OAuth callback, on seeing an email with no existing user account, must check for a pending, unexpired AgentInvite matching that email before creating anything. If found: create the AGENT user scoped to that tenant, mark the invite consumed. If not found: do not create an account — return an error directing them to request an invite from their business admin.
   - An already-provisioned AGENT (created via invite, using email/password) can later link Google/GitHub from their own settings page purely for login convenience — this is account linking, not account creation, so no invite check applies at that point.

4. Account linking (all roles below SUPER_ADMIN): if the OAuth email matches an existing user's verified email, link the identity rather than creating a duplicate. Add an OAuthIdentity model (userId, provider, providerAccountId) via Prisma migration supporting multiple linked providers per user.

Backend:
1. passport-google-oauth20 and passport-github2 strategies in services/auth.
2. Endpoints: GET /auth/google, GET /auth/google/callback, GET /auth/github, GET /auth/github/callback — each accepting a signed state param carrying { context: admin_signup | user_signup | agent_accept | link, inviteToken? }.
3. Implement the per-role branching above inside the callback handler as one clearly-commented decision tree, not scattered conditionals — this logic is security-relevant and needs to be auditable in one place.
4. On success, issue the same JWT the email/password flow issues, so downstream RoleGuard and routing work unchanged.
5. Store Google/GitHub client ID + client secret in Kubernetes Secrets (do not build a DB-backed secrets UI yet — see deferred items).
6. CSRF/state validation (including the signed context payload) on every callback to prevent authorization-code injection or context tampering.

Frontend:
1. "Continue with Google/GitHub" buttons on the business signup page, the general user signup page, and the login page — each initiating the flow with the correct context.
2. Agent invite-acceptance page (from the invite email link) also offers "Continue with Google/GitHub," passing context=agent_accept and the invite token — no OAuth buttons on any public signup page create agents.
3. Settings page (all non-SUPER_ADMIN roles): show linked providers, allow linking an additional one, block unlinking the last remaining auth method.
4. Clear, specific error state for "no invite found" when an agent_accept OAuth attempt doesn't match a pending invite.

Acceptance:
- A business or user signup via Google/GitHub creates the correct role with no invite involved.
- An OAuth attempt on the agent-invite page with a matching pending invite creates the AGENT correctly scoped to that tenant and consumes the invite; the same attempt with no matching invite creates nothing and shows a clear error.
- No sequence of requests can result in a SUPER_ADMIN account being created or logged into via OAuth.
- An existing email/password AGENT can link Google afterward from settings and log in via either method into the same account.
- OAuth app secrets are stored as Kubernetes Secrets, not hardcoded in any committed file.
```

---

## TIER 3 — ROLE PANEL COMPLETIONS

### Prompt 3.1 — Business Admin: Team + Settings
```
Task: Build frontend/pages/business/team and frontend/pages/business/settings.
Team: invite team members by email (creates AGENT-role user scoped to this tenant), list current team with role/status, remove/deactivate member.
Settings: business profile fields, WhatsApp number configuration, API key management (view/regenerate scoped to this tenant).
Acceptance: invited members receive an email invite (via services/email) and land in AGENT role scoped only to the inviting tenant.
```

### Prompt 3.2 — Business Admin: WhatsApp CRM + VPS view
```
Task: Build frontend/pages/business/crm and frontend/pages/business/vps.
CRM: customer list, lead management (create/update/status), deal tracking (pipeline stages), task management, contact history — all scoped to this tenant only via services/crm.
VPS: list only this tenant's VPS instances, start/stop/restart actions, resource usage gauges (reusing the quota gauge component from Prompt 2.2).
Acceptance: no data from other tenants is ever visible or reachable, even via direct URL manipulation (verify with a test that a tenant A user cannot fetch tenant B's records).
```

### Prompt 3.3 — Agent Interface (full)
```
Task: Build frontend/pages/agent/dashboard, /agent/conversations, /agent/leads.
Dashboard: assigned conversation count, lead status summary, recent activity feed.
Conversations: only conversations assigned to this agent, reply interface with quick-reply templates, conversation status controls (open/pending/resolved).
Leads: only leads assigned to this agent, status updates, contact history.
Acceptance: an AGENT account sees zero conversations/leads not explicitly assigned to them; no access to settings or admin routes even via direct URL (test this).
```

### Prompt 3.4 — User Panel (full)
```
Task: Build/complete frontend/pages/dashboard, /vps, /billing, /settings for the USER role.
Dashboard: VPS overview, resource usage, recent invoices summary.
VPS: this user's VPS only — start/stop/restart, resource gauges, snapshot creation.
Billing: invoice list, payment methods, subscription details.
Settings: profile, 2FA setup (reuse Prompt 2.11's component), API keys if applicable to end users.
Acceptance: all views strictly scoped to the logged-in user's own data.
```

---

## TIER 4 — CI/CD

### Prompt 4.1 — GitHub Actions: build + test + security scan
```
Task: Write/update .github/workflows for VoidCloud's ~13 microservices.
1. Per-service job matrix: lint → unit test → build multi-arch Docker image (linux/amd64, linux/arm64) only on main branch merges.
2. Security scan stage: Trivy (image scan) and Snyk or npm audit (dependency scan), fail the pipeline on HIGH/CRITICAL findings.
3. Only run jobs for services whose files changed (path filtering), not all 13 on every commit.
Acceptance: a PR touching only services/vps triggers only that service's pipeline; a known-vulnerable dependency injected in a test branch fails the pipeline.
```

### Prompt 4.2 — Deploy: staging → production with health verification
```
Task: Add deploy stages to the GitHub Actions workflow (or .gitlab-ci.yml, whichever is canonical — confirm and consolidate to one).
1. Auto-deploy to staging namespace on merge to main.
2. Manual-approval gate before production deploy (a human clicks "approve" in the GitHub Actions UI).
3. Post-deploy health check step: hit each deployed service's /health endpoint and fail/rollback the deploy if any fail to report healthy within a timeout.
Acceptance: a broken image that fails health checks post-deploy triggers automatic rollback to the last known-good image tag, with a Slack/notification alert.
```

### Prompt 4.3 — Rollback capability
```
Task: Add a documented, one-command rollback mechanism.
1. Tag every successful production deploy image with both `latest` and a timestamp/SHA tag, keep the last 10 tags available.
2. Add a GitHub Actions workflow_dispatch job "rollback-service" that takes a service name + target tag and re-applies that image via kubectl rollout, without needing manual kubectl commands run locally.
3. Document the process in DEPLOYMENT.md.
Acceptance: triggering the rollback workflow for a given service reverts it to the specified prior image within one pipeline run.
```

### Prompt 4.4 — Migration safety in CI
```
Task: Add a CI check that inspects new Prisma migrations in a PR diff and blocks the merge if a migration contains a destructive operation (DROP COLUMN, DROP TABLE, TRUNCATE) unless the PR description contains an explicit `ALLOW_DESTRUCTIVE_MIGRATION` tag.
Acceptance: a test PR with a DROP COLUMN migration fails the check by default, passes once the override tag is added.
```

---

## TIER 5 — INNOVATION FEATURES

### Prompt 5.1 — Predictive scaling + AI resource optimization
```
Task: Add a lightweight recommendation engine to services/monitoring or services/vps.
1. Collect historical CPU/RAM/disk usage per VPS (time-series, e.g. into a TimescaleDB extension on existing Postgres or a simple rolling-aggregate table).
2. Simple model first (not deep learning): moving-average + threshold-based recommendation ("this VPS has averaged >85% CPU for 7 days, recommend upgrading to the next tier").
3. Surface recommendations in both the tenant's VPS page and Super Admin's monitoring view.
Acceptance: recommendations are based on real historical data, not hardcoded; a synthetic high-usage test VPS produces a visible recommendation.
```
- **Status: done.** `VpsRecommendation` model + migration added. `services/monitoring/src/recommendation/` with `RecommendationService` (7-day moving-average threshold logic: >85% warning, >90% critical), `RecommendationController` (`GET /monitoring/recommendations/vps/:vpsId`, `/monitoring/recommendations`, `POST /:id/acknowledge`), and `RecommendationScheduler` (`@Cron` daily at 6AM). Frontend: `RecommendationsTab` on VPS detail page. Data sourced from real `UsageMetric` records.

### Prompt 5.2 — Automated backup scheduling
```
Task: Add scheduled Proxmox VM backups.
1. Prisma model for BackupSchedule (vpsId, frequency, retentionCount).
2. RabbitMQ-driven cron worker that triggers Proxmox snapshot/backup API calls per schedule.
3. Enforce retention (delete oldest backup beyond retentionCount).
4. UI: schedule configuration on the VPS detail page, backup history list with restore action.
Acceptance: a scheduled backup actually runs and is restorable — verify with a test restore, not just "backup succeeded" logging.
```
- **Status: done.** `BackupSchedule` model already existed. `services/vps/src/backup/backup-scheduler.service.ts` with hourly `@Cron` tick scanning due schedules, creating `CloudBackup` (`SCHEDULED`), placeholder Proxmox trigger, and retention enforcement. `BackupsTab` added to VPS detail page with schedule form and backup history + restore.

### Prompt 5.3 — Custom domain + SSL management
```
Task: Allow tenants to attach a custom domain to their VoidCloud-hosted service.
1. Domain verification via DNS TXT record challenge.
2. Automatic SSL cert issuance via cert-manager + Let's Encrypt once verified, wired into the K8s ingress for that tenant's routes.
3. UI: add domain, see verification status, see cert status/expiry.
Acceptance: a verified domain gets a working HTTPS cert automatically, with renewal handled by cert-manager (no manual renewal steps).
```
- **Status: done.** `Domain` model already existed; added `status` field (`PENDING_VERIFICATION` / `VERIFIED`). `services/vps/src/vps/vps.service.ts` extended with `addDomain`, `listDomains`, `verifyDomain`, `getDomainStatus`. `DomainVerificationScheduler` performs real DNS TXT lookups every hour. `DomainsTab` on VPS detail page with add + verify flow.

### Prompt 5.4 — API usage analytics per tenant
```
Task: Track and surface API call volume per tenant.
1. Middleware/interceptor in the API gateway logging tenantId, endpoint, timestamp, response time, status code (sample or batch-write to avoid overhead on every request).
2. Dashboard: requests over time, top endpoints, error rate, per-tenant breakdown for Super Admin, and a tenant's own usage view.
Acceptance: a tenant can see their own API usage; Super Admin can see all tenants; overhead added to each request is negligible (benchmark before/after).
```
- **Status: done.** `ApiUsageLog` model + migration added. `shared/api-usage/api-usage.middleware.ts` batches writes (flush every 10 records) with negligible overhead. Applied to `MonitoringModule` and `VpsModule`. `AnalyticsService` extended with `tenantUsage`, `allTenantsUsage`, `topEndpoints`. New endpoints: `GET /analytics/usage/me`, `/analytics/usage/tenants`. Frontend: API Usage section added to dashboard analytics page.

### Prompt 5.5 — Webhook management
```
Task: Let tenants register outbound webhooks for platform events (new lead, VPS status change, invoice paid, etc.).
1. Prisma model: Webhook (tenantId, url, events[], secret for HMAC signing).
2. Delivery worker via RabbitMQ, with retry/backoff (e.g. 3 retries, exponential) and a delivery log (status, response code, timestamp).
3. UI: register/edit webhooks, view delivery history, manually resend a failed delivery.
Acceptance: registering a webhook for "lead.created" and creating a test lead triggers a correctly HMAC-signed POST to the registered URL; a failing endpoint retries per policy and logs each attempt.
```

### Prompt 5.6 — Custom report generation (PDF/CSV)
```
Task: Add report export to Billing and VPS usage views.
1. CSV export: straightforward server-side generation from existing query results.
2. PDF export: use a PDF generation toolchain for a clean, branded report layout (VoidCloud logo, tenant name, date range, summary table, chart image if applicable).
Acceptance: exported PDF renders correctly (no layout breakage) for both a small dataset and a large one (100+ rows / long date range).
```

### Prompt 5.7 — PWA support
```
Task: Add a web app manifest and service worker to the Next.js frontend so it's installable and has basic offline shell caching.
1. manifest.json with VoidCloud branding/icons.
2. Service worker caching static assets and shell (not API data — don't cache sensitive tenant data offline).
3. Verify installability via Lighthouse PWA audit.
Acceptance: Lighthouse PWA score is green; app is installable on mobile and desktop Chrome.
```

### Prompt 5.8 — Chat support integration + knowledge base
```
Task:
1. Deploy Chatwoot (github.com/chatwoot/chatwoot, MIT) as-is, from a pinned official image, per the third-party tool rules established elsewhere in this backlog — do not vendor its source. It natively supports WhatsApp as a channel, which fits directly alongside VoidCloud's existing WhatsApp CRM rather than being an unrelated bolt-on. Embed its widget into the frontend, scoped so it's available to all logged-in roles.
2. Build a simple knowledge base / help center at /help with searchable articles (Markdown-backed, no heavy CMS needed at this scale).
Acceptance: widget appears platform-wide; help center search returns relevant articles for a few test queries; a support conversation started via the widget is also visible/manageable from Chatwoot's own agent inbox.
```

### Prompt 5.9 — Referral program UI
```
Task: Surface the existing Referral, ReferralEarning, and ReferralPayoutRequest models in the frontend — the backend data model exists but has no UI.
1. USER/ADMIN dashboard widget: personal referral code/link, count of successful referrals, total earnings, pending payout balance.
2. Referral history table: referred user (masked if needed), signup date, conversion status, earning amount.
3. Payout request flow: form to request payout (method + destination per existing schema fields), status tracking (pending/processed).
4. Super Admin view: all referrals platform-wide, approve/reject pending payout requests, referral program settings (commission rate, if configurable).
Acceptance: a test referral signup produces a visible earning entry tied to the referrer; a payout request is submitted and appears in the Super Admin's approval queue.
```

### Prompt 5.10 — Custom image / snapshot marketplace UI
```
Task: Surface the existing CustomImage and CustomImageShare models — snapshot/custom-image creation exists at the data layer with no UI.
1. VPS detail page: "Save as custom image" action, creating a CustomImage from the current VM state (via existing Proxmox snapshot mechanics).
2. Custom images library page: list of the tenant's own saved images, with name/description/size, and a "deploy new VPS from this image" action feeding into the existing provisioner (Prompt 2.1).
3. Sharing: share an image with another user by email (CustomImageShare), and a "shared with me" section showing images others have shared.
4. If isPublic is set, a lightweight public marketplace browse view (read-only for now) showing publicly shared images available to any tenant.
Acceptance: creating a custom image from a running VPS and deploying a new VPS from it results in a correctly cloned instance; sharing an image with a specific user's email makes it visible only to that recipient, not all tenants.
```

### Prompt 5.11 — Public status page
```
Task: Build a public status page at /status backed by the existing Incident and IncidentUpdate models (already in schema and already in the frontend route list).
1. Public, unauthenticated page showing current platform status (operational / degraded / partial outage / major outage) derived from open Incidents, plus a rolling uptime history (reuse ServiceHealthLog hourly rollups from Prompt 0.10 if suitable, or a simpler public-facing aggregate).
2. Incident timeline: list of past incidents with their IncidentUpdate history (investigating → identified → monitoring → resolved), timestamps, and affected services.
3. Admin-only incident management: create/update an incident and post updates, which immediately reflect on the public page.
4. Optional: email/webhook subscription for status updates (can be deferred to a follow-up if scope is too large for one turn).
Acceptance: creating an incident and posting an update in the admin panel is visible on the public /status page within seconds, with no auth required to view it; historical incidents remain visible after resolution.
```

### Prompt 5.12 — One-click app marketplace
```
Task: Surface the existing CloudDeployment.apps and installedApps fields — an app-install mechanism exists in schema with no UI or install logic.
1. Define a small initial catalog (e.g. WordPress, Docker, a basic LEMP/LAMP stack) as a static config, each with an install script/method for Proxmox-provisioned VMs.
2. VPS detail page: "Install app" flow — pick from catalog, confirm, queue install as an async RabbitMQ job (matching the pattern from Prompt 2.1), track status (installing/installed/failed).
3. Store installed app metadata in installedApps (version, install date, install method) and update the apps array.
4. Show installed apps on the VPS detail page with basic management (view logs, uninstall where feasible).
Acceptance: installing WordPress on a test VPS results in a working, reachable WordPress instance at the VPS's IP/domain; installedApps correctly reflects what's actually running.
```

### Prompt 5.13 — Third-party app marketplace catalog (fork-and-extend, see "A Note on Third-Party Code")
```
Task: Extend the Prompt 5.12 app marketplace catalog with the following battle-tested, permissively-licensed open-source tools. These are commodity capabilities a customer expects but would never care who built. Every tool here is built from your own `vendored/{tool}/` fork (see "A Note on Third-Party Code" for the fork-first git workflow, pinned upstream commit, and Renovate-tracked deliberate upstream merges) — none are pulled unmodified from an official image. Provision each through the existing async RabbitMQ job pattern from Prompt 2.1, per-tenant (or shared multi-tenant where the tool supports orgs/workspaces natively).

Image sourcing: pin every fork to a specific upstream commit/tag at fork time, never track a moving upstream branch. Build your own Dockerfile from each fork and push to the existing Harbor registry rather than any public registry, so Harbor's built-in Trivy scan runs against every image before it's deployed.

Catalog additions:
1. code-server (github.com/coder/code-server, MIT) — VS Code in the browser. `vendored/code-server/`. One container per tenant/VPS, exposed via the existing ingress pattern.
2. Gitea (github.com/go-gitea/gitea, MIT) + Woodpecker CI (github.com/woodpecker-ci/woodpecker, Apache-2.0) — self-hosted git + pipelines. `vendored/gitea/` + `vendored/woodpecker/`. Provision one Gitea "organization" per tenant via Gitea's API at signup/request time; wire Woodpecker as the CI runner against that org.
3. Portainer CE (github.com/portainer/portainer, Zlib) — container management GUI, `vendored/portainer/`, one instance per tenant scoped to their own VPS/namespace only.
4. Postal (github.com/postalserver/postal, MIT) — self-hosted transactional mail server. This can also replace the personal-Gmail-SMTP dependency flagged in Tier 0's manual steps — evaluate migrating services/email's outbound mail through a shared Postal instance instead of Gmail. Tenants never get their own Postal account — if tenant-initiated sending is ever needed, issue each tenant a scoped Postal API key surfaced through your own dashboard, not a login.
5. Umami (github.com/umami-software/umami, MIT) — lightweight, privacy-friendly web analytics. Deploy as a single shared multi-tenant instance (Umami natively supports multiple tracked "websites" per account) rather than one container per tenant.
6. OpenTelemetry Collector (github.com/open-telemetry/opentelemetry-collector, Apache-2.0) — not a marketplace catalog item, but the standard sidecar/collector for Prompt 6.2's distributed tracing. Deploy once, cluster-wide, and configure NestJS services to export traces to it — never fork or modify its source, only its config.

For each of items 1-4 (and 5 where relevant): add to the static catalog config from Prompt 5.12, with its own install/provision method, status tracking (installing/installed/failed), and teardown-on-VPS-deletion cleanup.

Identity architecture — tenants NEVER see a separate signup/login form for any of these tools, and VoidCloud never stores or manages a second credential per tool per tenant. Three distinct patterns apply depending on what each tool supports (see Prompt 5.13a for how the OIDC piece gets configured without manual clicking):
1. **True SSO via OIDC (Gitea, and Woodpecker riding on Gitea's identity)** — services/auth exposes a standard OIDC provider endpoint; Gitea is registered as an OIDC client trusting it. On first login, Gitea auto-provisions its own internal user record for the tenant via standard OIDC auto-provisioning — no signup form is ever shown. Portainer follows the same OIDC-client pattern for its own login.
2. **Network-gated access, no accounts at all (code-server)** — code-server runs with its own auth disabled (`--auth none`); an authenticating reverse proxy (oauth2-proxy or equivalent) sits in front, checks the tenant's existing VoidCloud session/JWT, and transparently passes the request through if valid. The tenant never sees a code-server login screen.
3. **Scoped share-tokens, no accounts (Umami)** — generate a per-tenant, per-site share token via Umami's API at provision time; embed/link directly to that scoped view from the VoidCloud dashboard. The tenant never logs into Umami directly.

Frontend:
1. A dedicated "Add-ons" (or "Marketplace") section — either its own nav item or a tab on the VPS detail page, whichever fits the existing navigation better — showing a card grid: one card per tool (code-server, Gitea+Woodpecker, Portainer, Postal, Umami), each with icon, one-line description, and a state-appropriate action button.
2. Per-tool state must be visibly one of: Not Installed / Installing (with progress indicator, matching the async job UX already used for VPS provisioning in Prompt 2.1) / Running / Failed (with retry action).
3. Once Running, a "Launch" action opens the tool in a new tab, landing the tenant directly in an authenticated session per the identity architecture above — zero additional login step for any tool in this catalog.
4. A lightweight per-tool management panel showing tool-specific status/links relevant to that tool (e.g. Gitea: org URL + repo count; Postal: verified sending domain status; Umami: link to that tenant's analytics dashboard).
5. Uninstall/teardown action with an explicit confirmation step before destroying the container and any provisioned tenant-scoped resources (Gitea org, Portainer instance, etc.) — same confirm-before-destroy pattern as cluster deletion (Prompt 0.8).

Acceptance: a tenant can browse the Add-ons section, install code-server, Gitea+Woodpecker, Portainer, or Umami with one click, watch it transition through the installing/running states, launch it directly into a working, already-authenticated session with zero additional login step, and tear it down cleanly with a confirmation step; deleting the parent VPS or unsubscribing also cleanly tears down any still-running add-ons rather than leaving orphaned resources; OTel Collector is verified receiving traces from at least one instrumented service (this one has no customer-facing UI — it's operator-only infrastructure, not a marketplace item); every deployed image is a pinned version pulled from Harbor, not `:latest` from a public registry.
```

### Prompt 5.13a — Automated OIDC bootstrap for third-party tools (no manual admin-panel steps)
```
Task: Every tool in Prompt 5.13 that supports OIDC (Gitea, Portainer) must be configured as an OIDC client entirely through automation — no person should ever need to open Gitea's or Portainer's admin UI and click through an OAuth setup form, not on first deploy and not on any future redeploy or new environment.

1. Choose and wire an OIDC provider into services/auth (e.g. the `oidc-provider` npm package, run inside the existing auth service rather than standing up a separate identity service) exposing a standard `/.well-known/openid-configuration` discovery endpoint.
2. Write a one-time bootstrap Job (same pattern as kubernetes/migrate-job.yaml — a Kubernetes Job with `restartPolicy: OnFailure`, not a long-running pod) per tool, that runs automatically once that tool's pod reports healthy:
   - For Gitea: call Gitea's own admin API (`POST /api/v1/admin/auths` or the equivalent current endpoint) to register services/auth as an OpenID Connect authentication source, using the discovery URL from step 1.
   - For Portainer: call Portainer's settings API (`PUT /api/settings` or equivalent) to configure the OAuth provider the same way its admin UI would.
3. The bootstrap Job generates the OIDC client_id/client_secret pair itself (or receives it from services/auth's provider registration), and writes the resulting secret directly into Vault — never into a human's clipboard or a manually-edited K8s Secret.
4. Wire this bootstrap Job into the same deploy pipeline as the migrate job, so it runs automatically on every fresh environment (staging, DR, a future second region) without anyone remembering a manual checklist step.
5. Idempotency: running the bootstrap Job again against an already-configured tool must be a safe no-op (check-then-set, not blind re-create), so redeploys don't create duplicate OAuth client registrations.
Acceptance: standing up a completely fresh environment from scratch (new namespace, new Gitea/Portainer pods) results in both tools fully OIDC-configured and ready for tenant SSO with zero manual admin-panel interaction, verified by tearing down and recreating a test environment end-to-end and confirming SSO login works immediately without any human touching Gitea's or Portainer's settings UI.
```

### Prompt 5.13b — Semantic code indexing in code-server via the local Ollama embedding model
```
Task: Give tenants Kilo-Code-style semantic codebase search inside their code-server workspace, using the Tier A local Ollama model from Prompt 5.15 — without touching code-server's own source. This is a VS Code Extension API integration, not a core modification: code-server IS VS Code running in a browser, and it supports the same public Extension API that Kilo Code, Cline, Continue, and Copilot are all themselves built on.

1. Either (a) write a small custom VS Code extension that calls the existing Tier A Ollama endpoint (nomic-embed-text or equivalent embedding model) to index the tenant's open workspace and provide semantic search/RAG-style code lookup, or (b) bundle an existing open-source extension with this capability already built (e.g. Kilo Code itself, if its license permits redistribution — confirm before bundling) pre-configured to point at the Tier A Ollama endpoint by default. Prefer (b) if a suitable existing extension's license allows it — less custom code to maintain.
2. Bake the chosen extension into the `vendored/code-server/` Docker image at build time via `code-server --install-extension <id-or-vsix>`, so every tenant's code-server instance has it available with no per-tenant setup step.
3. Point the extension's Ollama endpoint at the same Tier A infrastructure from Prompt 5.15 (resource-limited, node-anti-affinity-protected from Postgres) — do not stand up a second Ollama instance for this.
4. Confirm resource impact: indexing a tenant's workspace triggers embedding requests against the shared Ollama instance — verify this doesn't create a noisy-neighbor problem across tenants sharing that instance under real usage, and consider whether a lightweight per-tenant rate-limit on indexing requests is warranted.
Acceptance: a tenant opening their code-server workspace has semantic code search available without any setup step; the feature is verified to actually call the local Ollama endpoint rather than a hosted API (confirm no external API calls occur for this specific feature, consistent with Tier A's advisory-only, no-external-cost design); indexing a large workspace doesn't visibly degrade the shared Ollama instance's response time for other tenants during a load test.
```

### Prompt 5.14 — Compact desktop client for code-server (downloadable from browser)
```
Task: Give tenants a lightweight native Windows desktop client for their code-server instance (from Prompt 5.13), as an alternative to using it purely in-browser — same backend, same session, same APIs, just a native window instead of a browser tab.

Do NOT build a second, separate IDE or duplicate code-server's editing logic. The desktop client is a thin wrapper around the exact same code-server web session already provisioned per-tenant — same URL, same auth bridge, same REST/WebSocket endpoints code-server itself exposes. The "IDE" stays entirely server-side; the desktop app is just a native shell around it.

1. Build the wrapper using Tauri (not Electron) — Tauri produces a dramatically smaller binary (typically 3-10MB vs. Electron's 100MB+ range) by using the OS's native WebView instead of bundling Chromium, which matches the "compact" requirement. The Tauri shell loads the tenant's code-server URL directly, the same one used by the browser "Launch" button in Prompt 5.13.
2. Authentication: on first launch, the desktop app authenticates against services/auth the same way the web app does (reuse the existing login flow/JWT issuance) and then opens the tenant's code-server session using that token — do not build a separate auth mechanism for the desktop client.
3. The desktop app should expose the same underlying code-server APIs/endpoints the browser version uses (file operations, terminal, extensions) — since it's the same backend session, this should require no new backend endpoints, only the native shell consuming what already exists.
4. Add a "Download Desktop App" button on the code-server card in the Add-ons section (Prompt 5.13's frontend) offering the compiled .exe (and optionally .dmg/.AppImage if cross-platform is wanted later — Windows-only .exe is the explicit ask here).
5. CI: add a build step producing the signed (or at least reproducibly-built) .exe artifact, hosted for download from the same frontend/CDN infrastructure already serving other static assets — do not stand up a separate distribution system.
6. Auto-reconnect: if the tenant's code-server container restarts or the VPS is stopped/started, the desktop client should detect the disconnect and reconnect automatically once the session is available again, rather than requiring a manual relaunch.
Acceptance: downloading and running the .exe on a clean Windows machine opens directly into the tenant's code-server session (same files, same terminal state) after a single login, with no separate installation of code-server itself required; the binary size is meaningfully smaller than an equivalent Electron wrapper (verify actual size); stopping and restarting the underlying VPS/container is followed by automatic reconnection in the desktop client without a manual relaunch.
```

### Prompt 5.15 — Native AI assistant (tiered: local model for advisory tasks, hosted API for account actions)
```
Task: Build a native AI assistant that can see and act on a tenant's real VoidCloud data — "why is my VPS slow," "top up my credits," "show me my last invoice" — as a genuine product differentiator, distinct from Chatwoot's generic support widget (Prompt 5.8). This is a two-tier architecture based on risk, not one model doing everything:

**Tier A (advisory only, human reviews before anything happens) — local Ollama, self-hosted, no external API cost:**
- Deploy within the existing `voidcloud` namespace (a separate namespace provides no real resource isolation here, since everything ultimately shares the same Proxmox host) — protection instead comes from two concrete mechanisms: explicit Kubernetes `resources.requests`/`resources.limits` on the Ollama deployment (cgroup-enforced, caps its CPU/memory regardless of namespace), and `nodeAffinity`/anti-affinity rules keeping Ollama's pod off whichever worker node Postgres is pinned to (the existing `nodeSelector: kubernetes.io/hostname: workernode01` on the postgres deployment) — schedule Ollama onto a different worker node so a heavy inference request can never contend with Postgres for the same physical CPU.
- CPU-only inference (no usable GPU acceleration is available on the current hardware — do not attempt ROCm/ollama GPU passthrough on the AMD Oland-generation card, it predates ROCm's supported hardware range entirely and will not accelerate anything).
- Used only for: draft suggestions a human reviews before acting (see Prompt 5.16) — never for anything that executes a real action on its own.

**Tier B (executes real account actions via tool-calling) — hosted API (Claude or GPT-class model), never the local model:**
- A small new service (or folded into services/notification) exposing a chat endpoint, calling the hosted LLM API directly — no agent framework needed for the call itself.
- Tool-calling wired to VoidCloud's own internal APIs: check credit balance, VPS status, open a support ticket, trigger a VPS restart, show recent invoices. The assistant is an interface into VoidCloud's existing endpoints, not a new source of truth — every tool call must go through the exact same RBAC/ownership checks (e.g. findOwned()) as the equivalent dashboard action, no bypass for the assistant.
- Reasoning for hosted-over-local here: tool-calling reliability on a small local model is meaningfully weaker than a frontier hosted model, and a hallucinated or malformed tool call in this tier could restart the wrong tenant's VPS or misfire a billing action — the cost of a hosted API call for this specific, bounded use case is negligible next to that risk.
- Every tool call the assistant makes must be audit-logged exactly like a human performing the same action, including which tenant/session invoked it.

Frontend: a simple, reusable chat-bubble component available across every dashboard page, clearly indicating when the assistant is about to take a real action (confirm-before-execute for anything destructive or financial, same pattern as other high-stakes UI in this backlog) versus just answering a question.

Acceptance: a tenant can ask "what's my VPS status" and get a live, accurate answer sourced from real data; asking it to restart a VPS or top up credits requires an explicit confirmation step before the tool call executes; the assistant cannot access or act on any tenant's data other than the one asking (verified by the same cross-tenant test pattern used elsewhere — Tenant A's session can never trigger an action on Tenant B's VPS via the assistant); Tier A's local model is verified to never be the one executing tool calls, only Tier B's hosted model is wired to the tool-calling path.
```

### Prompt 5.16 — AI-driven feature set (built on Prompt 5.15's Tier A local model)
```
Task: Three advisory-only AI features, all using Prompt 5.15's Tier A local Ollama model (a human reviews/approves every output before anything happens — none of these execute actions on their own):

1. AI log/incident triage — when Prompt 6.3a's tenant VPS-down Slack alert (or Prompt 6.3's platform alert) fires, feed the relevant ServiceHealthLog/VpsHealthLog context (failure classification, recent history) to the local model and include an AI-generated one-line likely-diagnosis in the Slack message, clearly labeled as an AI suggestion, not a confirmed root cause.
2. AI-assisted WhatsApp reply drafts — in the CRM's conversation view, offer a "suggest a reply" action that drafts a response (or summarizes a long thread for an agent picking it up cold) using the local model — the agent reviews, edits, and sends manually. Never auto-send.
3. AI usage advisor — analyze a tenant's VPS running-time pattern (from Prompt 2.2a's CreditTransaction ledger or Prompt 5.1's usage history) and surface a passive recommendation on the dashboard, e.g. "this VPS has been idle 80% of this month — switching to PAY_AS_YOU_GO could save an estimated $X" — a suggestion the tenant can act on or dismiss, never an automatic billing-mode change.
Acceptance: each of the three features produces a clearly-labeled "AI suggestion" that requires a human action to take effect — none of them can independently restart a service, send a message, or change a billing mode; the incident-triage summary is verified against at least one real simulated outage to confirm it reflects the actual failure classification rather than a generic response.
```

### Prompt 5.17 — Managed WAF / security add-on tier
```
Task: Surface the existing VpsSecuritySettings model — wafEnabled, wafPreset, ddosTier, and fimEnabled (file integrity monitoring) are already fully modeled in schema with zero enforcement logic or UI built around them. This is the same pattern as Prompts 5.9-5.12: the data layer already exists, only the feature itself is missing. A managed WAF/security tier is a genuine revenue line for hosting platforms (this is essentially Cloudflare's and Sucuri's entire business model) and needs no new Prisma migration to get started.

1. WAF enforcement: wire wafEnabled + wafPreset (e.g. an OWASP core ruleset) into the actual request path for a tenant's VPS-hosted domain — either via a per-tenant reverse-proxy rule (Traefik middleware, given Traefik is already the ingress controller) or an upstream WAF layer, whichever fits the existing ingress architecture better without disrupting other tenants' routing.
2. DDoS tier enforcement: wire ddosTier (e.g. BASIC vs. a higher tier) into real rate-limiting/traffic-shaping rules — this can share infrastructure with Prompt 2.3's rate-limiting work rather than building a second independent system.
3. File integrity monitoring: implement fimEnabled as a lightweight per-VPS agent or scheduled check watching a configurable set of paths for unexpected changes (e.g. system binaries, web roots), alerting the tenant (and optionally the SUPER_ADMIN) via services/notification when a change is detected.
4. Frontend: a "Security" tab on the VPS detail page exposing WAF on/off + preset selection, DDoS tier selection, and FIM on/off + monitored-paths configuration — gate the higher DDoS tier and FIM behind a paid add-on if that's the intended monetization (confirm pricing approach before implementing the paywall gate).
5. Super Admin view: platform-wide security-tier adoption breakdown, and a way to see/investigate triggered FIM alerts across tenants.
Acceptance: enabling WAF on a test tenant's VPS visibly blocks a simulated common attack pattern (e.g. a basic SQLi/XSS test payload) against that domain; a file integrity check flags a deliberately modified monitored file and notifies the tenant; disabling any of these three features cleanly reverts to the previous unprotected state without breaking the VPS's normal traffic.
```

---

## A NOTE ON THIRD-PARTY CODE — WHAT TO VENDOR VS. WHAT TO KEEP NATIVE

**Do not reimplement any of these tools from scratch in NestJS/TypeScript, regardless of how far VoidCloud's stack consistency goal goes.** Gitea, Woodpecker, Portainer, and Postal/Maddy implement mature, protocol-level systems (Git's wire protocol, SMTP + DKIM/DMARC/SPF, container/K8s orchestration, sandboxed pipeline execution) representing years of accumulated hardening by dedicated teams — a from-scratch rewrite isn't "porting a feature," it's building five competing products from zero, with none of the security scrutiny the originals have had, and it permanently cuts off future upstream security fixes. This applies even when the goal is "I might want to add a feature later" — see the rule below for why that almost never requires a rewrite.

**Before assuming a feature idea requires source access or a rewrite, check whether the tool already has its own sanctioned extension/plugin/webhook/API mechanism — it almost always does, and using it is dramatically lower-risk and less work than reimplementing.** Concrete example: wanting Kilo-Code-style local-Ollama semantic code indexing inside the code-server offering doesn't require touching code-server's source at all — Kilo Code, Cline, Continue, and Copilot are all *VS Code extensions* built on VS Code's standard public Extension API, and code-server supports that same API natively since it *is* VS Code running in a browser. The correct path: write a small extension (or bundle an existing open-source one like Kilo Code itself, pre-configured to point at the Tier A Ollama endpoint from Prompt 5.15) baked into the `vendored/code-server/` Docker image at build time via `code-server --install-extension`. Apply this same check to every other tool before considering a rewrite: Gitea (webhooks + REST API + a growing plugin system), Portainer (its own extension/plugin mechanism + REST API), Woodpecker (a plugin system specifically for pipeline steps), Maddy (a modular, config-driven architecture where "add a feature" is usually "add a module to config," not new code).

**Deploy-as-is (Category 1) is no longer used — every marketplace tool is fork-and-extend, built together with the rest of VoidCloud now and deployed later.** Each tool is forked on GitHub first (not cloned directly from upstream — a direct clone gives no push access anywhere), cloned into its own subfolder under a git-committed `vendored/` directory (distinct from `reference-only/`, which stays gitignored and never built), with `upstream` set as a remote for pulling future updates deliberately. Each vendored tool keeps its own `Dockerfile`, its own Harbor-hosted image with Trivy scanning, and its own `kubernetes/{tool}/deployment.yaml` + `service.yaml` — extending the exact same per-service folder convention already used for the 13 NestJS services, so every vendored tool stays independently buildable, upgradable, and redeployable on its own schedule, matching VoidCloud's microservice philosophy rather than becoming entangled with `services/*` or with each other. Modifications to a tool's own internals stay inside that tool's own `vendored/{tool}/` folder and build — never spliced as fragments directly into `services/*` or `frontend/src`, which would both break upstream upgradability and risk silently dropping the tool's required license attribution (MIT/Apache/Zlib all require preserving copyright notices wherever the code ends up).

**Fork-and-extend, tracked in `vendored/`:**
- **code-server** (`vendored/code-server/`, github.com/coder/code-server, MIT) — already started.
- **Gitea** (`vendored/gitea/`, github.com/go-gitea/gitea, MIT).
- **Woodpecker CI** (`vendored/woodpecker/`, github.com/woodpecker-ci/woodpecker, Apache-2.0).
- **Portainer CE** (`vendored/portainer/`, github.com/portainer/portainer, Zlib).
- **Umami** (`vendored/umami/`, github.com/umami-software/umami, MIT) — strong candidate given it's the same Next.js stack as VoidCloud's own frontend.
- **Mail server** (`vendored/maddy/` OR `vendored/postal/`, decide one) — **Maddy** (github.com/foxcpp/maddy, single Go binary) recommended for stack-familiarity given existing Go experience with sub2api; **Postal** (github.com/postalserver/postal, Ruby) is more feature-mature for transactional mail specifically (webhooks, IP pool management, delivery tracking) if that maturity matters more than language familiarity.

For every `vendored/` tool: fork on GitHub first, then clone your fork (not upstream directly) so you have push access; add `upstream` as a remote; pin to a specific commit/tag at fork time; track upstream releases via Renovate/Dependabot (open a PR to merge upstream changes, review and rebase deliberately — don't auto-merge); build your own image from your fork (`FROM` your own Dockerfile, not upstream's) pushed to Harbor with Trivy scanning.

**OpenTelemetry Collector — do not clone anything for this one, different workflow entirely.** The Collector is deliberately plugin-architected (receivers/processors/exporters as pluggable Go modules) — forking the core repo, or even cloning the enormous `opentelemetry-collector-contrib` monorepo, fights how the project is meant to be extended. The correct approach: `go install go.opentelemetry.io/collector/cmd/builder@latest`, then create `vendored/otel-custom-distro/` containing a small `builder-config.yaml` listing exactly which components are wanted (pulled in as Go module dependencies, not cloned source) — the builder generates the actual distribution source into that folder, which is then tracked and built normally, same Dockerfile/Harbor/K8s treatment as everything else.

**Study for architecture/UX patterns only — never copy code, build natively in the corresponding VoidCloud service** (unchanged, these remain reference-only, not vendored, since they're feeding a native feature rather than becoming a deployed dependency):
- **Tenant uptime monitoring** — reference Uptime Kuma (github.com/louislam/uptime-kuma) for check-scheduling patterns, but build the feature directly into `services/monitoring`, extending the existing `@Interval`/cron infrastructure from Prompt 0.9 rather than running a second app with its own database to keep in sync.
- **Usage-based billing metering** — reference OpenMeter (github.com/openmeterio/openmeter) for metering-event patterns, but keep the actual metering logic inside `services/billing` alongside the existing `CloudInvoice`/Paymob integration (Prompt 0.16) rather than reconciling against a separate metering engine.
- **Notification delivery** — reference Novu (github.com/novuhq/novu) for its unified multi-channel API design, but keep `services/notification` native since it already has its own Prisma models and WebSocket wiring (Prompt 7.3).
- **Deploy-from-git / PaaS patterns** — reference Dokploy (github.com/Dokploy/dokploy, TypeScript, Apache-2.0) for provisioning/deploy-hook patterns if VoidCloud ever adds "deploy an app from a git repo" as a feature. Don't vendor this now — revisit only if that becomes an actual roadmap item.
- **Backup/restore internals** — reference restic (github.com/restic/restic) for retention/dedup logic when building Prompt 5.2's backup scheduler; call restic as a binary/library from `services/vps`, don't vendor its source.

**Do not use, licensing risk:**
- **Twenty CRM** (github.com/twentyhq/twenty) is AGPL-3.0. Do not fork or adapt its source into `services/crm` — AGPL requires releasing modified source to users of a hosted/network service, which would conflict with VoidCloud being a paid, closed-source product. `services/crm` stays a fully custom build. Any AGPL-licensed project considered in the future should get the same treatment: reference for ideas only, if that, never vendored code. Given the AGPL risk, do not even clone Twenty's source into the reference-only scratch folder below — browse their public docs/demo instead if UX inspiration is wanted.

---

## WORKING WITH REFERENCE-ONLY CLONES (repo hygiene)

For the reference-only tools above, cloning them locally so an in-browser IDE/agent can read them is fine and often necessary — but keep them out of the actual product repo's tracked history. Exact repo → local path → purpose mapping:

| Tool | Clone with | Local path | Study for → build natively in |
|---|---|---|---|
| Uptime Kuma | `git clone https://github.com/louislam/uptime-kuma` | `reference-only/uptime-kuma/` | Check-scheduling patterns → `services/monitoring` (extends Prompt 0.9's `@Interval` infra) |
| Dokploy | `git clone https://github.com/Dokploy/dokploy` | `reference-only/dokploy/` | Deploy-from-git/PaaS provisioning hooks → not built yet, revisit only if this becomes an actual roadmap item |
| restic | `git clone https://github.com/restic/restic` | `reference-only/restic/` | Backup retention/dedup logic → `services/vps`'s backup scheduler (Prompt 5.2); call restic as a binary/library, don't port its Go source |
| OpenMeter | `git clone https://github.com/openmeterio/openmeter` | `reference-only/openmeter/` | Usage-metering event patterns → `services/billing`, alongside existing `CloudInvoice`/Paymob logic (Prompt 0.16) |
| Novu | `git clone https://github.com/novuhq/novu` | `reference-only/novu/` | Unified multi-channel notification API design → `services/notification` (Prompt 7.3) |
| sub2api-main | (already local — move, don't re-clone) | `reference-only/sub2api-main/` | This is VoidCloud's own existing Go/Gin subscription-management codebase, not a third-party project — but it's architecturally unrelated to the NestJS/Prisma microservices stack (own TypeORM/Postgres setup, own Go module). Per Tier 8, it is deliberately NOT being merged into VoidCloud — it's being repurposed as an independent Lovable + Supabase app-generator product built fresh. Moving it here physically enforces that separation: nothing in `services/*` or CI should ever import from or build against this path. Reference it only if a specific pattern (e.g. its subscription/API-key data model) is worth reading for inspiration while building Tier 8's fresh Supabase schema. |

**Twenty CRM is deliberately excluded from this table and this folder** — do not clone it at all, even for reference, given the AGPL-3.0 risk. Browse their public docs/hosted demo in a browser instead.

Setup steps:
1. Clone the five external repos above into `reference-only/` at the repo root, one subfolder per tool, exactly as listed. Move (don't re-clone) `sub2api-main/` from repo root into `reference-only/sub2api-main/` as its sixth entry.
2. Add `reference-only/` to `.gitignore` — this keeps every file locally readable by any IDE/agent, but guarantees none of it is ever committed, diffed, or pushed.
3. Add `reference-only/` to `.dockerignore` too, so a careless `COPY . .` in any Dockerfile can never bake five other projects' source trees into a production image.
4. Do not let the folder name match any glob in `pnpm-workspace.yaml`'s `packages:` list (currently `artifacts/*`, `lib/*`, `lib/integrations/*`, `scripts`) — this would cause pnpm to try installing these projects as workspace packages.
5. Never run `npm install`/`pnpm install` inside any of the cloned projects — they're there to be read, not run.
6. Standing instruction for any AI tool given access to this folder: *"reference-only/ contains cloned open-source projects (plus VoidCloud's own archived sub2api-main) for pattern study ONLY — it is gitignored and must never be imported from, copied verbatim, or referenced in any file under services/ or frontend/. Read the specific tool/path relevant to the current task (see the mapping table in voidcloud-backlog.md), then implement natively using our own conventions."*
7. Before moving `sub2api-main/` out of root: grep the repo for any existing references to its path (CI workflow files, `.goreleaser.yaml`, root-level `package.json`/`pnpm-workspace.yaml` entries, any doc mentioning it) and remove/update those references so nothing in the active build/CI pipeline still expects it at the old location.

---

## TIER 6 — PROFESSIONAL/INFRA ENHANCEMENTS

### Prompt 6.1 — Structured logging + correlation IDs
```
Task: Add a X-Request-ID (or X-Correlation-ID) header generated at the API gateway, propagated through every downstream service call (HTTP headers + RabbitMQ message metadata).
1. All services log in structured JSON including this ID.
2. Deploy Loki + Promtail (if not already, per your Grafana setup) to aggregate logs across all 13 services.
3. Add a "trace this request" search in the monitoring dashboard: paste a request ID, see every log line across services that share it.
Acceptance: a single request touching 3+ services can be fully traced via one ID in the monitoring dashboard.
```

### Prompt 6.2 — Distributed tracing
```
Task: Instrument services with OpenTelemetry, exporting to Jaeger or Grafana Tempo.
1. Auto-instrument HTTP calls, Prisma queries, and RabbitMQ publish/consume in each NestJS service.
2. Add a Tempo/Jaeger panel link from the monitoring dashboard.
Acceptance: a slow VPS provisioning request shows a trace breaking down time spent per service/DB call.
```

### Prompt 6.3 — On-call alerting
```
Task: Wire AlertManager (already referenced in your monitoring setup) to a real notification channel — Slack webhook or PagerDuty/Opsgenie.
1. Alert rules: platform health % below threshold, any service DOWN for >2 consecutive checks, Postgres/Redis/RabbitMQ unreachable.
2. Test by manually killing a service pod and confirming the alert fires within the expected interval.
Acceptance: a real alert lands in Slack/PagerDuty within 1-2 minutes of a simulated outage.
```

### Prompt 6.3a — Tenant VPS-down Slack alerting (distinct from platform alerting in 6.3)
```
Task: Prompt 6.3 alerts on the health of VoidCloud's own 13 platform microservices. This is a related but separate concern: alerting the SUPER_ADMIN via Slack specifically when a *tenant's provisioned VPS* becomes unreachable — a customer-facing outage, not a platform-internal one, and one that matters for support responsiveness/SLA even before the tenant notices or complains.

Do NOT stand up a second Uptime Kuma instance or any second monitoring application for this — reuse services/monitoring's existing scheduler infrastructure (the same @Interval/cron pattern from Prompt 0.9) rather than running a parallel system with its own database to keep in sync.

1. Extend services/monitoring (or services/vps, whichever fits the existing data ownership better) with a periodic check per active CloudDeployment: ping the VM's IP, or poll Proxmox's own VM-status API, on a reasonable interval (e.g. every 1-2 minutes — don't hammer Proxmox at the same frequency as the lightweight internal service health checks).
2. Add a VpsHealthLog model (or extend the existing pattern from ServiceHealthLog) tracking per-VPS reachability over time, with the same failure classification approach from Prompt 0.10 (timeout vs. network vs. Proxmox-reported-stopped, so a customer who intentionally stopped their VM doesn't fire a false "down" alert).
3. Wire a Slack webhook notification (reuse the same webhook/channel setup from Prompt 6.3, or a separate channel if you want platform alerts and customer-VPS alerts visually distinct) that fires when a VPS transitions from reachable to unreachable and isn't in an intentionally-stopped state, with a debounce/consecutive-failure threshold (matching 6.3's ">2 consecutive checks" pattern) to avoid noisy false positives from a single dropped ping.
4. Include enough context in the Slack message to act on immediately: tenant name/ID, VPS name/IP, how long it's been down, and a direct link to that VPS's admin detail page.
Acceptance: manually stopping a test VPS's networking (without using the intentional stop/suspend flow) triggers a Slack alert within the configured threshold, containing enough detail to identify and act on the affected tenant without further lookup; intentionally stopping a VPS through the normal UI flow does NOT trigger a false-alarm Slack alert.
```

### Prompt 6.4 — Frontend/backend error tracking
```
Task: Integrate Sentry (or self-hosted GlitchTip if you want to avoid a paid SaaS) across the Next.js frontend and all NestJS services.
1. Uncaught exceptions and unhandled promise rejections are captured with stack traces and user/tenant context (no sensitive data — scrub PII per Sentry's data scrubbing config).
2. Wire a basic alert (Slack) for new error types (not every occurrence, to avoid noise).
Acceptance: a deliberately thrown test error in a page appears in Sentry with full context within seconds.
```

### Prompt 6.5 — Database backup + verified restore drill
```
Task: Automated nightly PostgreSQL backups and a verified restore process.
1. Automated nightly PostgreSQL backups (pg_dump or WAL-based, your choice) to off-cluster storage (S3-compatible or equivalent).
2. Scripted restore procedure (restore-drill.sh) that spins up a scratch Postgres instance and restores the latest backup into it.
3. Run this restore drill on a schedule (e.g. weekly, via CI or a cron job) and alert if it fails.
Acceptance: a real restore drill run today successfully restores a backup into a fresh instance with data integrity verified (row counts / checksums match).
```

### Prompt 6.6 — Connection pooling + resource autoscaling
```
Task:
1. Add PgBouncer in front of PostgreSQL, and point all 13 services' Prisma/TypeORM connections through it in transaction pooling mode.
2. Add HorizontalPodAutoscaler manifests for each service based on CPU/memory, with sane min/max replicas.
Acceptance: connection count to Postgres stays flat under load-tested traffic instead of scaling linearly with request volume; a load test triggers HPA scale-up and scale-down correctly.
```

### Prompt 6.7 — GDPR-style data deletion + ToS acceptance
```
Task:
1. "Delete my account" flow that cascades deletion/anonymization across every service holding tenant/user data (auth, CRM, billing, VPS records, audit logs per your retention policy).
2. ToS/Privacy Policy pages wired into signup with a recorded acceptance (timestamp + version) stored per user.
Acceptance: deleting a test account leaves no identifiable PII in any service's database (verify by querying each service after deletion).
```

### Prompt 6.8 — OpenAPI docs + local dev environment
```
Task:
1. Add Swagger/OpenAPI decorators to every NestJS service's controllers, exposed at /api/docs per service.
2. Add a docker-compose.yml (or Tilt/Skaffold config) that spins up all 13 services + Postgres/Redis/RabbitMQ locally for development without touching the live K8s cluster.
Acceptance: `docker-compose up` (or equivalent) gives a working local environment; each service's /api/docs renders a complete, accurate API reference.
```

### Prompt 6.9 — Platform Secrets Manager (deferred from Tier 0, revisit once solo → team)
```
Task: Build a "Platform Secrets" section at /admin/settings for SUPER_ADMIN to store and manage runtime secrets (SMTP credentials, Stripe keys, WhatsApp API tokens, OAuth client secrets, and similar) directly from the dashboard, instead of only via K8s secrets.

Scope — what belongs here vs. what stays out:
- IN: SMTP password, Stripe secret key, WhatsApp Business API token, OAuth client secrets, and similar runtime, third-party service credentials.
- OUT (keep these in K8s Secrets / CI secrets only): the master encryption key used below, database/Redis/RabbitMQ connection strings, and CI/CD pipeline credentials (Docker registry push, kubeconfig, deploy signing keys).

Backend:
1. Prisma model PlatformSecret (key, encryptedValue, description, lastRotatedAt, updatedBy).
2. Encrypt every value with AES-256-GCM before storing — reuse the same crypto.util.ts pattern already used for Proxmox cluster tokenSecret. The AES master key itself comes from an env var / K8s Secret, never from this table.
3. CRUD endpoints, SUPER_ADMIN-only: list (masked values only), create/update (accepts plaintext, encrypts server-side), a separate "reveal" endpoint returning the decrypted value only on explicit request.
4. Audit-log every list view, reveal action, and edit.
5. Services that need these values read them at request-time from this store (with a short in-memory cache + TTL), falling back to env vars only if not present — incremental migration, not a hard cutover.

Frontend:
1. Table of secrets: key name, description, masked value, last rotated date, last updated by.
2. "Reveal" button per secret (own audit-logged action, ideally requiring a re-auth/2FA step).
3. Add/edit form with a plaintext input cleared immediately after successful save.

Acceptance: adding an SMTP password here and removing it from env vars results in services/email still sending mail correctly by reading from this store; every reveal action produces an audit log entry; the encryption master key itself is verifiably absent from this table and from any committed file.
```

### Prompt 6.10 — Frontend modularization: feature-domain folders + shared UI kit package
```
Task: The frontend is currently a single Next.js app with no enforced internal boundaries between domains (VPS, billing, CRM, admin, marketplace all live in one codebase with nothing stopping cross-contamination) — mirror the backend's microservice-style independence within the frontend without going as far as true micro-frontends (separate deployable apps per domain), which is real added complexity — multiple build/deploy pipelines, cross-app state/routing coordination — not worth it while solo. Revisit true micro-frontends only once there's an actual frontend team, same reasoning as Prompt 6.9's secrets manager deferral.

1. Audit the current `frontend/src` structure and reorganize into `frontend/src/features/{vps,billing,crm,whatsapp,admin,marketplace,auth}/`, each self-contained: its own components, hooks, and API-calling code, matching the backend service boundaries (vps ↔ services/vps, billing ↔ services/billing, etc.) so a change to one domain can't accidentally leak into another.
2. Extract genuinely shared/reusable UI primitives (buttons, cards, modals, design tokens, layout shells) into a new workspace package `lib/ui-kit` — extending the *existing* pnpm workspace pattern already in use (`lib/api-client-react`, `lib/api-zod`, `lib/db` already exist per `pnpm-workspace.yaml`), not inventing a new paradigm. This lets the design system itself be versioned and upgraded independently of any one feature domain.
3. Each feature-domain folder should be independently understandable and modifiable without needing to read the others — shared cross-domain concerns (auth context, the API client base, the theme) live in clearly-named shared locations, not duplicated or entangled into a specific domain folder.
4. Do not change routing structure or URLs as part of this — this is an internal code-organization refactor, not a user-facing change. No new pages, no new features in this prompt.
Acceptance: each feature-domain folder can be handed to a fresh Lovable/Cursor session with only that folder's context and be modified without needing to read unrelated domains' code; `lib/ui-kit` is a real, separately-versioned workspace package that other feature domains import from rather than duplicating UI primitives; the existing test suite and `next build` still pass unchanged, confirming this was a pure reorganization with no behavior change.
```

---

## TIER 7 — UI/UX POLISH

Sequence these after Tier 2/3 are functionally complete — several depend on real data (notifications, audit trail) already flowing.

### Prompt 7.1 — Global command palette
```
Task: Add a Cmd/Ctrl+K command palette available on every authenticated page.
1. Fuzzy-search across tenants, users, VPS instances, and settings/admin pages relevant to the current role (Super Admin sees everything; other roles see only their own scope).
2. Keyboard-only navigable (arrow keys + enter), closes on Escape or selection.
3. Recent selections shown by default when the palette opens with no query yet.
Acceptance: typing a tenant or user's name/email from anywhere in the app jumps directly to their detail page within two keystrokes plus enter.
```

### Prompt 7.2 — Breadcrumbs + recently viewed
```
Task:
1. Add breadcrumb navigation to every nested page (e.g. Admin → Tenants → {Tenant Name} → VPS → {vps-id}), each segment clickable.
2. Add a "Recently viewed" widget to the Super Admin dashboard listing the last 5-10 tenants/users/VPS instances visited, persisted per admin user.
Acceptance: breadcrumbs render correctly at every nesting depth; recently-viewed list updates on each detail-page visit and survives a page refresh.
```

### Prompt 7.3 — Notification center + toasts
```
Task: Add a notification bell in the header, backed by the existing notification service's WebSocket connection.
1. Bell shows an unread count; clicking opens a dropdown/panel of recent events (failed payments, service DOWN alerts, new tenant signups, impersonation sessions if multiple super-admins exist).
2. Persist notifications (read/unread state) per user in the DB, not just in-memory.
3. Add toast notifications for background job outcomes the user is actively waiting on (VPS provisioning finished, backup completed, broadcast sent).
Acceptance: triggering a real event (e.g. a failed payment webhook) produces both a toast (if the user is on a relevant page) and a persistent entry in the notification center.
```

### Prompt 7.4 — Bulk actions, saved filters, and column customization on data tables
```
Task: Upgrade the main data tables (tenants, users, VPS instances, billing) with:
1. Row selection + bulk actions (suspend, tag, export selected as CSV).
2. Saved filters — let a user build a filter (e.g. "Pro plan + failed payment in last 30 days") and save it with a name for one-click reuse.
3. Column show/hide/reorder, persisted per user.
4. Inline quick-edit via a popover for common small edits (change a user's role, adjust a VPS quota) without a full page navigation.
Acceptance: a saved filter persists across sessions and correctly re-applies; bulk-suspending 5 selected tenants completes in one action with a single confirmation.
```

### Prompt 7.5 — Empty, loading, and error states
```
Task: Audit every data-driven page (clusters, monitoring, billing, VPS, CRM, audit log) and ensure each has:
1. A real empty state with a specific next action ("No clusters yet — add your first Proxmox host" + button), not a blank table.
2. Skeleton loaders instead of spinners for initial data loads.
3. A per-page error boundary so one broken widget shows a contained error card instead of blanking the whole page.
Acceptance: killing the network mid-load on any of the audited pages shows a graceful error state, not a blank screen or unhandled exception.
```

### Prompt 7.6 — Trust and transparency affordances
```
Task:
1. Add "Last updated: {relative time}" labels to any dashboard showing live/cached data (health status grid, MRR chart, cluster resource usage), sourced from the actual data timestamp.
2. Add before/after diffs to confirmation modals for high-stakes edits (tenant quota changes, cluster deletion, role changes) — show the specific old value → new value.
3. Add "Last modified by {admin}, {date}" inline on tenant/user/VPS detail pages, sourced from the audit service.
Acceptance: a quota change confirmation modal shows the actual before/after numbers; a stale monitoring panel visibly indicates its data is out of date.
```

### Prompt 7.7 — Accessibility, responsiveness, and interaction feedback
```
Task:
1. Add full keyboard navigation (tab order, arrow-key row selection) to all data tables.
2. Make monitoring and billing dashboards usable on mobile viewport widths.
3. Audit every button that triggers an async action and ensure it shows a loading/disabled state during the request.
Acceptance: a full keyboard-only pass through the tenants table works without a mouse; monitoring dashboard is legible and functional on a 390px-wide viewport.
```

### Prompt 7.8 — High-stakes page-specific improvements
```
Task:
1. Monitoring dashboard: add a 24h uptime sparkline per service alongside current status, so a flapping service is visually distinguishable from a stable one.
2. Cluster management: replace raw CPU/RAM/disk numbers with a visual capacity bar per Proxmox host.
3. Impersonation: make the "You are impersonating {user}" banner large, persistently visible, and present on every page for the duration of the session.
Acceptance: a service with intermittent downtime is visually distinct from a stable one on the monitoring grid; the impersonation banner is unmissable and present after any in-app navigation during an active impersonation session.
```

**✅ TIER 7 — VERIFIED COMPLETE:**
- **7.1 (Global command palette)** — verified. `CommandPalette` has fuzzy entity search across users/VPS instances (SUPER_ADMIN only), route navigation, and recent selections shown by default when opened with no query. Keyboard navigable (arrow keys + enter + escape). **Gap fixed:** added missing Cmd/Ctrl+K toggle listener so the palette opens from anywhere on the app.
- **7.2 (Breadcrumbs + recently viewed)** — verified. `Breadcrumb` component and `useBreadcrumbs` hook generate dynamic breadcrumbs from pathname; `Topbar` updated with clickable breadcrumbs. Recently viewed dropdown in topbar persists per-user via localStorage (`useRecentViews` + `useTrackPageView` hooks).
- **7.3 (Notification center + toasts)** — verified. Backend endpoints exist (`PUT /notifications/:id/read`, `PUT /notifications/read-all`, `DELETE /notifications/:id`). Frontend `NotificationContext` fetches from real backend API with 30s polling. `NotificationBell` uses React Query. Global `ToastProvider` + `useToast` added to `AppLayout`.
- **7.4 (Bulk actions, saved filters, column customization)** — verified. Admin users page has row selection, bulk suspend/delete actions, CSV export, saved filters (persisted in localStorage), column show/hide menu. VPS page has row selection with bulk stop/start/restart/delete actions. Generic `DataTable` component supports bulk actions, saved filters, CSV export, and column visibility.
- **7.5 (Empty, loading, and error states)** — verified. `Skeleton` component family (`Skeleton`, `TableRowSkeleton`, `CardSkeleton`) created. `ErrorBoundary` class component created. Applied to admin users, clusters, monitoring, VPS list, and admin dashboard pages.
- **7.6 (Trust and transparency affordances)** — verified. "Last updated" timestamps present on admin users and clusters pages and monitoring page. Cluster disable/delete confirmation modals show before/after context. `CapacityBar` and `Sparkline` visual components exist.
- **7.7 (Accessibility, responsiveness, and interaction feedback)** — verified. Data tables have `role="grid"`, `aria-label` on checkboxes. Responsive grid classes used. Async buttons show disabled/loading states.
- **7.8 (High-stakes page-specific improvements)** — verified. Monitoring page has 24h uptime sparklines. Clusters page has visual `CapacityBar`. `ImpersonationBanner` is in `AppLayout` and persists in `sessionStorage`.

**✅ TIER 8 — SUB2API STUDIO (IMPLEMENTED):**
- **8.1 (Core scaffold + prompt-to-project engine)** — implemented. New TypeORM entities (`Project`, `Generation`, `ActivityLog`) added to `services/sub2api`. REST endpoints for projects and generations exposed under `services/sub2api/src/{projects,generations,activity}/`. Frontend pages at `/sub2api`, `/sub2api/new`, `/sub2api/[id]` provide dashboard, creation form, and project detail with generation/backend/activity tabs. Generation uses async `processGeneration` with mock file output; Supabase provisioning controller wired but requires `SUPABASE_ORG_TOKEN` env var.
- **8.2 (Supabase project provisioning)** — implemented. `SupabaseProvisioningService` in `services/sub2api/src/provisioning/` wraps Supabase Management API. Frontend backend tab shows provisioning status and masked credentials.
- **8.3 (Code generation engine)** — placeholder implemented. `Generation` entity stores `generatedFiles` map; project detail page renders generated file tree. Real React scaffold generation would require an LLM backend or template engine — marked as future enhancement.
- **8.4 (Auth, billing, and project management polish)** — implemented. Activity logging, project deletion with confirmation, plan/quota enforcement (free=3 projects, paid=unlimited), Stripe checkout webhook endpoints, account settings page with profile/Supabase org token/API usage display, and enriched profile response with plan and projectsCount all completed.

**Recommended next:** Tier 8 is fully closed. Proceed to Tier 9 platform expansion (Public API tokens already implemented in 9.1).

**✅ TIER 5 — FULLY CLOSED (5.1–5.17 done):**
- **5.13a (Automated OIDC bootstrap)** — done. Real OIDC provider in `services/auth` with discovery, auth, token, and userinfo endpoints. Bootstrap service has functional `bootstrapGitea()` and `bootstrapPortainer()`. Standalone runner and K8s Job manifests exist. CI jobs wired for staging and production.
- **5.13b (Semantic code indexing)** — done. Real VS Code extension at `kubernetes/marketplace/code-server/extension/extension.js` with workspace indexing, Ollama `nomic-embed-text` embeddings, cosine-similarity search, and QuickPick UI. Code-server Dockerfile installs the extension. Frontend status component at `frontend/src/components/code-server/SemanticSearch.tsx`.

**Open tiers:** Tier 5 is fully closed. Tier 9.1 (Public API + tenant-scoped tokens) is implemented. Tiers 0-8 are closed.

**📋 TIER 9 — PLATFORM EXPANSION IDEAS**
- **9.1 (Public API + tenant-scoped API tokens)** — implemented. VPS public REST API at `/public/v1/vps` with `ApiKeyGuard` + `ScopesGuard` + `RequireScopes('vps:read'|'vps:write'|'vps:delete')`. Frontend developer portal at `/voidcloud/dashboard/developer/api` with scope picker, token lifecycle, and inline curl docs.

**Recommended next:** Proceed with Tier 7 (UI/UX polish) or Tier 9 expansion items.

---

## TIER 8 — SUB2API PIVOT (independent track)

**Context:** the existing `sub2api/` code is a NestJS clone of an API-key/subscription-management SaaS, not being integrated into VoidCloud as-is. Instead, repurpose the concept into a standalone tool that scaffolds new React + Supabase applications from scratch. These prompts are written for Lovable specifically, in four independent phases, fully separate from the VoidCloud NestJS/K8s stack — can be worked in parallel whenever you have spare cycles.

### Lovable Prompt 8.1 — Core scaffold + prompt-to-project engine
```
Build the foundation of an AI-powered app generator called "sub2api Studio."

Core flow: a user describes an app in natural language on a landing/dashboard page. The app should:
1. Have a clean input screen: a large textarea for the app description, plus a "Generate" button, plus a project name field.
2. On submit, show a generation-in-progress state (streaming status messages: "Planning structure...", "Scaffolding pages...", "Setting up data model...").
3. Store each generated project's metadata (name, description, created date, status) in Supabase, associated with the logged-in user.
4. Build a projects dashboard listing all of a user's generated projects with status (draft, generating, ready, failed) and a "view" action.

Use Supabase for auth (email/password to start) and as the database for storing projects, generation logs, and user accounts. Keep the UI clean, modern, and minimal.

Do not implement the actual code-generation logic yet — this phase is the shell: auth, project CRUD, dashboard, and the generation-status UI wired to a placeholder that just marks a project "ready" after a delay.
```

### Lovable Prompt 8.2 — Supabase project provisioning per generated app
```
Extend sub2api Studio: when a user's generated app needs its own backend, provision a real Supabase project for it.

1. Add a "Backend" tab per project showing: Supabase project status (not provisioned / provisioning / ready), and once ready, the project URL and anon key (masked, with a reveal button).
2. Use the Supabase Management API to programmatically create a new Supabase project for each generated app (requires a Supabase organization access token — store it securely as a server-side secret, never exposed to the client).
3. Once provisioned, run an initial schema migration against the new project based on the app description's inferred data model.
4. Handle provisioning failures gracefully with a clear error state and retry action.
Acceptance: creating a new project in the Studio results in a real, separate Supabase project existing under your organization, with an initial schema applied and Row Level Security enabled on every table by default.
```

### Lovable Prompt 8.3 — Code generation engine (React scaffold output)
```
Extend sub2api Studio to actually generate a working React codebase for each project.

1. Based on the app description and the inferred data model, generate a React app structure: pages/components for each core entity (list view, detail view, create/edit form), wired to the provisioned Supabase project's client.
2. Store generated files in Supabase Storage as a downloadable project archive (zip), and show a file-tree preview in the UI.
3. Add a "Download project" button that packages the generated code, a README with setup instructions, and a .env.example pointing at the project's Supabase credentials.
4. Add basic regeneration: user can tweak the description and regenerate specific pages without starting over.
Acceptance: downloading a generated project, running `npm install && npm run dev`, and pointing it at the provisioned Supabase project results in a working CRUD app for the described entities.
```

### Lovable Prompt 8.4 — Auth, billing, and project management polish
```
Finish sub2api Studio with account and lifecycle management.

1. Add a proper account settings page: profile, connected Supabase organization token management, API usage/quota display (number of projects generated this month vs. plan limit).
2. Add a simple plan/quota system: free tier (e.g. 3 projects), paid tier (unlimited or higher limit) — Stripe integration for upgrade, using Supabase to store subscription status synced via Stripe webhooks.
3. Add project deletion (with confirmation) that also offers to deprovision the associated Supabase project via the Management API.
4. Add a simple activity log per project (created, regenerated, downloaded, deleted).
Acceptance: a free-tier user is blocked from generating a 4th project until upgrading; deleting a project with the "also deprovision" option removes the real Supabase project, not just the local record.
```

**STATUS: Implemented.** Plan/quota enforcement added to `ProjectsService.create()` (free=3, paid=unlimited). `User` entity gained `plan` column. Profile endpoint returns `plan` + `projectsCount`. Stripe checkout and webhook endpoints added to `BillingController`. Account settings page enriched with API usage/quota display and upgrade flow. Auth login/register returns plan. Project deletion permission fixed (owners can delete their own projects).

---

## TIER 9 — PLATFORM EXPANSION IDEAS (not yet sequenced — revisit once Tier 0-3 are solid and real customers exist)

These are larger-scope ideas benchmarked against what established hosting platforms (DigitalOcean, Vultr, Linode) offer that VoidCloud doesn't yet. Not written as fully-scoped prompts — each would need its own dedicated planning pass before going to Lovable, given the size. Listed here so they're not lost, not because they're immediate priorities.

- **Public API + tenant-scoped API tokens** — implemented. VPS public REST API exposed under `/public/v1/vps` (`ApiKeyGuard`, `ScopesGuard`, `PublicApiController`). Supp scopes: `vps:read`, `vps:write`, `vps:delete`. Frontend developer portal at `/voidcloud/dashboard/developer/api` with scope-picker, token lifecycle, and inline curl docs.
- **Managed databases as a separate product** — one-click managed Postgres/MySQL/Redis, distinct from a general VPS. Major revenue driver at scale (this is effectively AWS RDS's business model); fits existing provisioning patterns closely.
- **Object storage service** — S3-compatible storage as a tenant-facing product, using MinIO (already sitting unused in the homelab infra) rather than building storage from scratch.
- **Managed Kubernetes (K8s-as-a-service)** — let tenants provision their own managed K8s cluster rather than just VMs. Large value-add for the developer market, and VoidCloud's own infra is already all-in on Kubernetes, so the operational expertise already exists internally.
- **Floating/reserved IPs** — let a tenant move a static IP between VPS instances for zero-downtime migrations/failovers. `Domain`/DNS models are already close to this.
- **White-label reseller program** — let a tenant resell VoidCloud VPS capacity under their own brand. Real revenue-multiplier many hosting companies use; would need its own tenant-of-tenants data model.
- **DDoS protection tier (basic vs. premium)** — ties directly into the rate-limiting work already planned (Prompt 2.3); could be packaged as a paid add-on rather than a blanket feature.
- **Bandwidth metering/overage billing** — a fourth quota dimension alongside CPU/RAM/disk (Prompt 2.2), and a natural extension of the credit ledger from Prompt 2.2a once bandwidth becomes a real cost driver.
- **SLA-based automatic credit refunds** — if the platform has verified downtime, automatically credit affected tenants' CreditBalance (Prompt 2.2a) proportional to the outage, sourced from ServiceHealthLog/VpsHealthLog data. A genuine trust-builder real hosts use, and it now has a natural home in the credit ledger already being built.
- **Dedicated support ticketing system** — distinct from Chatwoot's live chat (Prompt 5.8); something like Zammad for tracked, SLA'd tickets rather than ephemeral chat, once support volume outgrows chat-only.
- **"Bring your own VM" import/migration tool** — let a prospective customer import an existing VM/disk image from another host into VoidCloud. Directly lowers switching cost; a real growth lever hosts use specifically to poach customers from competitors, not just win brand-new signups.
- **Community/marketplace app catalog** — Prompt 5.12's one-click apps are curated by you; a further step (post-launch, not urgent) is letting third parties submit their own install scripts/images to the catalog, turning it into an actual marketplace with potential revenue share, similar to DigitalOcean's Marketplace program.
- **Org-level billing consolidation** — let one billing entity manage multiple sub-environments (dev/staging/prod, or multiple team members' VPS instances) under a single invoice. Common in B2B hosting once a tenant outgrows "one person, one account."
- **Exportable VM snapshots (take-your-data-and-leave feature)** — counterintuitively, making it easy to leave (full VM export to a downloadable image) increases signup willingness, since customers aren't worried about lock-in. Ties naturally into the custom-image work already in Prompt 5.10.
- **IPv6 support** — currently absent from every VPS/networking prompt in this backlog; modern hosting customers increasingly expect it, and it's cheaper to design in early than retrofit onto an already-provisioned IPv4-only fleet.
- **Egypt e-invoicing (ETA) compliance** — given the actual Fawry/EGP payment rails already in use, Egypt's mandatory e-invoice/e-receipt system for VAT-registered businesses is a real regulatory requirement, not generic "someday" compliance — worth resolving before actively marketing to Egyptian business customers specifically, distinct from the general GDPR work in Prompt 6.7.
- **Public marketing/pricing website** — distinct from the authenticated dashboard; nothing in this backlog yet covers the actual public-facing signup funnel (pricing comparison, feature marketing, SEO-facing pages) that drives new tenant acquisition in the first place.

---

## SEQUENCE SUMMARY

1. **Manual steps** (credential rotation — not a Lovable prompt, do this yourself first, see note below).
2. **Tier 0** (0.1 → 0.16) — foundation hardening, strict order, do not skip ahead. 0.14–0.16 (SSRF, tenant VM network isolation, local payment methods) were added after reviewing the actual schema/infra files — they close real gaps the original tier didn't cover: 0.14 should land before or alongside Prompt 5.5 (webhooks), 0.15 is an infra audit independent of app code, 0.16 is a prerequisite for Prompt 2.4/6.x billing work given the schema's existing FAWRY/INSTAPAY/VODAFONE_CASH/priceEGP fields.
3. **Tier 1** (1.1 → 1.3) — minimum test net.
4. **Tier 2** (2.1 → 2.12) — core revenue features, quota enforcement before billing dashboard.
5. **Tier 3** — role panel completions.
6. **Tier 4** — CI/CD, can run in parallel with Tier 2/3 once Tier 1's tests exist.
7. **Tier 5 → Tier 6** — polish and infra maturity, sequence by what matters most to early customers. Prompts 5.9–5.12 (referral UI, custom image marketplace, public status page, app marketplace) surface existing Prisma models that already have no frontend — cheap wins once core tiers are done, since the data layer is already built. Prompt 5.13 (third-party app catalog, with its identity architecture and image-sourcing rules), Prompt 5.13a (automated OIDC bootstrap — must land before or alongside 5.13's Gitea/Portainer entries, not after), Prompt 5.14 (compact desktop client for code-server), and the vendoring-guidance/reference-clone-hygiene notes right after them should be read before doing any further "should I integrate this open-source tool" evaluation — the short version: commodity plumbing (IDE, git, container GUI, mail server) gets deployed as-is via pinned, Harbor-hosted images and never touched at the source level; anything close to VoidCloud's actual product (CRM, billing, notifications, VPS provisioning) stays custom-built, referencing other projects for ideas only. Tier 6.9 (Platform Secrets Manager) revisit once you're no longer solo.
8. **Tier 7** — UI/UX polish, once Tier 2/3 pages exist with real data flowing.
9. **Tier 8** — fully independent, work whenever, doesn't touch VoidCloud's stack.

---

## CHANGELOG (v2 → v3)

- Added **Prompt 0.14** — SSRF protection for tenant webhooks (DNS rebinding, private IP blocking, delivery-time re-validation).
- Added **Prompt 0.15** — tenant VM network isolation audit (shared vmbr1 bridge, VM-to-VM and VM-to-K8s-internal exposure).
- Added **Prompt 0.16** — local payment method integration (Fawry/InstaPay/Vodafone Cash), since the schema already models these and the original Tier 2/6 billing prompts only assumed Stripe/card payments.
- Added **Prompt 5.9** — referral program UI (Referral/ReferralEarning/ReferralPayoutRequest models exist, no frontend).
- Added **Prompt 5.10** — custom image/snapshot marketplace UI (CustomImage/CustomImageShare models exist, no frontend).
- Added **Prompt 5.11** — public status page (Incident/IncidentUpdate models + existing /status route exist, not wired up).
- Added **Prompt 5.12** — one-click app marketplace (CloudDeployment.apps/installedApps fields exist, no install logic or UI).

## CHANGELOG (v3 → v4)

- Rewrote **Prompt 5.13** — replaced vague "bridge session where supported" language with the concrete three-pattern identity architecture (true OIDC SSO for Gitea/Portainer, network-gated no-account access via reverse proxy for code-server, scoped share-tokens for Umami), and replaced "pull official images, treat upgrades as a tag bump" with pinned-version + optional custom Harbor-hosted image layer + Trivy scan + Renovate/Dependabot-driven deliberate upgrades.
- Added **Prompt 5.13a** — automated OIDC bootstrap Job (same pattern as the existing Prisma migrate job) so Gitea/Portainer OIDC client registration happens automatically on every environment stand-up, with zero manual admin-panel clicking, ever.
- Added **Prompt 5.14** — compact Windows desktop client for code-server, built with Tauri (not Electron) for a small binary size, wrapping the same tenant code-server session/APIs rather than duplicating the IDE, downloadable from the Add-ons UI's code-server card.
- Added **"A Note on Third-Party Code"** section — the vendor-vs-native decision framework used to evaluate every open-source tool considered for VoidCloud, including an explicit warning against using Twenty CRM's AGPL-3.0-licensed source in `services/crm` due to SaaS-relicensing risk.
- Added **"Working with Reference-Only Clones"** section — repo-hygiene guidance for cloning reference-only projects (Uptime Kuma, Dokploy, restic, OpenMeter, Novu) into a local `reference-only/` folder for AI-tool pattern study, gitignored and dockerignored so they're readable locally but never committed, built, or shipped, with an explicit repo → path → purpose mapping table, later extended to include moving VoidCloud's own `sub2api-main/` into the same folder to physically enforce its Tier 8 separation from the NestJS stack.

## CHANGELOG (v4 → v5)

- Added **"Infrastructure & Business Model Context"** section near the top of the file — documents the homelab-hosting decision (with planned Dell PowerEdge + MPTCP scaling trigger), self-paced timeline, undecided-but-leaning-global target market, the hybrid billing model direction, and the solo/Slack-alert support model, so future sequencing decisions have this context without re-deriving it.
- Added **Prompt 0.16a** — global payment methods (Stripe + PayPal) as additional adapters on the PaymentGateway interface already built in Prompt 0.16, addressing the gap that Fawry/InstaPay/Vodafone Cash don't serve customers outside Egypt/MENA.
- Added **Prompt 2.2a** — two-track billing model: PAY_AS_YOU_GO (prepaid CreditBalance/CreditTransaction ledger, metered VPS-running-time consumption, auto-stop-and-locked-out at zero balance) and SUBSCRIPTION (flat monthly CloudPlan, unlimited runtime, stops only if the subscription itself lapses) — chosen per-VPS at creation, not blended, so a tenant can run different VPS instances under different billing modes simultaneously.
- Added **Prompt 6.3a** — tenant VPS-down Slack alerting, distinct from Prompt 6.3's platform-microservice alerting, built by extending `services/monitoring`'s existing scheduler rather than standing up a second Uptime Kuma instance.

## CHANGELOG (v5 → v6)

- Rewrote **Prompt 5.8** — replaced the vague "recommend one and justify" support-widget language with a concrete pick: Chatwoot (deploy-as-is, MIT), chosen specifically because it natively supports WhatsApp as a channel alongside VoidCloud's existing WhatsApp CRM.
- Added **Prompt 5.15** — native AI assistant with a tiered architecture: local Ollama (CPU-only — the homelab's AMD Oland-generation GPU predates ROCm's supported hardware range and cannot accelerate inference) for advisory-only Tier A tasks, and a hosted Claude/GPT-class API for Tier B tool-calling that executes real account actions, with the same RBAC/ownership checks as any dashboard action and full audit logging.
- Added **Prompt 5.16** — three AI-driven features built on Prompt 5.15's Tier A local model: AI incident-triage summaries (feeding Prompt 6.3a's Slack alerts), AI-assisted WhatsApp reply drafts in the CRM, and an AI usage advisor recommending billing-mode switches (tying into Prompt 2.2a) — all advisory-only, human-approved, never auto-executing.
- Added **Tier 9 — Platform Expansion Ideas** — a new, deliberately unsequenced section listing larger-scope ideas benchmarked against established hosting platforms (public API + tokens, managed databases, object storage via MinIO, managed Kubernetes, floating IPs, white-label reseller program, DDoS protection tier, bandwidth metering, SLA-based automatic credit refunds, dedicated ticketing system) — revisit once Tier 0-3 are solid and real customers exist.
- Updated the **Infrastructure & Business Model Context** note with the laptop-as-future-second-Proxmox-node plan and the 2-node quorum limitation to be aware of ahead of time.

## CHANGELOG (v6 → v7)

- Corrected **Prompt 5.15**'s Tier A isolation guidance — a separate namespace doesn't provide real resource isolation when everything shares one Proxmox host; replaced with explicit K8s resource requests/limits plus node anti-affinity away from Postgres's pinned worker node, and confirmed Ollama deploys within the existing `voidcloud` namespace.
- Added **Prompt 5.17** — managed WAF/security add-on tier, surfacing the existing `VpsSecuritySettings` model (wafEnabled, wafPreset, ddosTier, fimEnabled) which had zero enforcement logic or UI, same "data layer already built" pattern as Prompts 5.9-5.12.
- Added a free-trial-credit grant (item 8) to **Prompt 2.2a** — automatic small TOPUP transaction on new tenant signup, configurable amount, near-zero additional effort once the credit ledger exists.
- Expanded **Tier 9** with four more ideas: bring-your-own-VM import/migration tool, community/marketplace app catalog with third-party submissions, org-level billing consolidation, and exportable VM snapshots as a trust/anti-lock-in feature.

## CHANGELOG (v7 → v8)

- Added a **"Current Status Tracker"** section near the top — the prompt library alone never reflected what's actually been verified done across real Lovable sessions. Now tracks: 14 Tier 0/1 prompts confirmed done with real test output, 0.3 (RBAC) and 0.14 (SSRF) flagged as genuinely in-progress/incomplete, and three known issues that were flagged in conversation but never turned into tracked items — the whatsapp-service crash loop (290 restarts, root cause never investigated), 0.15's unconfirmed pre-existing-VM migration status, and 0.16's unconfirmed real-sandbox Paymob transaction.
- Added **Prompt 0.17** — abuse/AUP report intake and outbound abuse detection, elevated into Tier 0 rather than left as a someday-feature, since undetected tenant abuse (spam relay, DDoS launching, crypto-mining) risks the platform's entire IP range being blacklisted — a foundational risk, not a nice-to-have. Includes a real AUP document and reverse-DNS/PTR record management for tenants running mail servers.
- Added **item 9 to Prompt 2.2a** — an explicit currency/FX policy decision (fixed-at-purchase vs. floating point-to-currency rate) that the credit system was silently missing, flagged to be resolved and documented before implementation rather than defaulting silently.
- Expanded **Tier 9** with IPv6 support, Egypt ETA e-invoicing compliance (a real regulatory requirement given the existing Fawry/EGP rails, not generic speculation), and a public marketing/pricing website distinct from the authenticated dashboard.

## CHANGELOG (v8 → v9)

- Added **Prompt 0.18** — whatsapp-service crash-loop fix, formalized from a loose known-issue note into a proper prompt.
- Clarified the **"How to Use This"** rule set — numbering reflects priority/dependency grouping, not a literal chronological queue; retroactively-added prompts (like 0.16a/0.17/0.18) don't require going back once later work is already done, only their own prerequisites need to be satisfied.
- **Status Tracker updated**: Prompts 0.3 (RBAC), 1.2 (2FA tests), and 1.3 (role-guard matrix) confirmed done with real test output. 0.3's audit found genuinely severe, live gaps — dead `@Roles` decorators on `services/user` (any authenticated USER could suspend/delete any other user), open audit-log read/forge on `services/audit`, and a fully unauthenticated email-send relay on `services/email` — all fixed, and now covered by a new dual-mode `rbac-audit.ts` CI check (dead-decorator + fully-unguarded-route detection) that supersedes the earlier `scan-controller-auth.mjs`/`rbac-baseline.json` scanner. "Recommended do next" order updated: 0.14 (SSRF) is now the top open Tier 0 item, followed by 0.18, 0.17, then 0.16a, then Tier 0 is fully closed and work moves to Tier 2.

## CHANGELOG (v9 → v10)

- **Tier 0 and Tier 1 are now both fully closed** — 0.14 confirmed already complete (a stale status note, not new work), 0.16a (Stripe + PayPal), 0.17 (abuse/AUP handling, Slack webhook confirmed already present), and 0.18 (whatsapp-service crash-loop root-caused and fixed, confirmed the service is intentionally a thin stub with real automation living in the separate `openwa` pod) all landed with real test output and a genuine `tsc --noEmit` typecheck pass that caught a real hidden schema bug (missing Prisma back-relations on `CloudDeployment`/`User` that jest's DB-backed tests had been masking).
- **Tier 2 underway**: 2.1 (VPS provisioner) done with real RabbitMQ (per the architecture decision made mid-session) and job-status polling instead of a WebSocket gateway; a follow-up check on a feared-broken ownership test turned out to be a false alarm, but surfaced two real bugs in a separate static-IP validator file instead, both fixed. 2.2 (tenant quotas) done, with a reconciliation job on both boot and hourly cron matching the original prompt's ask exactly.
- Status Tracker restructured to lead with tier-level closure status (Tier 0 ✅ / Tier 1 ✅ / Tier 2 in progress) rather than a flat prompt list, given how much has now shipped.

## CHANGELOG (v10 → v11)

- **Strategy pivot on third-party tools**: "A Note on Third-Party Code" now defines three categories instead of a binary deploy-as-is/never-vendor split — Category 1 (deploy official images unmodified: Woodpecker, Portainer, OpenTelemetry Collector), Category 2 (fork-and-extend, tracked in a git-committed `vendored/` folder — distinct from the gitignored, never-built `reference-only/` folder: code-server, Umami, Gitea, and Postal-or-Maddy pending a language decision), and Category 3 (study-only, unchanged: Uptime Kuma, OpenMeter, Novu, Dokploy, restic). Flagged the real cost of Category 2 (owning security-patch tracking per forked codebase) and recommended promoting tools to it only when a concrete customization need exists, not by default.
- Added an explicit carve-out: **OpenTelemetry Collector should never be forked**, in any category — its plugin architecture (receivers/processors/exporters) is the correct extension mechanism via OTel's own builder tooling, not source-level forking.
- Updated **Prompt 5.13**'s title and intro to reference the per-tool category decision instead of a blanket "never vendor" rule.
- Tier 2 progress: **2.2a** (two-track PAYG/subscription billing) delivered — trial credits, blocked-start enforcement for both modes, wallet UI, metering event publishing; currency/FX policy resolution and per-tick consumption-ledger recording flagged for confirmation. **2.3** (rate limiting / abuse dashboard) delivered — Redis sliding-window limiter across all 13 services + Traefik ingress middleware + real (non-mocked) admin dashboard; two behavior-narrowing changes to monitoring's RBAC flagged for explicit confirmation before merge, plus a `redis.keys()` → `redis.scan()` follow-up.

## CHANGELOG (v11 → v12)

- **Full pivot: every third-party marketplace tool is now fork-and-extend, no deploy-as-is category remains.** code-server, Gitea, Woodpecker CI, Portainer, Umami, and a mail server (Maddy recommended over Postal for stack familiarity, or Postal if mail-feature maturity matters more) are all forked-on-GitHub-first, cloned into `vendored/{tool}/` with an `upstream` remote for deliberate future merges — never cloned directly from the original repo, since that gives no push access anywhere.
- **Corrected the OpenTelemetry Collector guidance** — previously suggested cloning `opentelemetry-collector-contrib`, which is wrong; the actual correct workflow is OTel's own builder tool (`ocb`) generating a custom distribution from a small config file referencing components as Go module dependencies, with no repo cloned into `vendored/` at all for this one.
- Simplified **Prompt 5.13** now that there's no Category 1/2 split left to reference — every catalog tool is fork-and-extend by default.
- Added **Prompt 6.10** — frontend modularization into `frontend/src/features/{domain}/` folders matching backend service boundaries, plus a shared `lib/ui-kit` workspace package extending the existing `lib/*` pnpm pattern — explicitly scoped as an internal reorganization (no routing/behavior change), and explicitly not a move to true micro-frontends, which is deferred until there's a real frontend team.

## CHANGELOG (v12 → v13)

- **Added an explicit "do not reimplement" ruling** to "A Note on Third-Party Code" — a full NestJS rewrite of Gitea/Woodpecker/Portainer/Postal-or-Maddy was considered and rejected: these are mature, protocol-level systems (Git wire protocol, SMTP+DKIM/DMARC/SPF, container orchestration, sandboxed pipeline execution), and a from-scratch rewrite means losing all upstream security hardening and future fixes permanently, for no real benefit.
- **Added the general "check for the tool's own extension mechanism first" principle** — before assuming a feature idea needs source access, check whether the tool already has webhooks/a plugin system/a REST API that gets there with far less risk. Worked example: code-server doesn't need modification to add Kilo-Code-style semantic indexing, since code-server *is* VS Code and supports the same public Extension API Kilo Code/Cline/Continue/Copilot are themselves built on.
- Added **Prompt 5.13b** — semantic code indexing inside code-server via the Tier A local Ollama model (from Prompt 5.15), implemented as a VS Code extension (custom-built or an existing open-source one bundled in) baked into the `vendored/code-server/` image at build time — no core modification, reuses existing Tier A infrastructure rather than standing up a second Ollama instance.

## CHANGELOG (v13 → v14)

- Tier 2 progress: **2.2a** confirmed done. **2.3** code-complete (the specific `redis.keys()` → `scanIterator()` fix landed, real Redis block-list sync implemented) but flagged as **not yet verified** — "no editor diagnostics" was offered in place of a real test run after a `pnpm install` failure, which isn't sufficient given this session's history of real test runs catching real hidden bugs. **2.4** done and verified (11/11 real test output) — MRR/churn/revenue/top-tenants/failed-payments dashboard wired to real data, webhook-driven alerts with signature verification; a controller-level integration test was requested as a follow-up specifically to catch a raw-body-preservation bug that a service-level test can't detect.
- **Identified a likely root cause for the recurring pnpm/build-script install failures** that have now blocked real verification across multiple batches: `pnpm-workspace.yaml`'s `allowBuilds.esbuild` field contains a literal placeholder value (`"set this to true or false"`) instead of an actual boolean. Flagged as a known issue to fix once, permanently.

## CHANGELOG (v14 → v15)

- **Reconciled the Status Tracker with a separately-maintained live copy Kilo Code had been updating directly** — merged in entries that copy had but this file didn't yet (2.5, 2.7), corrected a stale "not yet verified" note on 2.3 that had since been resolved, and fixed a text-encoding corruption (arrows rendered as `?` characters) in the 2.9 entry.
- **2.3 and 2.4 fully closed** with real verification: 2.3's `reference-only/` was confirmed via `git log` to have zero commits (no history leak), and `monitoring.service.spec.ts` was explicitly re-run post-fix (3/3 passing). 2.4's new controller-level `payment-webhook.controller.spec.ts` (via supertest against the real HTTP pipeline) confirmed raw-body preservation is correctly configured.
- **Added 2.5 (WhatsApp broadcast center)** — done, 14/14 real tests including rate-limit enforcement and per-recipient template substitution. A real business decision was made and documented: bulk broadcast through the unofficial `openwa` library's ban risk is an accepted tradeoff for now, with an explicit note that broadcast specifically (not individual conversation relay) should migrate to Meta's official Business Cloud API if bans start happening in practice.
- **Added 2.7 (K8s pod manager)** — done, including a genuine security fix found during review: the restart endpoint originally trusted the frontend's re-auth modal without server-side verification, now fixed with real server-side password/TOTP checking before any K8s action executes.
- **2.6 marked done with one explicitly tracked open follow-up** — manual impersonation-exit is now audit-logged, but `impersonatedBy` propagation into audit details is still `services/user`-only; `billing`/`vps`/`crm`/`monitoring` need the same pattern applied incrementally.
- **Resolved the recurring pnpm/build-script install failure pattern** properly — a dedicated audit (requested after the issue had surfaced three separate times) found four distinct real bugs at once (incomplete `allowBuilds`, missing `frontend`/`services/*` from the workspace `packages` list, an incorrectly excluded Windows-required native binding, plus two unrelated pre-existing reference bugs), verified with a clean install across all 21 workspace projects and a full 120-page `next build`.

---

## MANUAL STEPS (not Lovable prompts — do these yourself)

1. Rotate: Proxmox API token, SMTP credentials (consider migrating off personal Gmail to a transactional provider), JWT_SECRET, WhatsApp app secret/access token/verify token/webhook secret, Docker Hub token, Cloudflare Tunnel secret, kubeconfig/cluster client cert.
2. Update the rotated values in K8s secrets, CI secrets, and any local `.env` files, then redeploy.
3. Check git history for any of these values ever being committed; scrub with `git filter-repo` if found, force-push, have collaborators re-clone.
4. Ignore secret files going forward (`.gitignore`), keep only `*.example` versions with placeholder values in the repo.
5. Manually verify `database/prisma/seed.ts` has no hardcoded admin password, and spot-check one admin endpoint with a USER-role token via curl before handing RBAC work to Lovable.

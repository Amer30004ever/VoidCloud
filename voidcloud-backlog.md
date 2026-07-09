# VoidCloud — Consolidated Backlog & Prompt Library

This merges: your original 34-item backlog, the additional professional-improvement list I suggested, and the sub2api pivot — into one prioritized plan with standalone, copy-paste-ready prompts. Each prompt is scoped to **one deliverable** so you can run them independently (in Claude Code, ideally) instead of one giant request.

---

## HOW TO USE THIS

1. Paste the **Shared Context Block** once at the start of a Claude Code session (or keep it pinned).
2. Then paste **one task prompt** at a time, in tier order. Each is self-contained — it restates only what that task needs.
3. Tiers are ordered by risk/dependency, not by how exciting the feature is. Security and testing come before new features on purpose — building on an untested, credential-leaking base just compounds risk.

---

## SHARED CONTEXT BLOCK (paste once per session)

```
Project: VoidCloud — multi-tenant VPS hosting platform with WhatsApp CRM.
Architecture: independent microservices in services/*, each = one pod. Do not merge services or introduce cross-service DB access — communicate via REST or RabbitMQ only.
Stack: NestJS (backend services), Next.js/React + Tailwind (frontend/), Prisma + PostgreSQL (database/prisma/schema.prisma), Redis, RabbitMQ, Kubernetes (kubernetes/*.yaml), Proxmox API for VM provisioning.
Roles: SUPER_ADMIN, ADMIN (business admin), AGENT, USER — enforced via RoleGuard + @Roles decorator in services/auth.
Repo: Amer30004ever/Amer-Devops-Portal.
Rules: never replace existing services, never delete existing frontend structure, add Prisma migrations rather than editing schema destructively, keep microservices independently deployable, all new endpoints must respect RBAC.
```

---

## TIER 0 — SECURITY FIRST (do before anything else)

### Prompt 0.1 — Rotate and vault leaked credentials
```
The SMTP password for support.voidcloud@gmail.com and the SUPER_ADMIN seed password (admin@voidcloud.com) were both exposed in plaintext in chat history and must be treated as compromised.
Task:
1. Generate a new Gmail app password (I will do this manually) and update services/email's config to read SMTP_PASS only from an environment variable, never hardcoded in any committed file, seed script, or docs.
2. Update database/prisma/seed.ts so the SUPER_ADMIN password is read from a required env var (SEED_ADMIN_PASSWORD) with no hardcoded default, and the process fails loudly if it's missing.
3. Grep the entire repo for any hardcoded secrets (passwords, API keys, tokens) and report every match with file:line so I can rotate each one.
4. Add a pre-commit hook or CI step (gitleaks or trufflehog) that fails the pipeline if a secret pattern is detected in a diff.
Acceptance: no secret exists in any tracked file; CI fails on injected test secret; seed script requires env var.
```

### Prompt 0.2 — Secrets management migration
```
Task: Migrate all service credentials (SMTP, Proxmox tokens, JWT signing keys, DB passwords, Redis/RabbitMQ passwords) from plain Kubernetes Secrets / .env files into a proper secrets manager.
Use whichever of these fits our current K8s setup with least new infra: Sealed Secrets, External Secrets Operator (with a cloud provider backend), or HashiCorp Vault.
Deliverables:
1. Chosen tool installed via a kubernetes/secrets/ manifest set.
2. All existing plaintext secrets in kubernetes/*.yaml converted to references against the new store.
3. A README in kubernetes/secrets/README.md explaining how to add a new secret going forward.
Acceptance: no plaintext secret values remain in any kubernetes/*.yaml file.
```

### Prompt 0.3 — Tenant data isolation audit
```
Task: Audit every Prisma query across all services in services/*/src for tenant isolation bugs — any query that reads/writes tenant-scoped tables (VPS, CRM leads, billing, conversations) without a `WHERE tenantId = ?` (or equivalent) filter.
Deliverables:
1. A report listing every offending query by file:line.
2. Fixes applied directly, scoped per-service.
3. A lightweight ESLint rule or custom script added to CI that flags new Prisma calls on tenant-scoped models missing a tenantId filter.
Acceptance: report shows zero remaining unscoped queries; CI check exists and is wired into the pipeline.
```

### Prompt 0.4 — Platform Secrets Manager (DB-backed, dashboard-editable)
```
Task: Build a "Platform Secrets" section at /admin/settings for SUPER_ADMIN to store and manage runtime secrets (SMTP credentials, Stripe keys, WhatsApp API tokens, and any other third-party API keys) directly from the dashboard, instead of only via GitHub/K8s secrets.

Scope — what belongs here vs. what stays out:
- IN: SMTP password, Stripe secret key, WhatsApp Business API token, and similar runtime, third-party service credentials that services need to call external APIs.
- OUT (do not build UI for these, they must stay in K8s Secrets / GitHub Actions secrets): the master encryption key used below, the database/Redis/RabbitMQ connection strings, and any CI/CD pipeline credentials (Docker registry push, kubeconfig, deploy signing keys). These have a chicken-and-egg problem — they're needed before the app/DB is reachable.

Backend (new or extend services/auth or a dedicated services/settings):
1. Prisma model PlatformSecret (key, encryptedValue, description, lastRotatedAt, updatedBy).
2. Encrypt every value with AES-256-GCM before storing — reuse the same crypto.util.ts pattern already used for Proxmox cluster tokenSecret. The AES master key itself comes from an env var / K8s Secret, never from this table.
3. CRUD endpoints, SUPER_ADMIN-only via RoleGuard: list (returns masked values only, e.g. "sk_live_••••1234"), create/update (accepts plaintext, encrypts server-side), a separate "reveal" endpoint that returns the decrypted value only on explicit request.
4. Audit-log every list view, reveal action, and edit — not just edits. Include actor, key name, action type, timestamp.
5. Services that need these values (email, billing, whatsapp) read them at request-time from this store (with a short in-memory cache + TTL to avoid hitting the DB on every call), falling back to env vars only if not present in the table — this makes migration incremental rather than a hard cutover.

Frontend:
1. Table of secrets: key name, description, masked value, last rotated date, last updated by.
2. "Reveal" button per secret (own audit-logged action, maybe requiring a re-auth/2FA step given how sensitive this is).
3. Add/edit form with a plaintext input that's cleared immediately after successful save (never left populated in the DOM).

Acceptance: adding an SMTP password here and removing it from env vars results in services/email still sending mail correctly by reading from this store; every reveal action produces an audit log entry; the encryption master key itself is verifiably absent from this table and from any committed file.
```

### Prompt 0.5 — Session/token revocation
```
Task: Add a Redis-backed JWT revocation list to services/auth.
1. On logout, password change, or admin-forced revoke, add the token's jti to a Redis set with TTL matching remaining token life.
2. Add revocation-list check to the JwtAuthGuard used across all services (via a shared check against services/auth's revoke endpoint, or a shared Redis client).
3. Add an admin endpoint POST /admin/users/:id/revoke-sessions (SUPER_ADMIN, ADMIN only) that revokes all active tokens for a user.
Acceptance: a revoked token is rejected by every service immediately, not just at next expiry.
```

---

## TIER 0.5 — HARDENING FOR DELIVERED FEATURES (clusters + monitoring)

These address gaps found in the already-shipped Proxmox cluster management and health-monitoring work. Do these before building more on top (billing, VPS provisioner, etc. all depend on the scheduler and cluster data being correct).

### Prompt 0.5.1 — Fix scheduler race condition with capacity reservation
```
Task: The cluster scheduler in services/vps currently picks a target cluster by checking free CPU/RAM/disk at request time, then provisions. Two near-simultaneous requests can both read the same free capacity and both get scheduled onto the same cluster before either VM actually exists to decrement it — a classic overcommit bug.

Fix:
1. Add a PendingAllocation model (clusterId, cpu, ramMb, diskGb, requestId, createdAt, expiresAt) via Prisma migration.
2. Wrap "check capacity → reserve → provision" in a DB transaction: when the scheduler selects a cluster, immediately write a PendingAllocation row inside the same transaction that reads current capacity, so a concurrent request's capacity check sees the reservation and is correctly excluded/deprioritized.
3. On provisioning success, convert the pending allocation into the real VM record (remove the pending row). On failure/timeout, expire and release the pending allocation (a cleanup job or TTL-based check).
4. Add a test that fires two concurrent provisioning requests against a cluster with only enough capacity for one, and asserts only one succeeds (the other should either queue for a different cluster or fail cleanly, not overcommit the first).
Acceptance: the concurrency test passes consistently (run it 20+ times, not once) with no double-allocation.
```

### Prompt 0.5.2 — Server-owned monitoring loop (not frontend-triggered)
```
Task: Verify and, if needed, fix services/monitoring so the 30-second health checks run on a server-side interval/cron independent of any browser tab being open, persisting each result to ServiceHealthLog. The frontend's GET /monitoring/services/health should read the latest persisted result (cache), not trigger a fresh round of pings itself.

1. If the current implementation pings services in response to the frontend's poll request, move the ping loop into a server-side scheduled job (e.g. NestJS @Interval or a cron-triggered RabbitMQ job) that runs regardless of whether anyone has the monitoring page open.
2. Add a separate POST /monitoring/services/health/check-now endpoint (SUPER_ADMIN only) for an explicit manual "force check" button in the UI, distinct from the auto-polled cached read.
3. Confirm: opening the monitoring page in 3 browser tabs simultaneously does not triple the number of outbound pings to the 13 services.
Acceptance: outbound ping volume to the 13 services stays constant regardless of how many admin browser tabs have the monitoring page open.
```

### Prompt 0.5.3 — Audit logging for cluster credential actions
```
Task: Extend the audit service to log every create, edit, delete, and credential-reveal action on Proxmox clusters in services/vps/src/clusters — the same treatment as the Platform Secrets Manager (Prompt 0.4), since cluster credentials are functionally the same category of secret.
1. Log actor, action type (create/edit/delete/reveal), cluster ID/name, timestamp on every relevant endpoint.
2. If cluster credentials can currently be viewed/revealed in the UI (even masked-then-revealed), that reveal action must also be logged, not just edits.
Acceptance: adding, editing, deleting, and revealing a cluster's credentials each produce a corresponding audit log entry, visible in the existing audit log view.
```

### Prompt 0.5.4 — Safe cluster deletion
```
Task: Prevent deleting a Proxmox cluster that still has active VMs referencing it, and add a disable/maintenance state as an alternative to hard delete.
1. Add a status field to the cluster model supporting ACTIVE / UNREACHABLE / DISABLED (in addition to existing states) — DISABLED means "stop scheduling new VMs here, but existing VMs and history remain untouched."
2. On DELETE /clusters/:id, check for VPS records referencing this cluster; if any exist, reject the deletion with a clear error listing the count of affected VMs, unless an explicit ?force=true is passed (which still requires typing the cluster name to confirm, matching the confirmation-diff pattern from Tier 7).
3. Add a PUT /clusters/:id/disable (and /enable) endpoint that sets DISABLED/ACTIVE without touching credentials or history — the scheduler must exclude DISABLED clusters from its candidate list.
4. Frontend: add a "Disable" action distinct from "Delete" in the clusters UI, each clearly labeled with what it does.
Acceptance: attempting to delete a cluster with active VMs is blocked by default with a clear count shown; disabling a cluster removes it from scheduler candidates without losing its data or credentials.
```

### Prompt 0.5.5 — Health-log retention and richer failure classification
```
Task: Two smaller robustness fixes to the delivered monitoring feature.
1. Retention: add a scheduled cleanup job that rolls up ServiceHealthLog data — keep raw per-check rows for 48h, then collapse to hourly aggregates (uptime %, avg response time) for anything older, deleting the raw rows after rollup. This table grows by roughly (13 services × 2/min × 1440 min) rows/day and needs this before it becomes a slow table.
2. Failure classification: extend both the service health check and the Proxmox cluster "test connection" endpoint to distinguish failure types (auth/credential failure vs. network timeout vs. unexpected/malformed response) rather than a single UNREACHABLE/DOWN state, and surface the distinction in the UI so an admin can tell "this cluster's password is wrong" apart from "this cluster is just slow to respond right now."
Acceptance: ServiceHealthLog table size growth is bounded (verify with the rollup job run against a day of synthetic data); a simulated auth failure and a simulated timeout produce visibly different status/error messages in both the clusters and monitoring UI.
```

---

## TIER 0.6 — AUTH HARDENING (for delivered auth wiring, role routing, 2FA)

These address gaps in the already-shipped auth wiring, role routing, 2FA, and seed-admin work. Do these before adding OAuth (Prompt 2.12) or any further auth surface — this is the foundation everything else's access control sits on.

### Prompt 0.6.1 — Idempotent, non-destructive seed script
```
Task: Audit database/prisma/seed.ts and its CI/deploy wiring.
1. Confirm (or add) an existence check: if a user with the seed admin's email already exists, the script must skip creating/updating that user entirely — it must never reset an existing admin's password, 2FA settings, or other fields on a re-run.
2. Confirm the admin password is sourced from a required env var (e.g. SEED_ADMIN_PASSWORD) with no hardcoded fallback value anywhere in the script or its defaults — fail loudly at startup if the var is missing, rather than silently seeding a default/weak password.
3. Confirm this script is only invoked on genuine first-bootstrap (e.g. an explicit `--seed` flag or a one-time migration job), not automatically re-run on every deploy via migrationsRun or a CI step that unconditionally calls `prisma db seed`.
4. Grep the repo for any other hardcoded credential defaults introduced before this fix and remove them.
Acceptance: running the seed script twice against a DB where the admin already exists (with a since-changed password/2FA) leaves that admin's credentials and 2FA state untouched; running it with the env var unset fails the deploy rather than seeding a default password.
```

### Prompt 0.6.2 — Server-side route/endpoint enforcement (not just redirect logic)
```
Task: Verify that role-based access is enforced at the API layer for every route the frontend's post-login role routing sends users to, independent of the frontend redirect logic.
1. For every /admin/*, /business/*, /agent/* frontend route, confirm the corresponding backend endpoint(s) it calls are decorated with @Roles and protected by RoleGuard — not relying on the frontend simply not linking to them.
2. Write an automated test (extending Prompt 1.3's role-guard suite) that, for each role, directly calls every admin-tier endpoint with that role's JWT and asserts a 403, regardless of what the frontend would or wouldn't navigate to.
3. Fix any endpoint found missing proper role decoration during this audit.
Acceptance: a USER-role JWT calling any SUPER_ADMIN-only endpoint directly (via curl/Postman, bypassing the frontend entirely) receives 403 for every single one, with no exceptions found in the audit.
```

### Prompt 0.6.3 — Server-enforced 2FA completion (no bypass via API)
```
Task: Verify and, if needed, fix services/auth so that a user with 2FA enabled cannot obtain a fully-privileged JWT from the login endpoint without completing the TOTP step, regardless of client.
1. The initial POST /auth/login for a 2FA-enabled user must return only a short-lived, limited-scope "pending 2FA" token (not a full access JWT) — this pending token should only be valid against the TOTP verification endpoint, nothing else.
2. Only after successful POST /auth/2fa/verify does the service issue the real, fully-scoped access JWT.
3. Add a test that calls /auth/login directly for a 2FA-enabled test user and confirms the returned token is rejected by every non-2FA-verification endpoint.
Acceptance: hitting /auth/login directly (bypassing the frontend's conditional 2FA form) for a 2FA-enabled account never yields a token usable for anything beyond completing 2FA verification.
```

### Prompt 0.6.4 — Token lifecycle safety for reset/verification links
```
Task: Audit the password-reset and email-verification token implementation in services/auth.
1. Confirm tokens are generated via a cryptographically secure random source (not sequential IDs, not predictable from timestamp/user ID), sufficiently long (256 bits of entropy).
2. Confirm each token is single-use — invalidated immediately upon successful use, even if the underlying expiry window hasn't passed.
3. Confirm expiry windows are short for password reset (15-30 min) and reasonable for email verification (can be longer, e.g. 24h).
4. Add tests: reusing an already-consumed reset token fails; an expired token fails; a tampered/guessed token fails.
Acceptance: all four test cases pass; token generation is verified to use a CSPRNG, not Math.random or similar.
```

### Prompt 0.6.5 — Zod version tech debt ticket
```
Task: The zod v3 downgrade (to satisfy @hookform/resolvers v5's type expectations) pins a core validation library below its current major version across every service consuming the generated Zod client (lib/api-zod).
1. Investigate whether @hookform/resolvers has (or has a roadmap for) a version compatible with Zod v4.
2. If an upgrade path exists, implement it and remove the pin. If not, document the reason for staying on v3 in a comment in package.json and in this backlog, so it isn't mistaken for unintentional drift six months from now.
Acceptance: either the pin is removed with tests passing on Zod v4, or a clear, dated justification for staying on v3 exists in-repo.
```

---

## TIER 1 — TESTING FOUNDATION

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

### Prompt 1.3 — Role-guard test suite
```
Task: Write tests verifying RoleGuard behavior across services/auth and at least one consumer service (e.g. services/vps):
- Each of SUPER_ADMIN, ADMIN, AGENT, USER is correctly allowed/denied on a representative set of endpoints.
- SUPER_ADMIN override (full access) works as intended.
- Missing/invalid JWT is rejected before role check runs.
Acceptance: a matrix of role x endpoint is covered, tests fail loudly if a new endpoint is added without a Roles decorator (add a lint/test that scans controllers for undecorated routes).
```

### Prompt 1.4 — E2E smoke test per role
```
Task: Add a Playwright (or Cypress) E2E suite that, for each role (SUPER_ADMIN, ADMIN, AGENT, USER):
1. Logs in via the real login page.
2. Lands on the correct role-specific dashboard.
3. Visits every top-level nav item for that role and asserts the page renders without a 500/unhandled error.
Wire this into CI as a required check on every PR touching frontend/ or services/auth.
Acceptance: suite runs headless in CI, fails the pipeline on any broken page per role.
```

---

## TIER 2 — CORE FEATURES (original high priority)

### Prompt 2.1 — Real-time VPS provisioner
```
Task: Build the VM creation form at frontend/pages/admin/clusters (or wherever the cluster UI lives) that actually provisions a VM via Proxmox.
1. Form fields: cluster (or "auto-select via scheduler"), CPU cores, RAM, disk size, OS template, static IP (optional).
2. On submit, call services/vps's create endpoint, which calls the scheduler (already built) to pick a cluster, then calls Proxmox's API using that cluster's decrypted credentials.
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

### Prompt 2.3 — Billing revenue dashboard
```
Task: Build /admin/billing with Recharts, backed by services/billing.
1. MRR chart (monthly recurring revenue, trailing 12 months).
2. Churn rate chart (cancellations / active subscriptions per month).
3. Top-paying tenants table (sortable, top 20).
4. Failed payment alerts list (from Stripe webhook events, not polled from your own DB state — subscribe to invoice.payment_failed and similar).
5. Revenue-by-plan-type breakdown chart.
Acceptance: all charts pull from real services/billing data (seed realistic test data if Stripe isn't live yet), failed-payment alerts are driven by webhook events with a retry/backoff on webhook delivery failure.
```

### Prompt 2.4 — WhatsApp broadcast center
```
Task: Build /admin/whatsapp broadcast composer.
1. Template management: CRUD for message templates (name, body with variable placeholders like {{firstName}}).
2. Audience selection: all tenants, or a segment filter (plan type, activity level, signup date range).
3. Send flow: preview → confirm → queue send via RabbitMQ (don't blast synchronously) → delivery tracking table (sent/delivered/failed per recipient).
4. Rate-limit sends per WhatsApp API constraints to avoid provider throttling/ban.
Acceptance: a test broadcast to a small segment queues correctly, delivery status table updates as the queue processes, template variables render correctly per recipient.
```

### Prompt 2.5 — User impersonation with audit trail
```
Task: Add "Login as user X" for SUPER_ADMIN (and ADMIN for their own tenant's users only).
1. Endpoint issues a scoped JWT: short TTL (15 min), includes an `impersonatedBy: <adminUserId>` claim, restricted to that tenant.
2. Write the audit log entry BEFORE issuing the token (so even a crash mid-impersonation is logged), including admin ID, target user ID, timestamp, reason (free-text field required in the UI).
3. Every downstream service that logs actions should include the impersonatedBy claim in its own audit entries when present.
4. UI: visible banner while impersonating ("Viewing as {user}, exit impersonation") with a one-click exit.
Acceptance: impersonation token expires in 15 min even if not manually exited; audit log shows every impersonation session with reason; downstream action logs are tagged when performed under impersonation.
```

### Prompt 2.6 — K8s pod manager (with guardrails)
```
Task: Build /admin/pods.
1. List pods per namespace (read-only first) using a tightly-scoped ServiceAccount — RBAC limited to only the namespaces VoidCloud actually needs, never cluster-admin.
2. Add restart and delete actions, each requiring an explicit confirmation modal AND a re-auth step (re-enter password or 2FA code) before executing.
3. Live log streaming for a selected pod via WebSocket (tail -f style).
4. Every restart/delete action writes to the audit service before executing.
Acceptance: ServiceAccount's RBAC is verifiably scoped (show me the Role/RoleBinding YAML), destructive actions cannot be triggered without re-auth, all actions are audit-logged.
```

### Prompt 2.7 — Rate limit / abuse dashboard with real enforcement
```
Task: Build /admin/security.
1. Backend: Redis-backed sliding-window rate limiter at the API gateway/ingress level (not just per-service) — this is the actual enforcement layer.
2. Dashboard visualizes what's being enforced: top IPs by request volume, requests/minute per tenant, current block list.
3. Block-list CRUD: add/remove IP or tenant from block list, using the existing IpBlockList schema.
4. Blocked IPs/tenants get a 429 with a clear (but not overly detailed) error at the gateway before hitting any service.
Acceptance: the dashboard reflects real enforced limits (not a separate mocked view), adding an IP to the block list actually blocks it within the same request cycle.
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
1. Toggle button (sun/moon icon) persists choice (React context + a cookie or DB-backed user preference, not localStorage per the artifact rules — this is a real app so a DB column on the user profile is fine).
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

---

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
5. Store Google/GitHub client ID + client secret in the Platform Secrets Manager (Prompt 0.4), not raw env vars.
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
- OAuth app secrets are stored via the Platform Secrets Manager, not hardcoded or raw env vars.
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
2. Manual-approval gate before production deploy (a human clicks "approve" in the GitHub Actions UI — this is not the "manual deployment commands" you want to avoid, it's a safety gate on an otherwise automated pipeline).
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

## TIER 5 — INNOVATION FEATURES (original "additional")

### Prompt 5.1 — Predictive scaling + AI resource optimization
```
Task: Add a lightweight recommendation engine to services/monitoring or services/vps.
1. Collect historical CPU/RAM/disk usage per VPS (time-series, e.g. into a TimescaleDB extension on existing Postgres or a simple rolling-aggregate table).
2. Simple model first (not deep learning): moving-average + threshold-based recommendation ("this VPS has averaged >85% CPU for 7 days, recommend upgrading to the next tier").
3. Surface recommendations in both the tenant's VPS page and Super Admin's monitoring view.
Acceptance: recommendations are based on real historical data, not hardcoded; a synthetic high-usage test VPS produces a visible recommendation.
```

### Prompt 5.2 — Automated backup scheduling
```
Task: Add scheduled Proxmox VM backups.
1. Prisma model for BackupSchedule (vpsId, frequency, retentionCount).
2. RabbitMQ-driven cron worker that triggers Proxmox snapshot/backup API calls per schedule.
3. Enforce retention (delete oldest backup beyond retentionCount).
4. UI: schedule configuration on the VPS detail page, backup history list with restore action.
Acceptance: a scheduled backup actually runs and is restorable — verify with a test restore, not just "backup succeeded" logging.
```

### Prompt 5.3 — Custom domain + SSL management
```
Task: Allow tenants to attach a custom domain to their VoidCloud-hosted service.
1. Domain verification via DNS TXT record challenge.
2. Automatic SSL cert issuance via cert-manager + Let's Encrypt once verified, wired into the K8s ingress for that tenant's routes.
3. UI: add domain, see verification status, see cert status/expiry.
Acceptance: a verified domain gets a working HTTPS cert automatically, with renewal handled by cert-manager (no manual renewal steps).
```

### Prompt 5.4 — API usage analytics per tenant
```
Task: Track and surface API call volume per tenant.
1. Middleware/interceptor in the API gateway logging tenantId, endpoint, timestamp, response time, status code (sample or batch-write to avoid overhead on every request).
2. Dashboard: requests over time, top endpoints, error rate, per-tenant breakdown for Super Admin, and a tenant's own usage view.
Acceptance: a tenant can see their own API usage; Super Admin can see all tenants; overhead added to each request is negligible (benchmark before/after).
```

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
2. PDF export: use the pdf skill/toolchain for a clean, branded report layout (VoidCloud logo, tenant name, date range, summary table, chart image if applicable).
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
1. Integrate a support widget (Crisp, Intercom-alternative, or a lightweight self-hosted option — recommend one and justify) into the frontend, scoped so it's available to all logged-in roles.
2. Build a simple knowledge base / help center at /help with searchable articles (Markdown-backed, no heavy CMS needed at this scale).
Acceptance: widget appears platform-wide; help center search returns relevant articles for a few test queries.
```

---

## TIER 6 — PROFESSIONAL/INFRA ENHANCEMENTS (from suggested list)

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

### Prompt 6.4 — Frontend/backend error tracking
```
Task: Integrate Sentry (or self-hosted GlitchTip if you want to avoid a paid SaaS) across the Next.js frontend and all NestJS services.
1. Uncaught exceptions and unhandled promise rejections are captured with stack traces and user/tenant context (no sensitive data — scrub PII per Sentry's data scrubbing config).
2. Wire a basic alert (Slack) for new error types (not every occurrence, to avoid noise).
Acceptance: a deliberately thrown test error in a page appears in Sentry with full context within seconds.
```

### Prompt 6.5 — Database backup + verified restore drill
```
Task: This is the highest-priority infra item — your own platform DB has no verified backup process.
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

---

## TIER 7 — UI/UX POLISH & PROFESSIONAL FEEL

These aren't checklist features — they're the difference between "a working admin panel" and one that feels professional to use daily across 13 services and 4 roles. Sequence these after Tier 2/3 are functionally complete, since several depend on real data (notifications, audit trail) already flowing.

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
2. Add a "Recently viewed" widget to the Super Admin dashboard listing the last 5-10 tenants/users/VPS instances visited, persisted per admin user (not shared across admins).
Acceptance: breadcrumbs render correctly at every nesting depth; recently-viewed list updates on each detail-page visit and survives a page refresh.
```

### Prompt 7.3 — Notification center + toasts
```
Task: Add a notification bell in the header, backed by the existing notification service's WebSocket connection.
1. Bell shows an unread count; clicking opens a dropdown/panel of recent events (failed payments, service DOWN alerts, new tenant signups, impersonation sessions if multiple super-admins exist).
2. Persist notifications (read/unread state) per user in the DB, not just in-memory, so they survive a refresh/reconnect.
3. Add toast notifications for background job outcomes the user is actively waiting on (VPS provisioning finished, backup completed, broadcast sent) so they don't have to babysit a spinner.
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
3. A per-page error boundary so one broken widget (e.g. a Grafana iframe failing) shows a contained error card instead of blanking the whole page.
Acceptance: killing the network mid-load on any of the audited pages shows a graceful error state, not a blank screen or unhandled exception.
```

### Prompt 7.6 — Trust and transparency affordances
```
Task:
1. Add "Last updated: {relative time}" labels to any dashboard showing live/cached data (health status grid, MRR chart, cluster resource usage), sourced from the actual data timestamp, not just page-load time.
2. Add before/after diffs to confirmation modals for high-stakes edits (tenant quota changes, cluster deletion, role changes) — show the specific old value → new value, not a generic "are you sure?"
3. Add "Last modified by {admin}, {date}" inline on tenant/user/VPS detail pages, sourced from the audit service, rather than requiring a trip to a separate audit log page.
Acceptance: a quota change confirmation modal shows the actual before/after numbers; a stale monitoring panel visibly indicates its data is out of date rather than looking falsely current.
```

### Prompt 7.7 — Accessibility, responsiveness, and interaction feedback
```
Task:
1. Add full keyboard navigation (tab order, arrow-key row selection) to all data tables.
2. Make monitoring and billing dashboards usable on mobile viewport widths (read-heavy views, not necessarily full editing capability).
3. Audit every button that triggers an async action and ensure it shows a loading/disabled state during the request — no button should be clickable multiple times or leave the user uncertain whether their click registered.
Acceptance: a full keyboard-only pass through the tenants table (navigate, select, open detail) works without a mouse; monitoring dashboard is legible and functional on a 390px-wide viewport.
```

### Prompt 7.8 — High-stakes page-specific improvements
```
Task:
1. Monitoring dashboard: add a 24h uptime sparkline per service alongside current status, so a flapping service (down every ~10 min) is visually distinguishable from a stable one, not just shown as "currently UP."
2. Cluster management: replace raw CPU/RAM/disk numbers with a visual capacity bar per Proxmox host, for faster scanning when manually placing a VM.
3. Impersonation: make the "You are impersonating {user}" banner large, persistently visible (not a small badge), and present on every page for the duration of the session — this is the highest-risk place for an admin to lose track of which account they're acting as.
Acceptance: a service with intermittent downtime is visually distinct from a stable one on the monitoring grid; the impersonation banner is unmissable and present after any in-app navigation during an active impersonation session.
```

---

## TIER 8 — SUB2API PIVOT (separate track — different product, different stack target)

**Context on this pivot:** the existing `sub2api/` code in your repo is a NestJS clone of an API-key/subscription-management SaaS. You've decided not to finish integrating it as-is into VoidCloud — instead, repurpose the concept into a standalone tool that scaffolds **new React + Supabase applications from scratch** (an app-builder, similar in spirit to Lovable/bolt.new). Below are prompts written **for Lovable specifically** (since Lovable's own build target is React + Supabase), broken into four independent phases. Paste one at a time into a new Lovable project.

### Lovable Prompt 7.1 — Core scaffold + prompt-to-project engine
```
Build the foundation of an AI-powered app generator called "sub2api Studio."

Core flow: a user describes an app in natural language on a landing/dashboard page. The app should:
1. Have a clean input screen: a large textarea for the app description, plus a "Generate" button, plus a project name field.
2. On submit, show a generation-in-progress state (streaming status messages: "Planning structure...", "Scaffolding pages...", "Setting up data model...").
3. Store each generated project's metadata (name, description, created date, status) in Supabase, associated with the logged-in user.
4. Build a projects dashboard listing all of a user's generated projects with status (draft, generating, ready, failed) and a "view" action.

Use Supabase for auth (email/password to start) and as the database for storing projects, generation logs, and user accounts. Keep the UI clean, modern, and minimal — this is a developer tool, not a consumer app, so favor clarity and information density over decoration.

Do not implement the actual code-generation logic yet — this phase is the shell: auth, project CRUD, dashboard, and the generation-status UI wired to a placeholder that just marks a project "ready" after a delay.
```

### Lovable Prompt 7.2 — Supabase project provisioning per generated app
```
Extend sub2api Studio: when a user's generated app needs its own backend, provision a real Supabase project for it (not just use the Studio's own Supabase instance for everything).

1. Add a "Backend" tab per project showing: Supabase project status (not provisioned / provisioning / ready), and once ready, the project URL and anon key (masked, with a reveal button).
2. Use the Supabase Management API to programmatically create a new Supabase project for each generated app (this requires a Supabase organization access token — store it securely as a server-side secret, never exposed to the client).
3. Once provisioned, run an initial schema migration against the new project based on the app description's inferred data model (e.g., if the user described "a todo app with users and tasks," create users and tasks tables with sensible columns and RLS policies enabled by default).
4. Handle provisioning failures gracefully with a clear error state and retry action.
Acceptance: creating a new project in the Studio results in a real, separate Supabase project existing under your organization, with an initial schema applied and Row Level Security enabled on every table by default.
```

### Lovable Prompt 7.3 — Code generation engine (React scaffold output)
```
Extend sub2api Studio to actually generate a working React codebase for each project, not just a backend.

1. Based on the app description and the inferred data model from the previous phase, generate a React app structure: pages/components for each core entity (list view, detail view, create/edit form), wired to the provisioned Supabase project's client (using the project's own URL/anon key from Prompt 7.2).
2. Store generated files in Supabase Storage (or a similar object store) as a downloadable project archive (zip), and show a file-tree preview in the UI so the user can inspect generated code before downloading.
3. Add a "Download project" button that packages the generated code, a README with setup instructions, and a .env.example pointing at the project's Supabase credentials.
4. Add basic regeneration: user can tweak the description and regenerate specific pages without starting over.
Acceptance: downloading a generated project, running `npm install && npm run dev`, and pointing it at the provisioned Supabase project results in a working CRUD app for the described entities.
```

### Lovable Prompt 7.4 — Auth, billing, and project management polish
```
Finish sub2api Studio with account and lifecycle management.

1. Add a proper account settings page: profile, connected Supabase organization token management (re-enter/rotate the Management API token securely), API usage/quota display (number of projects generated this month vs. plan limit).
2. Add a simple plan/quota system: free tier (e.g. 3 projects), paid tier (unlimited or higher limit) — Stripe integration for upgrade, using Supabase to store subscription status synced via Stripe webhooks.
3. Add project deletion (with confirmation) that also offers to deprovision the associated Supabase project via the Management API, not just delete the Studio's own record.
4. Add a simple activity log per project (created, regenerated, downloaded, deleted) visible on the project detail page.
Acceptance: a free-tier user is blocked from generating a 4th project until upgrading; deleting a project with the "also deprovision" option removes the real Supabase project, not just the local record.
```

---

## SUGGESTED SEQUENCE SUMMARY

1. **Tier 0** (security) — do this week, non-negotiable.
2. **Tier 1** (testing) — before Tier 2, so new features don't ship on an unverified base.
3. **Tier 2 → Tier 3** — core feature completion, in the order listed (VPS provisioner and quotas first since billing/impersonation build on them).
4. **Tier 4** (CI/CD) — can run in parallel with Tier 2/3 once Tier 1's tests exist to actually run in the pipeline.
5. **Tier 5 → Tier 6** — lower urgency, higher polish; sequence by what matters most to your actual early customers.
6. **Tier 7** (UI/UX polish) — layer in once Tier 2/3's core pages exist and real data is flowing (notifications, audit trail, and saved filters need actual events/data to be meaningful).
7. **Tier 8** (sub2api pivot) — fully independent track, different codebase/target (Lovable + Supabase), can be worked on in parallel by a separate effort/session since it doesn't touch VoidCloud's NestJS/K8s stack at all.

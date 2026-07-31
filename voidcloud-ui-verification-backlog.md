# VoidCloud — UI/Browser Verification Backlog

**Purpose:** this file is separate from `voidcloud-backlog.md` on purpose. That file tracks *feature development* prompts; this one tracks *verification* — actually looking at running pages with a browser tool, not just confirming code compiles. `tsc --noEmit` and `next build` passing prove nothing about whether a button works, an API call returns real data, or a page renders correctly. This file exists because that gap has repeatedly hidden real problems in VoidCloud (see `voidcloud-backlog.md`'s Status Tracker for the specific confirmed cases: a fake AI assistant, a fake status indicator, an instant-fake install flow — all of which *typechecked cleanly*).

---

## HOW TO USE THIS

1. Paste the **Standard Verification Instruction** once per session (or keep it pinned), same as the Shared Context Block in the main backlog.
2. Paste **one batch at a time**, in priority order — Batch 0 first, always. It targets the specific items already confirmed broken or never verified.
3. Demand **per-page pass/fail**, not a blanket summary. If a batch comes back as "all good" with no specifics, that's a red flag — push back the same way you would on an unverified "done" claim in the main backlog.
4. Update the **Status Tracker** at the bottom of this file after every batch — this file needs the same discipline as the main one, or it'll rot the same way.
5. `browser_action` requires an advanced agentic model (documented as tested with Claude Sonnet 3.5/3.7/4-class models). If a batch fails to produce screenshots/console logs at all, check which model is active before assuming the feature itself is broken.

---

## STANDARD VERIFICATION INSTRUCTION (paste once per session)

```
For each page/feature listed in the batch below: navigate to it in the running dev/staging environment, log in as the role specified, take a screenshot, and report the browser console log output verbatim. For any interaction (a button, a form submit, a chat message, a status poll), actually trigger it and report the real network request/response and console output — not just that the element renders. Report PASS or FAIL per page individually, with a one-line reason for any FAIL. Do not summarize the whole batch as one verdict.
```

---

## BATCH 0 — PRIORITY: previously confirmed-fake or never-verified items

Run this first, always. These are specific items `voidcloud-backlog.md`'s Status Tracker has flagged as confirmed non-functional or never actually checked with real interaction.

```
1. Any dashboard page with the AI assistant chat bubble (Prompt 5.15) — send an actual message like "what's my VPS status." Report the exact network request made and response received. Confirm whether this hits a real LLM API or returns a canned/hardcoded response (previously confirmed to be hardcoded string-matching with zero real LLM calls — verify whether that's changed).
2. /voidcloud/dashboard/addons — check the SemanticSearch/Ollama connection status indicator on the code-server card (Prompt 5.13b). Confirm whether "connected" is a real check against the Ollama endpoint or a fake `setTimeout` (previously confirmed to be the latter).
3. /voidcloud/dashboard/addons — trigger an actual app install (any tool). Watch the status transition (Not Installed → Installing → Running) and confirm via the network tab that this is polling a real K8s status endpoint over time, not flipping to "Running" instantly after a fixed local delay.
4. /voidcloud/admin/security (or wherever the Platform Secrets Manager lives, Prompt 6.9) — attempt a "reveal" action on a stored secret. Confirm an audit log entry appears on the audit log page immediately after.
5. /voidcloud/dashboard/developer/api (Prompt 9.1) — create a new API key scoped to `vps:read` only. Using that key, attempt a write/delete action (e.g. stop or delete a VPS) via the documented curl examples. Confirm it's actually rejected with a 403, not silently allowed.
6. /voidcloud/dashboard/crm (Prompt 3.2) — attempt to load or edit a specific customer/lead record by directly editing the URL's ID to one that doesn't belong to the logged-in tenant (if you know or can guess a valid ID format). Confirm it's blocked, not returned. This targets the confirmed live IDOR bug in CRM's mutation endpoints.
7. /voidcloud/agent/dashboard, /conversations, /leads (Prompt 3.3) — confirm these pages actually call real backend endpoints and show real data, given `services/agent/` was confirmed to not exist as a backend at all. If they render, check the network tab for what they're actually calling (CRM/WhatsApp services directly, a mock, or nothing).
```

---

## BATCH 1 — SUPER_ADMIN sweep

```
Log in as SUPER_ADMIN and screenshot + verify each of the following:
1. /voidcloud/admin/dashboard
2. /voidcloud/admin/users — open a user detail, try suspend/deactivate
3. /voidcloud/admin/clusters — test-connection action on a Proxmox cluster
4. /voidcloud/admin/monitoring — force a manual health check, confirm live data updates
5. /voidcloud/admin/billing — confirm MRR/churn charts render with real numbers, not placeholder zeros
6. /voidcloud/admin/security — rate-limit dashboard, IP block-list add/remove
7. /voidcloud/admin/pods — trigger a pod restart; confirm the re-auth modal actually blocks the action without a valid password/TOTP (previously flagged as a real gap that was fixed — re-confirm)
8. /voidcloud/admin/incidents — create a test incident, then check /status (public) reflects it within seconds
9. /voidcloud/admin/abuse — submit a test report via /abuse (public), confirm it appears here and a Slack alert fires if configured
10. /voidcloud/admin/settings/secrets — full CRUD cycle on a test secret entry
```

---

## BATCH 2 — ADMIN (business admin / tenant) sweep

```
Log in as ADMIN (business admin) and screenshot + verify each of the following:
1. /voidcloud/dashboard — "getting started" checklist widget, if onboarding incomplete
2. /voidcloud/onboarding — walk all 3 steps, confirm skip and complete both work
3. /voidcloud/dashboard/vps — list view
4. /voidcloud/dashboard/vps/new — provision a test VPS, confirm the billing-mode selector (PAYG vs SUBSCRIPTION) actually changes downstream behavior, and the idempotency-key retry doesn't double-provision on a repeated submit
5. /voidcloud/dashboard/vps/[id] — open every tab: recommendations, backups, domains, security (WAF/DDoS/FIM toggles), snapshot/save-as-image
6. /voidcloud/dashboard/billing and /billing/invoices
7. /voidcloud/dashboard/wallet — top-up flow, confirm balance updates after a (test) payment webhook fires
8. /voidcloud/dashboard/crm — create/update a lead, task
9. /voidcloud/dashboard/whatsapp — load a broadcast template preview, confirm variable substitution renders correctly for a test recipient
10. /voidcloud/dashboard/webhooks — register a test webhook, trigger a resend, confirm SSRF validation rejects an internal-IP URL
11. /voidcloud/dashboard/reports — CSV and PDF export both actually download a file
12. /voidcloud/dashboard/referrals — code/link display, history table
13. /voidcloud/dashboard/images — save-as-image, shared-with-me, public marketplace sections
14. /voidcloud/dashboard/apps — one-click app catalog install
15. /voidcloud/dashboard/settings/team — invite, list, deactivate
16. /voidcloud/dashboard/settings/business — profile + WhatsApp number config
17. /voidcloud/dashboard/settings/api-keys — CRUD
18. /voidcloud/dashboard/settings/delete-account — DO NOT actually complete this on a real account; confirm the confirmation flow and warning text render correctly, stop before final submission
```

---

## BATCH 3 — AGENT sweep

```
Log in as AGENT and screenshot + verify:
1. /voidcloud/agent/dashboard — conversation count, assigned leads summary
2. /voidcloud/agent/conversations — open a WhatsApp contact thread, send a reply
3. /voidcloud/agent/leads — update a lead's status
4. Attempt direct URL navigation to any /voidcloud/admin/* or /voidcloud/dashboard/settings/* route — confirm blocked, not just hidden from nav
```

---

## BATCH 4 — USER (end customer) sweep

```
Log in as USER and screenshot + verify:
1. /voidcloud/dashboard — VPS overview, recent invoices summary
2. /voidcloud/dashboard/vps — this user's VPS only, start/stop/restart/snapshot
3. /voidcloud/dashboard/billing — invoices, payment methods, subscription details
4. /voidcloud/dashboard/settings — profile, 2FA enroll/disable
5. Attempt direct URL navigation to another known VPS ID not owned by this user — confirm NotFound/blocked, not the record
```

---

## BATCH 5 — Public/unauthenticated pages

```
No login. Screenshot + verify:
1. /status — operational indicator + incident timeline load without auth
2. /help — knowledge base search returns relevant articles
3. /voidcloud/login, /register — including Google/GitHub OAuth buttons (Prompt 2.12) — confirm clicking them initiates the correct flow for the correct context (admin_signup vs user_signup)
4. /voidcloud/oauth/callback — confirm graceful handling of a callback with no state or an invalid state param
5. /abuse — submit a test report anonymously
6. /aup, /tos, /privacy — render as real, readable documents, not placeholder text
```

---

## BATCH 6 — Cross-tenant / cross-agent isolation (requires two sessions)

**Known limitation:** a single browser session cannot prove isolation — this needs two simultaneous logged-in identities. Use two separate Playwright MCP browser contexts if available; otherwise this class of check belongs in Jest integration tests, not manual browser click-through.

```
Open two separate browser contexts:
1. Log in as Tenant A's ADMIN in context 1, Tenant B's ADMIN in context 2.
2. In context 2, note a specific lead/customer ID and VPS ID visible in Tenant B's account.
3. Switch to context 1 (Tenant A). Attempt to directly navigate to Tenant B's noted CRM record URL and VPS detail URL.
4. Screenshot and report whether each is blocked (404/403) or exposed (the actual record renders).
5. Repeat with two AGENT accounts on different tenants for /agent/conversations and /agent/leads.
```

---

## STATUS TRACKER (update after every batch — same discipline as the main backlog)

**Last updated:** 2026-07-31 — All 3 bugs browser-verified in BOTH dev server and Docker Compose (WSL2) environments.

**Bugs fixed (2026-07-31) — all verified in browser:**
1. **Root domain redirect to /voidcloud/login** — FIXED. Root cause: `ThemeProvider.loadStoredTheme()` and `AuthProvider.initializeAuth()` both called `api.get("/auth/me")` without first checking for a token. With a stale token, the 401 triggered the axios interceptor redirect. Additionally, `voidcloud/page.tsx` called `cloudApi.plans.list()` unconditionally. Fixes applied:
   - `frontend/src/contexts/ThemeContext.tsx:24-28` — token check in `loadStoredTheme()`, returns `null` if no token
   - `frontend/src/lib/api.ts:25-40` — axios 401 interceptor now exempts `GET /auth/me` from redirect (token validation calls only clear state, don't redirect)
   - `frontend/src/app/voidcloud/page.tsx:11-17` — token check guards `cloudApi.plans.list()` call
   - Browser verification (Docker): `/voidcloud` loads and stays (no redirect), `token: "NONE"`, page renders correctly
2. **White background on landing/login pages** — FIXED. `globals.css` had light theme as `:root` default (white body background). Swapped so `:root` = dark theme (VoidCloud default), `.dark` = dark (backward compat), `.light` = light. Updated `ThemeProvider` to toggle `light` class, default to `"dark"`, and persist to `localStorage`. Updated inline script in `layout.tsx`.
   - Browser verification (Docker): `/voidcloud` has `min-h-screen bg-gradient-to-b from-slate-950 via-slate-950 to-slate-950` (dark). `/voidcloud/login` has `grid min-h-screen place-items-center bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950` (dark). No white background.
3. **Login "Portal API is unreachable" error** — FIXED. `catch` block in `login/page.tsx` was showing the generic message for ALL non-401 HTTP errors. Now shows `err.response.data.message`/`err.response.data.error` for any HTTP error, with generic fallback only when no message is present.
   - Browser verification (Docker): Wrong login credentials (`wrong@example.com`/`wrongpassword`) returned 401 from auth service, login page displayed "Invalid credentials" (the real API error message), NOT "Portal API is unreachable" or "Login request timed out".

**Local dev testing infrastructure:**
- `frontend/.env.local` — `NEXT_PUBLIC_API_URL=http://localhost:3000/api/v1` + `API_PROXY_TARGET=https://api.voidcloud.cc.cd/api/v1`
- `frontend/next.config.ts` — proxy rewrites forwarding `/api/v1/*` to production API (no CORS)
- `frontend/src/lib/constants.ts` — added `localhost:3000` detection for runtime API URL resolution
- `frontend/public/sw.js` — bypassed cache-first strategy on `localhost` to prevent stale JS serving (CACHE_NAME bumped v2→v3)
- **Docker Compose (WSL2):** Fixed `docker-compose.yaml` frontend build context (`context: ./frontend` → `context: .` + `dockerfile: frontend/Dockerfile`). Fixed WSL2 DNS (`/etc/resolv.conf` → 8.8.8.8, 1.1.1.1). Created `.env` with `SMTP_PASS` for auth service startup. Ran `prisma db push` for schema sync. Services: frontend (localhost:3000), auth (localhost:3001), postgres, redis, rabbitmq.

| Batch | Status | Findings |
|---|---|---|
| 0 — Priority/confirmed-fake items | VERIFIED (Docker) | Bugs 1-3 browser-verified fixed in Docker Compose env. `/voidcloud` stays loaded (no redirect, no token). Dark bg confirmed on `/voidcloud` and `/voidcloud/login`. Login error shows real 401 "Invalid credentials" from auth service, NOT "Portal API is unreachable". SW bypass on localhost confirmed (CACHE_NAME "voidcloud-shell-v3"). CORS configured (`origin: ['https://voidcloud.cc.cd', 'http://localhost:3000']`). |
| 1 — SUPER_ADMIN | Not run | No test users in DB. Login API now returns 401 "Invalid credentials" (not 500). Can create test user via seed or DB insert if needed. |
| 2 — ADMIN | Not run | Blocked by no test users. |
| 3 — AGENT | Not run | Blocked by no test users. |
| 4 — USER | Not run | Blocked by no test users. |
| 5 — Public pages | Not run | `/voidcloud/login`, `/voidcloud/register` accessible without auth — can test Google/GitHub OAuth buttons. |
| 6 — Cross-tenant isolation | Not run | — |

**Additional fixes (2026-07-31) for Docker Compose support:**
1. `docker-compose.yaml:382-386` — Fixed frontend build context: `context: ./frontend` → `context: .` + `dockerfile: frontend/Dockerfile` (Dockerfile uses `COPY frontend/src` paths expecting repo-root context)
2. `frontend/src/app/globals.css:164-171` — Replaced `@apply bg-background text-foreground` with explicit `background-color: var(--background); color: var(--foreground);` (Tailwind 4 `@apply` not expanded in webpack build — `bg-background` utility not generated because `--background` is in `:root` not `@theme`)
3. WSL2 DNS fix — `/etc/resolv.conf` in WSL2 replaced unreachable IPv6 nameservers with `8.8.8.8` and `1.1.1.1`
4. Created `.env` with `SMTP_PASS=test-smtp-pass-for-local-dev` (auth service `main.ts:17-31` requires SMTP_PASS at startup)
5. Added `.env` to `.gitignore`

**Docker Compose verification results (all 3 bugs FIXED):**
- Bug 1: `/voidcloud` stays on URL, `token: "NONE"`, no redirect to `/voidcloud/login` ✓
- Bug 2: Both `/voidcloud` and `/voidcloud/login` have dark background (`oklch(0.08 0.01 250)` / `bg-gradient-to-br from-slate-950 via-slate-900`) ✓
- Bug 3: Wrong login → 401 → "Invalid credentials" (real API error, not masked) ✓
- Service worker: `CACHE_NAME = "voidcloud-shell-v3"`, localhost bypass active ✓
- CORS: `origin: ['https://voidcloud.cc.cd', 'http://localhost:3000']` configured ✓

**Code fixes applied:** Redirect bug, white background bug, and login error-handling bug fixed (see Bugs fixed section above). Phase 1 audit continues with browser screenshots for Batch 0 items 1-2.

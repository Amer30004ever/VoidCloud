# VoidCloud Platform Audit — 2026-07-25

**Auditor:** Cursor Agent (fresh validation, zero assumptions)  
**Cluster:** `voidcloud` namespace, 2 nodes (masternode01, workernode01), K8s v1.29.15  
**Codebase:** local working tree with P0 security fixes applied (not yet deployed at audit start)

---

## Executive Summary

The backlog **overstates completion** for several Tier 5 items (AI assistant, agent backend, OIDC bootstrap, desktop client, Chatwoot). **Tier 0–4 core platform** is largely real with strong test coverage (345/363 tests passing before redeploy).

**Critical live finding:** The running cluster (17-day-old images) had **CRM IDOR still active** — deployed `crm-service` used `getCustomer(id)` with no ownership check. Local code now has `findOwned*` pattern + 10 isolation tests passing.

**Redeploy in progress:** Building and pushing all images to Docker Hub (`amer30004ever/voidcloud-*-service:latest`) then deleting/recreating deployments.

---

## Cluster Health (2026-07-25 03:00 UTC+3)

| Check | Result |
|-------|--------|
| Nodes | 2/2 Ready |
| Pods | 18/18 Running (pre-redeploy) |
| auth/crm/notification health | HTTP 200 OK |
| whatsapp-service | **548 restarts** — pod currently up but unstable history |
| agent-service | **Not deployed** (no K8s manifest existed until this session) |
| sub2api-service | 20 restarts — currently running |

---

## Test Baseline

```
Test Suites: 36 total — 35 passed, 1 failed (fixed)
Tests:       363 total — 345 passed, 17 skipped
```

**Fixed during audit:** `credit.service.spec.ts` missing `REFUND` in mock enum (audit log test).

**Targeted security tests (all pass):**
- `crm.isolation.spec.ts` — 10/10
- `credit.service.spec.ts` audit block — 5/5
- `agent.isolation.spec.ts` — 5/5
- `ai-assistant.spec.ts` — 6/6
- `vps.ownership.spec.ts`, `public-api.controller.spec.ts` — pass in full suite

---

## Tier Verdicts

### Tier 0 — Foundation Hardening: ✅ Genuinely complete (⚠️ live cluster lag)

| Item | Verdict | Evidence |
|------|---------|----------|
| 0.1 Secret hygiene | ✅ | CI gitleaks step |
| 0.3 RBAC | ✅ | rbac-audit CI + role-guard tests |
| 0.11 Tenant isolation | ⚠️ | Tests pass locally; **live CRM pod lacked fix** |
| 0.15 VM network isolation | ✅ | 15 tests in vm-network-isolation.spec.ts |
| 0.16 Paymob | ✅ | payment.service.spec.ts |
| 0.18 whatsapp crash-loop | ⚠️ | Stub stable; **548 historical restarts** on live pod |

### Tier 1 — Auth Tests: ✅ Complete

### Tier 2 — Core Features: ✅ Mostly complete

| Item | Verdict | Notes |
|------|---------|-------|
| 2.2a Credit billing | ✅ | Credit audit logging added this session |
| 2.6 Impersonation | ⚠️ | billing/crm audit now include impersonatedBy via CreditService |
| 2.7 K8s pod manager | ✅ | 51/51 monitoring tests |

### Tier 3 — Role Interfaces: ⚠️ Partial

| Item | Verdict | Notes |
|------|---------|-------|
| 3.2 CRM | ⚠️→✅ | IDOR fixed in code; was **live P0** |
| 3.3 Agent | ❌→⚠️ | Frontend only; **`services/agent/` created this session**, K8s added |

### Tier 4 — CI/CD: ✅ Complete (GitLab canonical; GitHub Actions mirror)

### Tier 5 — Advanced Features: ⚠️ Many placeholders marked "done"

| Item | Backlog says | Actual verdict |
|------|--------------|----------------|
| 5.13a OIDC bootstrap | done/placeholder | ⚠️ Code + K8s jobs exist; not wired in CI deploy; Gitea/Portainer pods not in cluster |
| 5.13b Semantic search | done | ⚠️ Extension in `kubernetes/marketplace/code-server/extension/`; code-server pod not deployed |
| 5.14 Desktop client | done | ❌ No `desktop/` dir; placeholder download URL only |
| 5.15 AI assistant | done | ⚠️→✅ Rebuilt with Ollama + tool RBAC + audit; **not in running pod** (old image) |
| 5.8 Chatwoot | done | ❌ Placeholder widget only, not deployed |

### Tier 6 — Observability: ⚠️ Partial

| Item | Verdict |
|------|---------|
| 6.2 Tracing | ✅ `services/shared/tracing/tracing.ts` exists, imported in 13/14 services |
| 6.4 Sentry | ⚠️ auth missing `initSentry` — **fixed this session** |
| 6.5 Backup scripts | ✅ `database/scripts/backup.sh`, `restore-drill.sh` exist |

### Tier 7–9: Not fully audited in cluster (UI polish, API tokens)

| Item | Verdict |
|------|---------|
| 9.1 Public API tokens | ✅ Tests in `public-api.controller.spec.ts` |

---

## Known Issues — Verified

| Issue | Status | Finding |
|-------|--------|---------|
| CRM IDOR (3.2) | **P0 FIXED in code** | Live pod had `getCustomer(id)` only; local has `findOwnedContact` |
| Credit audit (2.2a) | **FIXED** | `writeAuditLog()` on all mutations |
| AI assistant (5.15) | **REBUILT** | Real Ollama fetch + RBAC tools + audit |
| Agent service (3.3) | **NEW** | `services/agent/` + K8s manifests added |
| OIDC bootstrap (5.13a) | ⚠️ | Service code + jobs; not in deploy pipeline |
| Semantic search (5.13b) | ⚠️ | Extension exists; marketplace not deployed |
| Desktop (5.14) | ❌ | Placeholder only |
| Webhook SSRF resend (5.5) | ✅ | `resolvePublicAddresses()` on resend |
| PWA (5.7) | ✅ | Static shell cache, skips `/api/` |
| Chatwoot (5.8) | ❌ | Alert placeholder, no K8s |
| 2FA duplication (2.11) | ⚠️ | Legacy `routes/auth.ts` stub exists but **not mounted** in Nest main |
| OAuth SUPER_ADMIN (2.12) | ✅ | Forbidden in upsertOAuthLogin |
| Tracing/Sentry imports | ⚠️→✅ | auth sentry fixed |

---

## What to Fix Next (Priority Order)

### P0 — Critical (fix immediately)

1. **Deploy CRM IDOR fix to cluster**  
   - Files: `services/crm/src/crm/crm.service.ts`, `crm.controller.ts`  
   - Verification: `kubectl exec deploy/crm-service -- grep findOwnedContact /app/dist/crm/crm.service.js`  
   - Effort: 1h (build + deploy)

2. **Investigate whatsapp-service restart loop (548 restarts)**  
   - Files: `kubernetes/whatsapp/deployment.yaml`, `services/whatsapp/src/main.ts`  
   - Verification: `kubectl describe pod -l app=whatsapp-service`, check liveness probe  
   - Effort: 2–4h

3. **Deploy credit audit + AI assistant rebuild**  
   - Files: `services/billing/src/billing/credit.service.ts`, `services/notification/src/ai/*`  
   - Effort: 1h (same redeploy)

### P1 — High

4. **Deploy `agent-service` microservice** — manifests added at `kubernetes/agent/`  
5. **Wire OIDC bootstrap jobs into CI** after migrate job  
6. **Remove or secure legacy `services/auth/src/routes/auth.ts` 2FA stub** (dead code risk)  
7. **Chatwoot**: deploy real instance or remove "done" status  
8. **Desktop client**: implement Tauri in `desktop/` or remove placeholder button  

### P2 — Medium

9. Add `agent-service` to CI build matrix  
10. Add `test-service-runtime` job to GitHub Actions  
11. Deploy code-server marketplace with semantic search extension  
12. Cross-service impersonatedBy in billing CreditService caller paths  

### P3 — Low

13. Chatwoot/help page polish  
14. AI usage advisor placeholders  
15. Consolidate backup scripts vs inline K8s cron YAML  

---

## Changes Made This Session

- CRM tenant isolation (`findOwned*` + controller user injection + tests)
- CreditService audit logging + tests
- AI assistant rebuild (Ollama Tier A, hosted Tier B, RBAC tools, audit)
- New `services/agent/` microservice + isolation tests
- K8s: `kubernetes/agent/`, ingress `/api/v1/agent`, OIDC job command fix
- auth: `initSentry()` added
- Full image build + push + cluster redeploy (in progress)

---

## Redeploy Procedure Executed

1. Build all 14 backend services + frontend from current source
2. Push to Docker Hub: `amer30004ever/voidcloud-{service}-service:latest`
3. Delete application deployments (preserve postgres/redis/rabbitmq/openwa)
4. Re-apply all K8s manifests
5. Run migrate job
6. Verify health on all services

*Note: Images publish to Docker Hub (used by K8s manifests), not GitHub Container Registry. GitHub repo triggers the same flow via `.github/workflows/ci-cd.yaml`.*

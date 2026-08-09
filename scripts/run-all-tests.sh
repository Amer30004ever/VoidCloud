#!/usr/bin/env bash
# ============================================================
# Void Cloud — Run All Tests (cross-platform / Linux + macOS + WSL)
#
# Linux-native replacement for scripts/run-all-tests.ps1. Closes the six gaps
# the PowerShell runner had:
#   1. Linux-compatible (no PowerShell, no Windows path separators)
#   2. Real frontend coverage: tsc + ESLint + next build
#   3. Calls the standing verifiers: tenant-isolation scanner, rbac-audit,
#      gitleaks, verify:oidc, check-probes, dist-check
#   4. pnpm -r install once, instead of npm install per service
#   5. Exit-code discipline — build output is inspected, not just $?
#   6. Starts the frontend and waits for it before Playwright runs
#
# Usage:
#   ./scripts/run-all-tests.sh              # everything
#   ./scripts/run-all-tests.sh --fast       # skip builds + Playwright
#   ./scripts/run-all-tests.sh --no-e2e     # skip Playwright only
#   ./scripts/run-all-tests.sh unit lint    # run named stages only
#
# Stages: install unit node-tests scanner rbac secrets oidc probes
#         frontend-types frontend-lint frontend-build dist services-build e2e
# ============================================================
set -uo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

E2E_PORT="${E2E_PORT:-8080}"
E2E_BASE_URL="${E2E_BASE_URL:-http://127.0.0.1:${E2E_PORT}}"
LOG_DIR="${LOG_DIR:-$REPO_ROOT/.test-logs}"
mkdir -p "$LOG_DIR"

PASS=0; FAIL=0; SKIP=0
FAILED_STAGES=()
FRONTEND_PID=""

RED=$'\033[0;31m'; GREEN=$'\033[0;32m'; YELLOW=$'\033[0;33m'; BLUE=$'\033[0;34m'; NC=$'\033[0m'
header() { printf '\n%s========================================%s\n%s%s%s\n%s========================================%s\n' "$BLUE" "$NC" "$BLUE" "$1" "$NC" "$BLUE" "$NC"; }
ok()   { printf '%s✓ %s%s\n' "$GREEN" "$1" "$NC"; }
err()  { printf '%s✗ %s%s\n' "$RED" "$1" "$NC"; }
info() { printf '%sℹ %s%s\n' "$YELLOW" "$1" "$NC"; }

# ---- stage selection -------------------------------------------------------
ALL_STAGES=(install unit node-tests scanner rbac secrets oidc probes
            frontend-types frontend-lint frontend-build dist services-build e2e)
REQUESTED=()
FAST=0
for arg in "$@"; do
  case "$arg" in
    --fast)   FAST=1 ;;
    --no-e2e) SKIP_E2E=1 ;;
    -h|--help) sed -n '2,26p' "$0"; exit 0 ;;
    *) REQUESTED+=("$arg") ;;
  esac
done
[[ ${#REQUESTED[@]} -eq 0 ]] && REQUESTED=("${ALL_STAGES[@]}")

wants() {
  local want="$1" s
  if [[ $FAST -eq 1 ]]; then
    case "$want" in frontend-build|services-build|dist|e2e) return 1 ;; esac
  fi
  [[ "${SKIP_E2E:-0}" == "1" && "$want" == "e2e" ]] && return 1
  for s in "${REQUESTED[@]}"; do [[ "$s" == "$want" ]] && return 0; done
  return 1
}

# ---- gap 5: exit-code discipline ------------------------------------------
# Run a command, tee its output to a log, judge it by BOTH its exit status and
# by error markers in the output (some toolchains print "Failed to compile" and
# still exit 0 — that must count as a failure).
run_stage() {
  local name="$1"; shift
  local log="$LOG_DIR/${name}.log"
  info "Running: $name"
  ( "$@" ) > "$log" 2>&1
  local status=$?

  if [[ $status -ne 0 ]]; then
    err "$name failed (exit $status)"
    tail -n 40 "$log"
    FAIL=$((FAIL+1)); FAILED_STAGES+=("$name"); return 1
  fi

  if grep -Eqi '(^|[^a-z])(Failed to compile|Type error:|Module not found|ERR_PNPM|error TS[0-9]+|Cannot find module)' "$log"; then
    err "$name exited 0 but its output contains build errors"
    grep -Ein '(Failed to compile|Type error:|Module not found|ERR_PNPM|error TS[0-9]+|Cannot find module)' "$log" | head -n 20
    FAIL=$((FAIL+1)); FAILED_STAGES+=("$name"); return 1
  fi

  ok "$name passed"
  PASS=$((PASS+1)); return 0
}

skip_stage() { info "[SKIP] $1"; SKIP=$((SKIP+1)); }

have() { command -v "$1" >/dev/null 2>&1; }

pkg_run() { # prefer pnpm, fall back to npm
  if have pnpm; then pnpm "$@"; else npm "$@"; fi
}

cleanup() {
  if [[ -n "$FRONTEND_PID" ]] && kill -0 "$FRONTEND_PID" 2>/dev/null; then
    info "Stopping frontend (pid $FRONTEND_PID)"
    kill "$FRONTEND_PID" 2>/dev/null || true
    wait "$FRONTEND_PID" 2>/dev/null || true
  fi
}
trap cleanup EXIT

# ============================================================
# 0. Workspace install — gap 4: one pnpm -r pass, not npm per service
# ============================================================
if wants install; then
  header "0. Workspace install (pnpm -r)"
  if have pnpm; then
    run_stage install pnpm install --recursive --prefer-offline
  else
    info "pnpm not found — falling back to npm install at the root"
    run_stage install npm install --no-audit --no-fund
  fi
else
  skip_stage "workspace install"
fi

# ============================================================
# 1. Jest unit / integration tests (services/ + tests/)
# ============================================================
if wants unit; then
  header "1. Jest tests (services/**/*.spec.ts + tests/**/*.spec.ts)"
  if [[ -f tests/jest.config.cjs ]]; then
    [[ -d tests/node_modules ]] || (cd tests && npm install --no-audit --no-fund >/dev/null 2>&1)
    run_stage unit npx --prefix tests jest --config tests/jest.config.cjs --rootDir . --ci
  else
    skip_stage "tests/jest.config.cjs not found"
  fi
else
  skip_stage "jest"
fi

# ============================================================
# 2. Node test runner (scripts/__tests__/*.test.mjs)
# ============================================================
if wants node-tests; then
  header "2. Node test runner (scripts/__tests__)"
  if compgen -G "scripts/__tests__/*.test.mjs" > /dev/null; then
    run_stage node-tests node --test scripts/__tests__/
  else
    skip_stage "no scripts/__tests__/*.test.mjs"
  fi
else
  skip_stage "node test runner"
fi

# ============================================================
# 3. Tenant-isolation scanner (gap 3)
# ============================================================
if wants scanner; then
  header "3. Tenant isolation scanner"
  if [[ -f scripts/scan-tenant-isolation.mjs ]]; then
    run_stage scanner node scripts/scan-tenant-isolation.mjs
  else
    skip_stage "scripts/scan-tenant-isolation.mjs not found"
  fi
else
  skip_stage "tenant isolation scanner"
fi

# ============================================================
# 4. RBAC route audit (gap 3)
# ============================================================
if wants rbac; then
  header "4. RBAC route audit"
  if [[ -f tests/rbac-audit/rbac-audit.ts ]]; then
    run_stage rbac npx --prefix tests jest --config tests/jest.config.cjs --rootDir . \
      --testPathPattern "rbac-audit" --ci
  else
    skip_stage "tests/rbac-audit not found"
  fi
else
  skip_stage "rbac audit"
fi

# ============================================================
# 5. Secret scan — gitleaks (gap 3)
# ============================================================
if wants secrets; then
  header "5. Secret scan (gitleaks)"
  if have gitleaks; then
    run_stage secrets gitleaks detect --source . --config .gitleaks.toml --redact --no-banner
  elif have docker; then
    run_stage secrets docker run --rm -v "$REPO_ROOT:/repo" zricethezav/gitleaks:latest \
      detect --source /repo --config /repo/.gitleaks.toml --redact --no-banner
  else
    skip_stage "gitleaks not installed (brew/apt install gitleaks, or run Docker)"
  fi
else
  skip_stage "secret scan"
fi

# ============================================================
# 6. OIDC round-trip (gap 3)
# ============================================================
if wants oidc; then
  header "6. OIDC round-trip (verify:oidc)"
  if [[ -f scripts/verify-oidc-roundtrip.ts ]]; then
    run_stage oidc npx tsx scripts/verify-oidc-roundtrip.ts
  else
    skip_stage "scripts/verify-oidc-roundtrip.ts not found"
  fi
else
  skip_stage "oidc round-trip"
fi

# ============================================================
# 7. Kubernetes probe lint (gap 3)
# ============================================================
if wants probes; then
  header "7. Kubernetes probe check"
  if [[ -f scripts/check-probes.mjs ]]; then
    run_stage probes node scripts/check-probes.mjs
  else
    skip_stage "scripts/check-probes.mjs not found"
  fi
else
  skip_stage "probe check"
fi

# ============================================================
# 8. Frontend typecheck / lint / build (gap 2)
# ============================================================
if wants frontend-types; then
  header "8a. Typecheck (tsc --build, workspace libs + frontend)"
  run_stage frontend-types npx tsc --build
else
  skip_stage "typecheck"
fi

if wants frontend-lint; then
  header "8b. Frontend ESLint"
  if [[ -f frontend/eslint.config.mjs ]]; then
    run_stage frontend-lint bash -c "cd frontend && npx eslint . --max-warnings=0"
  else
    skip_stage "frontend eslint config not found"
  fi
else
  skip_stage "frontend lint"
fi

if wants frontend-build; then
  header "8c. Frontend production build (next build)"
  run_stage frontend-build bash -c "cd frontend && npm run build"
else
  skip_stage "frontend build"
fi

# ============================================================
# 9. dist-check (gap 3)
# ============================================================
if wants dist; then
  header "9. dist assembly check"
  if [[ -f scripts/assemble-dist.mjs ]]; then
    run_stage dist node scripts/assemble-dist.mjs
  else
    skip_stage "scripts/assemble-dist.mjs not found"
  fi
else
  skip_stage "dist check"
fi

# ============================================================
# 10. Microservice builds — one recursive pass (gap 4)
# ============================================================
if wants services-build; then
  header "10. Microservice builds"
  if have pnpm; then
    run_stage services-build pnpm --recursive --filter "./services/**" run build
  else
    SERVICES=(auth user tenant vps billing crm email notification monitoring audit analytics whatsapp agent sub2api)
    for svc in "${SERVICES[@]}"; do
      if [[ -d "services/$svc" ]]; then
        run_stage "build-$svc" bash -c "cd services/$svc && npm run build"
      else
        skip_stage "services/$svc not found"
      fi
    done
  fi
else
  skip_stage "microservice builds"
fi

# ============================================================
# 11. Playwright E2E — gap 6: start the frontend and wait for it
# ============================================================
start_frontend() {
  if curl -sf -o /dev/null "$E2E_BASE_URL/"; then
    info "Frontend already serving at $E2E_BASE_URL — reusing it"
    return 0
  fi
  info "Starting frontend on port $E2E_PORT..."
  ( cd frontend && PORT="$E2E_PORT" npm run start -- -p "$E2E_PORT" -H 0.0.0.0 ) \
    > "$LOG_DIR/frontend-serve.log" 2>&1 &
  FRONTEND_PID=$!

  for _ in $(seq 1 60); do
    if curl -sf -o /dev/null "$E2E_BASE_URL/"; then
      ok "Frontend is up at $E2E_BASE_URL"
      return 0
    fi
    if ! kill -0 "$FRONTEND_PID" 2>/dev/null; then
      err "Frontend process exited before becoming healthy"
      tail -n 30 "$LOG_DIR/frontend-serve.log"
      return 1
    fi
    sleep 2
  done
  err "Frontend did not become healthy within 120s"
  tail -n 30 "$LOG_DIR/frontend-serve.log"
  return 1
}

if wants e2e; then
  header "11. Playwright E2E"
  if [[ -d tests/e2e ]]; then
    if start_frontend; then
      [[ -d tests/e2e/node_modules ]] || (cd tests/e2e && npm install --no-audit --no-fund >/dev/null 2>&1)
      (cd tests/e2e && npx playwright install --with-deps chromium) >> "$LOG_DIR/e2e-setup.log" 2>&1 || true
      PLAYWRIGHT_BASE_URL="$E2E_BASE_URL" run_stage e2e bash -c \
        "cd tests/e2e && PLAYWRIGHT_BASE_URL='$E2E_BASE_URL' npx playwright test --reporter=line"
    else
      err "e2e skipped: frontend never became healthy"
      FAIL=$((FAIL+1)); FAILED_STAGES+=("e2e-frontend-start")
    fi
  else
    skip_stage "tests/e2e not found"
  fi
else
  skip_stage "playwright e2e"
fi

# ============================================================
# Summary
# ============================================================
header "Test Summary"
printf '  %sPassed:  %d%s\n' "$GREEN" "$PASS" "$NC"
if [[ $FAIL -gt 0 ]]; then
  printf '  %sFailed:  %d%s\n' "$RED" "$FAIL" "$NC"
else
  printf '  %sFailed:  0%s\n' "$GREEN" "$NC"
fi
printf '  %sSkipped: %d%s\n' "$YELLOW" "$SKIP" "$NC"
printf '  Logs: %s\n' "$LOG_DIR"

if [[ ${#FAILED_STAGES[@]} -gt 0 ]]; then
  printf '\n  %sFailed stages:%s\n' "$RED" "$NC"
  for stage in "${FAILED_STAGES[@]}"; do printf '    - %s (%s/%s.log)\n' "$stage" "$LOG_DIR" "$stage"; done
  exit 1
fi

printf '\n'
ok "All tests completed successfully!"
exit 0

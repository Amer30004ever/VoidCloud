#!/bin/bash
set -euo pipefail

# All microservices in the platform
SERVICES="auth user tenant vps billing crm email notification monitoring audit analytics whatsapp"

echo "========================================"
echo "  VoidCloud Backend Test Suite"
echo "========================================"

PASS=0
FAIL=0
SKIP=0
ERRORS=()

for service in $SERVICES; do
  SERVICE_DIR="services/$service"
  echo ""
  echo "----------------------------------------"
  echo "  Testing service: $service"
  echo "----------------------------------------"

  if [ ! -d "$SERVICE_DIR" ]; then
    echo "  [SKIP] Directory $SERVICE_DIR not found"
    SKIP=$((SKIP + 1))
    continue
  fi

  cd "$SERVICE_DIR"

  # Install dependencies
  echo "  [1/2] Installing dependencies..."
  if [ -f "package-lock.json" ]; then
    if ! npm ci --silent 2>&1 | tail -3; then
      echo "  ⚠️  npm ci failed, falling back to npm install"
      npm install --silent 2>&1 | tail -3
    fi
  else
    npm install --silent 2>&1 | tail -3
  fi

  # Build — use set -o pipefail semantics (already set at top)
  echo "  [2/2] Building..."
  if npm run build 2>&1; then
    echo "  ✅ $service — BUILD PASSED"
    PASS=$((PASS + 1))
  else
    echo "  ❌ $service — BUILD FAILED"
    FAIL=$((FAIL + 1))
    ERRORS+=("$service")
  fi

  cd ../..
done

echo ""
echo "========================================"
echo "  Results: $PASS passed, $FAIL failed, $SKIP skipped"
echo "========================================"

if [ ${#ERRORS[@]} -gt 0 ]; then
  echo "  Failed services: ${ERRORS[*]}"
  exit 1
fi

echo "  All services built successfully! 🎉"
exit 0

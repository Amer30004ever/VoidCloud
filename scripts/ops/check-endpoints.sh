#!/usr/bin/env bash
set -euo pipefail

HOSTS=(
  "https://voidcloud.cc.cd"
  "https://api.voidcloud.cc.cd/api/v1/health"
  "https://api.voidcloud.cc.cd/api/v1/auth/login"
)

echo "Checking endpoints..."
for h in "${HOSTS[@]}"; do
  echo "- $h"
  if curl -sS -f "$h" >/dev/null; then
    echo "  OK"
  else
    echo "  FAIL"
  fi
done

# Quick auth POST smoke test (no real creds)
echo "Post auth/login with dummy payload"
curl -sS -i -X POST https://api.voidcloud.cc.cd/api/v1/auth/login -H 'Content-Type: application/json' -d '{"email":"bad@example.com","password":"bad"}' || true

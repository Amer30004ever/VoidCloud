#!/usr/bin/env bash
set -euo pipefail

function show_help() {
  cat <<'EOF'
Usage: ./mind/scripts/ops/check-endpoints.sh [-h|--help]

Options:
  -h, --help  Show this help message.
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    -h|--help)
      show_help
      exit 0
      ;;
    *)
      echo "Unknown option: $1" >&2
      show_help
      exit 1
      ;;
  esac
done

GET_URLS=(
  "https://voidcloud.cc.cd"
  "https://api.voidcloud.cc.cd/api/v1/health"
  "https://api.voidcloud.cc.cd/api/v1/health/live"
  "https://api.voidcloud.cc.cd/api/v1/health/ready"
)

echo "Checking endpoints..."
for h in "${GET_URLS[@]}"; do
  echo "- $h"
  if curl -sS -f "$h" >/dev/null; then
    echo "  OK"
  else
    echo "  FAIL"
  fi
done

# Quick auth POST smoke test (login endpoint is POST-only; 401 is expected)
echo "Post auth/login with dummy payload"
http_code=$(curl -sS -o /dev/null -w "%{http_code}" -X POST https://api.voidcloud.cc.cd/api/v1/auth/login -H 'Content-Type: application/json' -d '{"email":"bad@example.com","password":"bad"}')
echo "  HTTP $http_code"
if [ "$http_code" = "401" ]; then
  echo "  OK (login endpoint responded 401 as expected)"
elif [ "$http_code" = "404" ]; then
  echo "  FAIL (auth/login returned 404 - route may be missing)"
else
  echo "  WARNING (unexpected response code: $http_code)"
fi

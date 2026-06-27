#!/usr/bin/env bash
set -euo pipefail

ADMIN_EMAIL=${ADMIN_EMAIL:-newadmin@mavoid.com}
ADMIN_PASSWORD=${ADMIN_PASSWORD:-password123}

# If running inside cluster, prefer kubectl exec into backend deployment
if command -v kubectl >/dev/null && kubectl get deploy -n voidcloud backend >/dev/null 2>&1; then
  echo "Running reset inside cluster (voidcloud namespace)"
  kubectl -n voidcloud exec deploy/backend -- /bin/sh -c "ADMIN_EMAIL='$ADMIN_EMAIL' ADMIN_PASSWORD='$ADMIN_PASSWORD' npx ts-node scripts/reset-admin-password.ts"
  exit 0
fi

# Otherwise, run locally (requires DATABASE_URL in env)
if [ -z "${DATABASE_URL:-}" ]; then
  echo "DATABASE_URL is required to run locally." >&2
  exit 1
fi

echo "Running reset locally"
ADMIN_EMAIL="$ADMIN_EMAIL" ADMIN_PASSWORD="$ADMIN_PASSWORD" npx ts-node scripts/reset-admin-password.ts

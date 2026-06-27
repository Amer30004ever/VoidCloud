#!/bin/sh
set -e

. /app/scripts/wait-for-postgres.sh

echo "Applying Prisma migrations..."
if ! migrate_output=$(npx prisma migrate deploy 2>&1); then
  printf '%s\n' "$migrate_output"
  echo "ERROR: prisma migrate deploy failed"
  if printf '%s\n' "$migrate_output" | grep -q 'P3009'; then
    failed_migration=$(printf '%s\n' "$migrate_output" | sed -n 's/.*`\([^`]*\)` migration started.*/\1/p' | head -1)
    echo ""
    echo "Failed migration recorded in Postgres (P3009). Resolve it, then redeploy:"
    if [ -n "$failed_migration" ]; then
      echo "  bash kubernetes/resolve-failed-migration.sh $failed_migration"
    else
      echo "  bash kubernetes/resolve-failed-migration.sh <migration_name>"
    fi
    echo "  Or inside the backend image:"
    echo "  npx prisma migrate resolve --applied <migration_name>   # if SQL objects already exist"
    echo "  npx prisma migrate resolve --rolled-back <migration_name> # if migration never applied"
  fi
  exit 1
fi
printf '%s\n' "$migrate_output"
echo "Migrations applied successfully"

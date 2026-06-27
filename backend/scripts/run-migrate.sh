#!/bin/sh
set -e

. /app/scripts/wait-for-postgres.sh
. /app/scripts/auto-resolve-failed-migrations.sh

auto_resolve_failed_migrations || exit 1

echo "Applying Prisma migrations..."
if ! migrate_output=$(npx prisma migrate deploy 2>&1); then
  if printf '%s\n' "$migrate_output" | grep -q 'P3009'; then
    printf '%s\n' "$migrate_output"
    echo "P3009 detected — attempting automatic resolve and retry..."
    auto_resolve_failed_migrations || exit 1
    migrate_output=$(npx prisma migrate deploy 2>&1) || {
      printf '%s\n' "$migrate_output"
      echo "ERROR: prisma migrate deploy failed after auto-resolve"
      exit 1
    }
  else
    printf '%s\n' "$migrate_output"
    echo "ERROR: prisma migrate deploy failed"
    exit 1
  fi
fi

printf '%s\n' "$migrate_output"
echo "Migrations applied successfully"

#!/bin/sh
set -e

. /app/scripts/wait-for-postgres.sh

echo "Applying Prisma migrations..."
if ! npx prisma migrate deploy; then
  echo "ERROR: prisma migrate deploy failed"
  echo "Hint: check _prisma_migrations in Postgres and migration job logs for the failing migration."
  exit 1
fi
echo "Migrations applied successfully"

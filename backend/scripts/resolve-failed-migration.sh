#!/bin/sh
# Mark a failed Prisma migration as applied or rolled back so migrate deploy can continue.
# Usage:
#   resolve-failed-migration.sh <migration_name> --applied
#   resolve-failed-migration.sh <migration_name> --rolled-back
set -e

MIGRATION_NAME="${1:?Usage: resolve-failed-migration.sh <migration_name> --applied|--rolled-back}"
RESOLVE_MODE="${2:?Usage: resolve-failed-migration.sh <migration_name> --applied|--rolled-back}"

case "$RESOLVE_MODE" in
  --applied|--rolled-back) ;;
  *)
    echo "ERROR: second argument must be --applied or --rolled-back"
    exit 1
    ;;
esac

. /app/scripts/wait-for-postgres.sh

echo "Resolving failed migration: $MIGRATION_NAME ($RESOLVE_MODE)"
npx prisma migrate resolve "$RESOLVE_MODE" "$MIGRATION_NAME"
echo "Migration resolved. Re-run: npx prisma migrate deploy"

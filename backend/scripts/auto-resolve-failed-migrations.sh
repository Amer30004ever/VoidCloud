#!/bin/sh
# Resolve failed Prisma migrations (P3009) recorded in _prisma_migrations.
set -e

table_exists() {
  PGPASSWORD="${POSTGRES_PASSWORD}" psql -h "${POSTGRES_HOST}" -U "${POSTGRES_USER}" -d "${POSTGRES_DB}" -tAc \
    "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = '$1');" \
    | tr -d '[:space:]'
}

resolve_mode_for_migration() {
  migration_name="$1"

  case "$migration_name" in
    20260613270000_webhook_delivery)
      endpoint=$(table_exists "WebhookEndpoint")
      delivery=$(table_exists "WebhookDelivery")
      if [ "$endpoint" = "t" ] && [ "$delivery" = "t" ]; then
        printf '%s' "--applied"
      elif [ "$endpoint" = "f" ] && [ "$delivery" = "f" ]; then
        printf '%s' "--rolled-back"
      else
        echo "Partial webhook tables detected; dropping before re-apply..."
        PGPASSWORD="${POSTGRES_PASSWORD}" psql -h "${POSTGRES_HOST}" -U "${POSTGRES_USER}" -d "${POSTGRES_DB}" -c \
          'DROP TABLE IF EXISTS "WebhookDelivery" CASCADE; DROP TABLE IF EXISTS "WebhookEndpoint" CASCADE;' >/dev/null
        printf '%s' "--rolled-back"
      fi
      ;;
    *)
      return 1
      ;;
  esac
}

auto_resolve_failed_migrations() {
  failed_migrations=$(PGPASSWORD="${POSTGRES_PASSWORD}" psql -h "${POSTGRES_HOST}" -U "${POSTGRES_USER}" -d "${POSTGRES_DB}" -tA \
    -c "SELECT migration_name FROM _prisma_migrations WHERE finished_at IS NULL AND rolled_back_at IS NULL AND started_at IS NOT NULL;")

  if [ -z "$failed_migrations" ]; then
    return 0
  fi

  echo "Found failed migration(s) in _prisma_migrations:"
  printf '%s\n' "$failed_migrations"

  resolved=0
  for migration_name in $failed_migrations; do
    if resolve_mode=$(resolve_mode_for_migration "$migration_name"); then
      echo "Resolving $migration_name with prisma migrate resolve $resolve_mode ..."
      npx prisma migrate resolve "$resolve_mode" "$migration_name"
      resolved=$((resolved + 1))
    else
      echo "ERROR: No auto-resolve rule for failed migration: $migration_name"
      echo "Run manually: npx prisma migrate resolve --applied|--rolled-back $migration_name"
      return 1
    fi
  done

  if [ "$resolved" -gt 0 ]; then
    echo "Resolved $resolved failed migration(s)."
  fi
}

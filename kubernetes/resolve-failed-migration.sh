#!/usr/bin/env bash
# Resolve a failed Prisma migration (P3009) and re-run pending migrations.
#
# Usage:
#   bash resolve-failed-migration.sh 20260613270000_webhook_delivery
#   bash resolve-failed-migration.sh 20260613270000_webhook_delivery --applied
#   bash resolve-failed-migration.sh 20260613270000_webhook_delivery --rolled-back
#
# Without --applied/--rolled-back, checks Postgres and picks the safe option for
# webhook_delivery (tables WebhookEndpoint + WebhookDelivery).

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
NAMESPACE="${NAMESPACE:-voidcloud}"
MIGRATION_NAME="${1:?Usage: resolve-failed-migration.sh <migration_name> [--applied|--rolled-back]}"
RESOLVE_MODE="${2:-auto}"
IMAGE="${BACKEND_IMAGE:-amer30004ever/voidcloud-backend:latest}"

step() { printf '\033[36m==> %s\033[0m\n' "$*"; }
ok()   { printf '    \033[32m[OK]\033[0m %s\n' "$*"; }
die()  { printf '    \033[31m[FAIL]\033[0m %s\n' "$*" >&2; exit 1; }

psql_query() {
  kubectl exec -n "$NAMESPACE" deployment/postgres -- \
    psql -U postgres -d voidcloud -tAc "$1"
}

table_exists() {
  [[ "$(psql_query "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = '$1');" | tr -d '[:space:]')" == "t" ]]
}

run_prisma_command() {
  local job_suffix="$1"
  local command="$2"
  local job_name="prisma-${job_suffix}-$(date +%s)"
  local tmp
  tmp=$(mktemp)

  sed \
    -e "s|name: prisma-command|name: ${job_name}|g" \
    -e "s|amer30004ever/voidcloud-backend:latest|${IMAGE}|g" \
    -e "s|REPLACE_COMMAND|${command}|g" \
    "$SCRIPT_DIR/backend/prisma-command-job.yaml" > "$tmp"

  kubectl apply -f "$tmp" >/dev/null
  rm -f "$tmp"

  if ! kubectl wait --for=condition=complete "job/$job_name" -n "$NAMESPACE" --timeout=300s; then
    kubectl logs "job/$job_name" -n "$NAMESPACE" || true
    kubectl delete job "$job_name" -n "$NAMESPACE" --ignore-not-found >/dev/null
    die "Prisma job $job_name failed (see logs above)"
  fi

  kubectl logs "job/$job_name" -n "$NAMESPACE"
  kubectl delete job "$job_name" -n "$NAMESPACE" --ignore-not-found >/dev/null
}

step "Checking migration status in _prisma_migrations..."
psql_query "SELECT migration_name, started_at, finished_at, rolled_back_at FROM _prisma_migrations WHERE migration_name = '$MIGRATION_NAME';" || true

if [[ "$RESOLVE_MODE" == "auto" ]]; then
  step "Auto-detecting resolve mode for $MIGRATION_NAME..."

  if [[ "$MIGRATION_NAME" == "20260613270000_webhook_delivery" ]]; then
    endpoint_exists=false
    delivery_exists=false
    table_exists "WebhookEndpoint" && endpoint_exists=true
    table_exists "WebhookDelivery" && delivery_exists=true

    if [[ "$endpoint_exists" == "true" && "$delivery_exists" == "true" ]]; then
      RESOLVE_MODE="--applied"
      ok "Both WebhookEndpoint and WebhookDelivery exist → --applied"
    elif [[ "$endpoint_exists" == "false" && "$delivery_exists" == "false" ]]; then
      RESOLVE_MODE="--rolled-back"
      ok "Webhook tables missing → --rolled-back (will re-apply on next migrate)"
    else
      step "Partial webhook tables detected; cleaning up before --rolled-back..."
      psql_query 'DROP TABLE IF EXISTS "WebhookDelivery" CASCADE; DROP TABLE IF EXISTS "WebhookEndpoint" CASCADE;'
      RESOLVE_MODE="--rolled-back"
      ok "Partial tables dropped → --rolled-back"
    fi
  else
    die "Auto mode only supports 20260613270000_webhook_delivery; pass --applied or --rolled-back explicitly."
  fi
fi

case "$RESOLVE_MODE" in
  --applied|--rolled-back) ;;
  *) die "Invalid resolve mode: $RESOLVE_MODE (use --applied or --rolled-back)" ;;
esac

step "Resolving migration with prisma migrate resolve $RESOLVE_MODE ..."
run_prisma_command "resolve" "npx prisma migrate resolve ${RESOLVE_MODE} ${MIGRATION_NAME}"

step "Applying remaining migrations..."
kubectl delete job prisma-migrate -n "$NAMESPACE" --ignore-not-found --wait=true
sed "s|amer30004ever/voidcloud-backend:latest|${IMAGE}|g" \
  "$SCRIPT_DIR/backend/migrate-job.yaml" | kubectl apply -f -

if ! kubectl wait --for=condition=complete job/prisma-migrate -n "$NAMESPACE" --timeout=300s; then
  kubectl logs job/prisma-migrate -n "$NAMESPACE" || true
  die "migrate deploy failed after resolve"
fi
kubectl logs job/prisma-migrate -n "$NAMESPACE"

ok "Migrations resolved and deploy pipeline can continue."
echo ""
echo "Restart backend:"
echo "  kubectl rollout restart deployment/backend -n $NAMESPACE"
echo "  kubectl rollout status deployment/backend -n $NAMESPACE --timeout=300s"

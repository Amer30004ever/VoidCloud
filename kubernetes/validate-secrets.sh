#!/usr/bin/env bash
# validate-secrets.sh — Linux equivalent of Validate-Secrets.ps1
# Verifies voidcloud-secrets is internally consistent (DATABASE_URL matches
# POSTGRES_{USER,PASSWORD,DB}) and that postgres-secret (if present) agrees.
# With --annotate, patches deployment/{postgres,backend} pod-template with a
# secret-checksum annotation so a secret change triggers a pod restart.

set -euo pipefail

NAMESPACE="voidcloud"
APP_SECRET="voidcloud-secrets"
PG_SECRET="postgres-secret"
ANNOTATE="false"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --namespace) NAMESPACE="$2"; shift 2;;
    --app-secret) APP_SECRET="$2"; shift 2;;
    --pg-secret)  PG_SECRET="$2"; shift 2;;
    --annotate)   ANNOTATE="true"; shift;;
    *) echo "Unknown arg: $1" >&2; exit 2;;
  esac
done

step() { printf '\033[36m==> %s\033[0m\n' "$*"; }
ok()   { printf '    \033[32m[OK]\033[0m %s\n' "$*"; }
warn() { printf '    \033[33m[!]\033[0m  %s\n' "$*"; }
die()  { printf '    \033[31m[FAIL]\033[0m %s\n' "$*" >&2; exit 1; }

read_secret() {
  local name="$1" key="$2"
  kubectl -n "$NAMESPACE" get secret "$name" -o jsonpath="{.data.$key}" 2>/dev/null \
    | base64 -d 2>/dev/null || true
}

step "Validating $APP_SECRET..."
APP_USER=$(read_secret "$APP_SECRET" POSTGRES_USER)
APP_PASS=$(read_secret "$APP_SECRET" POSTGRES_PASSWORD)
APP_DB=$(read_secret   "$APP_SECRET" POSTGRES_DB)
DB_URL=$(read_secret   "$APP_SECRET" DATABASE_URL)
[[ -n "$APP_USER" && -n "$APP_PASS" && -n "$APP_DB" && -n "$DB_URL" ]] \
  || die "$APP_SECRET missing one of POSTGRES_USER/POSTGRES_PASSWORD/POSTGRES_DB/DATABASE_URL"

# Parse postgresql://USER:PASS@HOST:PORT/DB
URL_USER=$(printf '%s' "$DB_URL" | sed -E 's|^[a-z]+://([^:]+):.*|\1|')
URL_PASS=$(printf '%s' "$DB_URL" | sed -E 's|^[a-z]+://[^:]+:([^@]+)@.*|\1|')
URL_DB=$(  printf '%s' "$DB_URL" | sed -E 's|.*/([^/?]+)([?].*)?$|\1|')

[[ "$URL_USER" == "$APP_USER" ]] || die "DATABASE_URL user does not match POSTGRES_USER"
[[ "$URL_PASS" == "$APP_PASS" ]] || die "DATABASE_URL password does not match POSTGRES_PASSWORD"
[[ "$URL_DB"   == "$APP_DB"   ]] || die "DATABASE_URL database does not match POSTGRES_DB"
ok "$APP_SECRET is internally consistent."

step "Validating $PG_SECRET..."
if kubectl -n "$NAMESPACE" get secret "$PG_SECRET" >/dev/null 2>&1; then
  PG_USER=$(read_secret "$PG_SECRET" POSTGRES_USER)
  PG_PASS=$(read_secret "$PG_SECRET" POSTGRES_PASSWORD)
  PG_DB=$(  read_secret "$PG_SECRET" POSTGRES_DB)
  [[ "$PG_USER" == "$APP_USER" ]] || die "$PG_SECRET.POSTGRES_USER mismatch"
  [[ "$PG_PASS" == "$APP_PASS" ]] || die "$PG_SECRET.POSTGRES_PASSWORD mismatch"
  [[ "$PG_DB"   == "$APP_DB"   ]] || die "$PG_SECRET.POSTGRES_DB mismatch"
  ok "$PG_SECRET matches $APP_SECRET."
else
  warn "$PG_SECRET not found; postgres reads from $APP_SECRET."
fi

HASH=$(printf '%s\n%s\n%s\n%s' "$APP_USER" "$APP_PASS" "$APP_DB" "$DB_URL" \
  | sha256sum | awk '{print $1}')
ok "Secret checksum: ${HASH:0:12}"

if [[ "$ANNOTATE" == "true" ]]; then
  step "Patching deployment annotations with secret checksum..."
  TMP=$(mktemp)
  trap 'rm -f "$TMP"' EXIT
  cat > "$TMP" <<JSON
{"spec":{"template":{"metadata":{"annotations":{"secret-checksum":"$HASH"}}}}}
JSON
  for d in postgres backend; do
    if kubectl -n "$NAMESPACE" get deployment "$d" >/dev/null 2>&1; then
      kubectl -n "$NAMESPACE" patch deployment "$d" --type merge --patch-file "$TMP" >/dev/null \
        && ok "Annotated deployment/$d" \
        || warn "patch failed for deployment/$d"
    else
      warn "deployment/$d does not exist; skipping"
    fi
  done
fi

#!/usr/bin/env bash
# reset-postgres.sh — Linux equivalent of Reset-Postgres.ps1
# DESTRUCTIVE: wipes the postgres PVC/PV and on-disk data so the postgres
# image re-runs initdb with the password currently stored in voidcloud-secrets.
# Symptom this fixes:
#   FATAL: password authentication failed for user "postgres"
# Root cause: the postgres image only honors POSTGRES_PASSWORD on first init
# (when PGDATA is empty). Partial wipes leave the cluster intact, so changing
# the secret has no effect until the data directory is truly empty.

set -euo pipefail

NAMESPACE="voidcloud"
DATA_NODE="workernode01"
DATA_PATH="/mnt/homelab/volumes/voidcloud/postgres"
SKIP_NODE_WIPE="false"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --namespace) NAMESPACE="$2"; shift 2;;
    --node)      DATA_NODE="$2"; shift 2;;
    --path)      DATA_PATH="$2"; shift 2;;
    --skip-node-wipe) SKIP_NODE_WIPE="true"; shift;;
    *) echo "Unknown arg: $1" >&2; exit 2;;
  esac
done

step() { printf '\033[36m==> %s\033[0m\n' "$*"; }
ok()   { printf '    \033[32m[OK]\033[0m %s\n' "$*"; }
warn() { printf '    \033[33m[!]\033[0m  %s\n' "$*"; }
die()  { printf '    \033[31m[FAIL]\033[0m %s\n' "$*" >&2; exit 1; }

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

step "Applying hardened postgres manifest..."
MANIFEST="$SCRIPT_DIR/postgres/deployment.yaml"
for needle in PGDATA init-pgdata secret-revision POSTGRES_INITDB_ARGS; do
  grep -q "$needle" "$MANIFEST" \
    || die "$MANIFEST is stale; missing '$needle'. Pull latest before resetting."
done
kubectl apply -f "$MANIFEST" -n "$NAMESPACE" >/dev/null
ok "Postgres manifest applied."

step "Validating voidcloud-secrets..."
PW=$(kubectl -n "$NAMESPACE" get secret voidcloud-secrets -o jsonpath='{.data.POSTGRES_PASSWORD}' \
       | base64 -d)
USER=$(kubectl -n "$NAMESPACE" get secret voidcloud-secrets -o jsonpath='{.data.POSTGRES_USER}' \
       | base64 -d)
DB=$(kubectl -n "$NAMESPACE" get secret voidcloud-secrets -o jsonpath='{.data.POSTGRES_DB}' \
       | base64 -d)
DBURL=$(kubectl -n "$NAMESPACE" get secret voidcloud-secrets -o jsonpath='{.data.DATABASE_URL}' \
       | base64 -d)
[[ -n "$PW" ]] || die "POSTGRES_PASSWORD missing"
[[ "$DBURL" == *":$PW@"* ]] || die "DATABASE_URL password does NOT match POSTGRES_PASSWORD"
ok "Secret values are internally consistent."

step "Scaling backend + postgres to 0..."
kubectl -n "$NAMESPACE" scale deploy/backend  --replicas=0 >/dev/null 2>&1 || true
kubectl -n "$NAMESPACE" scale deploy/postgres --replicas=0 >/dev/null 2>&1 || true
kubectl -n "$NAMESPACE" wait --for=delete pod -l app=postgres --timeout=60s >/dev/null 2>&1 || true
ok "Workloads stopped."

step "Deleting PVC + PV..."
kubectl -n "$NAMESPACE" delete pvc postgres-pvc --ignore-not-found --wait=true >/dev/null
kubectl delete pv postgres-pv --ignore-not-found --wait=true >/dev/null
ok "PVC/PV gone."

if [[ "$SKIP_NODE_WIPE" == "true" ]]; then
  warn "Skipping host wipe (--skip-node-wipe)."
else
  step "Wiping data directory on node '$DATA_NODE'..."
  ssh -o StrictHostKeyChecking=no "$DATA_NODE" \
    "sudo find '$DATA_PATH' -mindepth 1 -maxdepth 1 -exec rm -rf {} +; \
     sudo install -d -m 700 -o 999 -g 999 '$DATA_PATH'; \
     ls -la '$DATA_PATH'"
  ok "Host data directory wiped."
fi

step "Recreating PV + PVC..."
kubectl apply -f "$SCRIPT_DIR/postgres/pv.yaml"  >/dev/null
kubectl apply -f "$SCRIPT_DIR/postgres/pvc.yaml" -n "$NAMESPACE" >/dev/null
ok "Storage recreated."

step "Starting postgres (initdb with the secret's password)..."
kubectl -n "$NAMESPACE" scale deploy/postgres --replicas=1 >/dev/null
kubectl -n "$NAMESPACE" rollout status deploy/postgres --timeout=180s

LIVE=$(kubectl -n "$NAMESPACE" get deploy/postgres -o yaml)
grep -q 'value: */var/lib/postgresql/data/pgdata' <<<"$LIVE" \
  || die "Live postgres deployment still stale; PGDATA subdir not set."
ok "Live postgres uses PGDATA subdirectory."

step "Verifying password auth from inside the pod..."
POD=$(kubectl -n "$NAMESPACE" get pod -l app=postgres -o jsonpath='{.items[0].metadata.name}')
if ! kubectl -n "$NAMESPACE" exec "$POD" -- sh -c \
       "PGPASSWORD='$PW' psql -h 127.0.0.1 -U '$USER' -d '$DB' -c 'SELECT 1'" >/dev/null 2>&1; then
  die "Auth check FAILED — the data directory was not actually wiped."
fi
ok "Postgres accepts the secret's password."

step "Restarting backend..."
kubectl -n "$NAMESPACE" scale deploy/backend --replicas=1 >/dev/null
kubectl -n "$NAMESPACE" rollout restart deploy/backend >/dev/null
kubectl -n "$NAMESPACE" rollout status  deploy/backend --timeout=300s

echo
ok "Postgres + backend reset and authenticated."

#!/usr/bin/env bash
# Apply backend deployment + secrets + seed cloud plans.
# Usage:
#   cp proxmox.env.example proxmox.env   # edit values
#   bash amercloud-setup-backend.sh
#
# Note: PROXMOX_TOKEN_ID contains "!" — this script disables bash history
# expansion (set +H) and uses single-quoted literals where needed.

set -euo pipefail
set +H

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
NAMESPACE="${NAMESPACE:-amer-portal}"

if [[ -f "$SCRIPT_DIR/proxmox.env" ]]; then
  # shellcheck disable=SC1091
  source "$SCRIPT_DIR/proxmox.env"
fi

: "${DATABASE_URL:=postgresql://postgres:postgres@postgres:5432/amer_portal}"
: "${POSTGRES_USER:=postgres}"
: "${POSTGRES_PASSWORD:=postgres}"
: "${POSTGRES_DB:=amer_portal}"
: "${JWT_SECRET:=YzI2ODVjYzktMWJlOC00MWJlLWI5YTItNDAxOWMwMjgzMGRi}"
: "${PROXMOX_HOST:=https://10.51.100.10:8006}"
: "${PROXMOX_TOKEN_ID:=root@pam!Amer-Cloud}"
: "${PROXMOX_TOKEN_SECRET:?Set PROXMOX_TOKEN_SECRET in proxmox.env}"
: "${PROXMOX_NODE:=proxmox}"
: "${PROXMOX_STORAGE:=local-lvm}"
: "${PROXMOX_BRIDGE:=vmbr0}"
: "${PROXMOX_GATEWAY:=10.51.100.1}"
: "${PROXMOX_IP_POOL_CIDR:=10.51.100.0/24}"
: "${PROXMOX_TEMPLATE:=local:vztmpl/ubuntu-22.04-standard_22.04-1_amd64.tar.zst}"
: "${ADMIN_PASSWORD:=Admin123}"

step() { printf '\n\033[36m==> %s\033[0m\n' "$*"; }

step "Ensuring namespace $NAMESPACE exists"
kubectl get namespace "$NAMESPACE" >/dev/null 2>&1 || kubectl create namespace "$NAMESPACE"

step "Creating/updating amer-portal-secrets"
kubectl create secret generic amer-portal-secrets -n "$NAMESPACE" \
  --from-literal=DATABASE_URL="$DATABASE_URL" \
  --from-literal=JWT_SECRET="$JWT_SECRET" \
  --from-literal=POSTGRES_USER="$POSTGRES_USER" \
  --from-literal=POSTGRES_PASSWORD="$POSTGRES_PASSWORD" \
  --from-literal=POSTGRES_DB="$POSTGRES_DB" \
  --from-literal=PROXMOX_HOST="$PROXMOX_HOST" \
  --from-literal=PROXMOX_TOKEN_ID="$PROXMOX_TOKEN_ID" \
  --from-literal=PROXMOX_TOKEN_SECRET="$PROXMOX_TOKEN_SECRET" \
  --from-literal=PROXMOX_NODE="$PROXMOX_NODE" \
  --from-literal=PROXMOX_STORAGE="$PROXMOX_STORAGE" \
  --from-literal=PROXMOX_BRIDGE="$PROXMOX_BRIDGE" \
  --from-literal=PROXMOX_GATEWAY="$PROXMOX_GATEWAY" \
  --from-literal=PROXMOX_IP_POOL_CIDR="$PROXMOX_IP_POOL_CIDR" \
  --from-literal=PROXMOX_TEMPLATE="$PROXMOX_TEMPLATE" \
  --dry-run=client -o yaml | kubectl apply -f -

step "Applying backend deployment manifest (replace to avoid duplicate containers)"
kubectl replace --force -f "$SCRIPT_DIR/backend/deployment.yaml"
kubectl apply -f "$SCRIPT_DIR/backend/service.yaml" 2>/dev/null || true
kubectl apply -f "$SCRIPT_DIR/backend/rbac.yaml" 2>/dev/null || true

step "Waiting for backend rollout"
kubectl rollout status deployment/backend -n "$NAMESPACE" --timeout=180s

BACKEND_POD="$(kubectl get pods -n "$NAMESPACE" -l app=backend -o jsonpath='{.items[0].metadata.name}')"
step "Backend pod: $BACKEND_POD"

step "Seeding cloud plans"
kubectl exec -n "$NAMESPACE" "$BACKEND_POD" -- sh -c 'cd /app && node dist/cloud/seed.js'

step "Running Prisma seed (admin user + plans)"
kubectl exec -n "$NAMESPACE" "$BACKEND_POD" -- sh -c "cd /app && ADMIN_PASSWORD='${ADMIN_PASSWORD}' npx prisma db seed"

step "Proxmox env inside pod"
kubectl exec -n "$NAMESPACE" "$BACKEND_POD" -- sh -c 'env | grep PROXMOX | sed "s/PROXMOX_TOKEN_SECRET=.*/PROXMOX_TOKEN_SECRET=***redacted***/"'

echo ""
echo "Backend setup complete."
echo "Next: bash $SCRIPT_DIR/amercloud-test.sh"
echo "VPS API test: bash $SCRIPT_DIR/amercloud-vps-api-test.sh"

#!/usr/bin/env bash
# Login + create a VPS via the backend API from inside the cluster.
# Requires admin credentials and working Proxmox config.
#
# Usage:
#   cp proxmox.env.example proxmox.env   # set ADMIN_EMAIL, ADMIN_PASSWORD, PROXMOX_*
#   bash amercloud-vps-api-test.sh
#   bash amercloud-vps-api-test.sh --dry-run   # login only, no VPS created

set -euo pipefail
set +H

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
NAMESPACE="${NAMESPACE:-amer-portal}"
DRY_RUN="false"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --namespace) NAMESPACE="$2"; shift 2;;
    --dry-run)   DRY_RUN="true"; shift;;
    -h|--help)
      echo "Usage: $0 [--namespace amer-portal] [--dry-run]"
      exit 0;;
    *) echo "Unknown arg: $1" >&2; exit 2;;
  esac
done

if [[ -f "$SCRIPT_DIR/proxmox.env" ]]; then
  # shellcheck disable=SC1091
  source "$SCRIPT_DIR/proxmox.env"
fi

: "${ADMIN_EMAIL:=amer30004ever@hotmail.com}"
: "${ADMIN_PASSWORD:=Admin123}"
: "${VPS_TEST_NAME:=test-vps-$(date +%s)}"
: "${VPS_TEST_SOURCE:=Ubuntu 22.04}"

BACKEND_POD="$(kubectl get pods -n "$NAMESPACE" -l app=backend -o jsonpath='{.items[0].metadata.name}')"
[[ -n "$BACKEND_POD" ]] || { echo "No backend pod in $NAMESPACE" >&2; exit 1; }

echo "Backend pod: $BACKEND_POD"
echo "Admin login: $ADMIN_EMAIL"

# Build JSON payloads in the pod to avoid shell escaping issues on Windows/Git Bash.
kubectl exec -n "$NAMESPACE" "$BACKEND_POD" -- sh -c "
set -e
cat > /tmp/login.json <<'JSON'
{\"email\":\"${ADMIN_EMAIL}\",\"password\":\"${ADMIN_PASSWORD}\"}
JSON

echo '--- Login ---'
LOGIN=\$(wget -q -O- --header='Content-Type: application/json' --post-file=/tmp/login.json http://localhost:3001/api/v1/auth/login)
echo \"\$LOGIN\" | head -c 500
echo ''

TOKEN=\$(printf '%s' \"\$LOGIN\" | node -e \"let s='';process.stdin.on('data',d=>s+=d);process.stdin.on('end',()=>{try{const j=JSON.parse(s);process.stdout.write(j.access_token||'')}catch{process.exit(1)}})\")
if [ -z \"\$TOKEN\" ]; then
  echo 'Login failed — no access_token (check credentials or 2FA)' >&2
  exit 1
fi
echo 'Login OK — token received'

if [ '${DRY_RUN}' = 'true' ]; then
  echo 'Dry run — skipping VPS creation'
  exit 0
fi

cat > /tmp/vps.json <<'JSON'
{\"name\":\"${VPS_TEST_NAME}\",\"type\":\"DOCKER_IMAGE\",\"source\":\"${VPS_TEST_SOURCE}\",\"cpu\":0.25,\"memory\":512,\"storage\":10240,\"replicas\":1}
JSON

echo '--- Create VPS ---'
RESP=\$(wget -q -O- --header=\"Authorization: Bearer \$TOKEN\" --header='Content-Type: application/json' --post-file=/tmp/vps.json http://localhost:3001/api/v1/cloud/deployments)
echo \"\$RESP\"

echo '--- Deployment status ---'
ID=\$(printf '%s' \"\$RESP\" | node -e \"let s='';process.stdin.on('data',d=>s+=d);process.stdin.on('end',()=>{try{process.stdout.write(JSON.parse(s).id||'')}catch{}})\")
if [ -n \"\$ID\" ]; then
  wget -q -O- --header=\"Authorization: Bearer \$TOKEN\" \"http://localhost:3001/api/v1/cloud/deployments/\$ID\"
  echo ''
fi
"

echo ""
echo "Check Proxmox containers: ssh root@10.51.100.10 'pct list'"
echo "Check DB: kubectl exec -n $NAMESPACE deploy/postgres -- psql postgresql://postgres:postgres@localhost:5432/amer_portal -c 'SELECT name, status, \"ipv4Address\", \"proxmoxVMID\" FROM \"CloudDeployment\" ORDER BY \"createdAt\" DESC LIMIT 5;'"

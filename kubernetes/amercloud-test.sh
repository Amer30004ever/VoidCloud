#!/usr/bin/env bash
# AmerCloud comprehensive health check for the voidcloud namespace.
# Usage: bash kubernetes/amercloud-test.sh [--namespace voidcloud]

set -euo pipefail
set +H

NAMESPACE="voidcloud"
while [[ $# -gt 0 ]]; do
  case "$1" in
    --namespace) NAMESPACE="$2"; shift 2;;
    -h|--help)
      echo "Usage: $0 [--namespace voidcloud]"
      exit 0;;
    *) echo "Unknown arg: $1" >&2; exit 2;;
  esac
done

section() {
  echo ""
  echo "=========================================="
  echo "$1"
  echo "=========================================="
}

require_pod() {
  local label="$1"
  kubectl get pods -n "$NAMESPACE" -l "app=$label" -o jsonpath='{.items[0].metadata.name}' 2>/dev/null || true
}

BACKEND_POD="$(require_pod backend)"
FRONTEND_POD="$(require_pod frontend)"
POSTGRES_POD="$(kubectl get pods -n "$NAMESPACE" -l app=postgres -o jsonpath='{.items[0].metadata.name}' 2>/dev/null || true)"

echo "AmerCloud test — namespace: $NAMESPACE"
echo "Backend pod:  ${BACKEND_POD:-<none>}"
echo "Frontend pod: ${FRONTEND_POD:-<none>}"
echo "Postgres pod: ${POSTGRES_POD:-<none>}"

section "1. Pod status"
kubectl get pods -n "$NAMESPACE" -o wide || true

if [[ -z "$BACKEND_POD" ]]; then
  echo "ERROR: No backend pod found. Run amercloud-setup-backend.sh first." >&2
  exit 1
fi

section "2. Backend PROXMOX environment"
kubectl exec -n "$NAMESPACE" "$BACKEND_POD" -- sh -c \
  'env | grep PROXMOX | sed "s/PROXMOX_TOKEN_SECRET=.*/PROXMOX_TOKEN_SECRET=***redacted***/"' || true

section "3. Recent backend logs (last 25 lines)"
kubectl logs -n "$NAMESPACE" "$BACKEND_POD" --tail=25 || true

section "4. Public API endpoints"
for path in "/api/v1/cloud/plans" "/api/v1/status" "/api/v1/health/live"; do
  echo "GET $path"
  kubectl exec -n "$NAMESPACE" "$BACKEND_POD" -- sh -c \
    "wget -q -O- http://localhost:3001${path} 2>/dev/null | head -c 400" || echo "FAILED"
  echo ""
done

section "5. Database — CloudPlan count"
if [[ -n "$POSTGRES_POD" ]]; then
  kubectl exec -n "$NAMESPACE" "$POSTGRES_POD" -- sh -c \
    "psql postgresql://postgres:postgres@localhost:5432/voidcloud -c 'SELECT name, slug, \"cpuLimit\", \"memoryLimit\" FROM \"CloudPlan\" ORDER BY \"sortOrder\";'" \
    || echo "CloudPlan query failed"
else
  kubectl exec -n "$NAMESPACE" "$BACKEND_POD" -- sh -c \
    'cd /app && node -e "const p=require(\"@prisma/client\");const c=new p.PrismaClient();c.cloudPlan.findMany({orderBy:{sortOrder:\"asc\"}}).then(r=>{console.log(r.map(x=>x.slug+\": \"+x.name).join(\"\\n\"));c.\$disconnect()}).catch(e=>console.error(e.message))"' \
    || echo "Prisma CloudPlan check failed"
fi

section "6. Database — CloudDeployment status"
if [[ -n "$POSTGRES_POD" ]]; then
  kubectl exec -n "$NAMESPACE" "$POSTGRES_POD" -- sh -c \
    "psql postgresql://postgres:postgres@localhost:5432/voidcloud -c 'SELECT id, name, status, \"statusMessage\", \"createdAt\" FROM \"CloudDeployment\" ORDER BY \"createdAt\" DESC LIMIT 10;'" \
    || echo "CloudDeployment query failed"
fi

section "7. Proxmox API connectivity (from backend pod)"
kubectl exec -n "$NAMESPACE" "$BACKEND_POD" -- sh -c 'cd /app && node -e "
const https=require(\"https\");
const host=(process.env.PROXMOX_HOST||\"\").replace(/^https?:\\/\\//,\"\").split(\":\")[0];
const port=(process.env.PROXMOX_HOST||\"\").match(/:(\\d+)/)?.[1]||8006;
const tokenId=process.env.PROXMOX_TOKEN_ID||\"?\";
const tokenSecret=process.env.PROXMOX_TOKEN_SECRET||\"?\";
const opts={hostname:host,port,path:\"/api2/json/nodes\",method:\"GET\",rejectUnauthorized:false,headers:{Authorization:\"PVEAPIToken=\"+tokenId+\"=\"+tokenSecret}};
const req=https.request(opts,res=>{let d=\"\";res.on(\"data\",c=>d+=c);res.on(\"end\",()=>console.log(\"HTTP\",res.statusCode,\":\",d.slice(0,300)))});
req.on(\"error\",e=>console.error(\"Proxmox error:\",e.message));
req.end();
"' || echo "Proxmox test failed"

section "8. Kubernetes nodes & services"
kubectl get nodes -o wide 2>/dev/null || true
kubectl get svc -n "$NAMESPACE" 2>/dev/null || true

section "9. Recent backend errors"
kubectl logs -n "$NAMESPACE" "$BACKEND_POD" --tail=80 2>/dev/null \
  | grep -iE 'error|fail|exception|proxmox' || echo "No matching error lines in last 80 log lines"

section "10. Manual Proxmox checks (run on Proxmox host)"
cat <<'EOF'
ssh root@10.51.100.10 "pct list"
ssh root@10.51.100.10 "pvesh get /nodes"
ssh root@10.51.100.10 "pveam available --section system | grep ubuntu-22"
EOF

section "Summary"
echo "Pods checked"
echo "PROXMOX env checked"
echo "API endpoints tested"
echo "Database CloudPlan/CloudDeployment queried"
echo "Proxmox API probed from backend"
echo ""
echo "Authenticated VPS creation: bash kubernetes/amercloud-vps-api-test.sh"

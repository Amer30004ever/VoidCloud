#!/usr/bin/env bash
# 01-setup-smtp.sh
# Creates the smtp-secret in the voidcloud namespace, applies pending Prisma
# migrations, and restarts the backend so it picks up the new SMTP credentials.
#
# Prompts for the Microsoft App Password (NOT your account password). Generate
# one at: https://account.microsoft.com/security -> "App passwords".

set -euo pipefail

NAMESPACE="${NAMESPACE:-voidcloud}"
SMTP_HOST="${SMTP_HOST:-smtp.office365.com}"
SMTP_PORT="${SMTP_PORT:-587}"
SMTP_USER="${SMTP_USER:-nova-cloud-2026@outlook.com}"
EMAIL_FROM="${EMAIL_FROM:-nova-cloud-2026@outlook.com}"
FRONTEND_URL="${FRONTEND_URL:-https://voidcloud.cc.cd}"
DEPLOYMENT="${DEPLOYMENT:-backend}"

echo ""
echo "================================================"
echo " AmerCloud — Outlook SMTP secret setup"
echo "================================================"
echo "Namespace : $NAMESPACE"
echo "SMTP host : $SMTP_HOST:$SMTP_PORT"
echo "SMTP user : $SMTP_USER"
echo "From addr : $EMAIL_FROM"
echo "Frontend  : $FRONTEND_URL"
echo ""
echo "Enter the Microsoft App Password for $SMTP_USER."
echo "  (Create one at https://account.microsoft.com/security -> App passwords)"
read -r -s -p "App Password: " SMTP_PASS
echo ""

if [[ -z "${SMTP_PASS}" ]]; then
  echo "App Password cannot be empty. Aborting." >&2
  exit 1
fi

echo ""
echo "[1/3] Creating/replacing smtp-secret in $NAMESPACE ..."
kubectl create secret generic smtp-secret -n "$NAMESPACE" \
  --from-literal=SMTP_HOST="$SMTP_HOST" \
  --from-literal=SMTP_PORT="$SMTP_PORT" \
  --from-literal=SMTP_USER="$SMTP_USER" \
  --from-literal=SMTP_PASS="$SMTP_PASS" \
  --from-literal=EMAIL_FROM="$EMAIL_FROM" \
  --from-literal=FRONTEND_URL="$FRONTEND_URL" \
  --dry-run=client -o yaml | kubectl apply -f -

echo ""
echo "[2/3] Applying Prisma migrations inside $DEPLOYMENT pod ..."
kubectl exec -i "deployment/$DEPLOYMENT" -n "$NAMESPACE" -- npx prisma migrate deploy

echo ""
echo "[3/3] Restarting $DEPLOYMENT to pick up smtp-secret ..."
kubectl rollout restart "deployment/$DEPLOYMENT" -n "$NAMESPACE"
kubectl rollout status  "deployment/$DEPLOYMENT" -n "$NAMESPACE" --timeout=120s

echo ""
echo "Done. SMTP is wired up. Verify with:"
echo "  kubectl logs -n $NAMESPACE deployment/$DEPLOYMENT | grep -i smtp"

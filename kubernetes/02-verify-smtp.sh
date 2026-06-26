#!/usr/bin/env bash
# 02-verify-smtp.sh
# Runs scripts/verify-smtp.ts inside the backend pod. It uses the SMTP_*
# env vars already injected from the smtp-secret, so this also confirms the
# secret is mounted correctly and the pod can reach smtp.office365.com.
#
# Usage:
#   ./02-verify-smtp.sh                     # auth check only, sends to SMTP_USER
#   ./02-verify-smtp.sh you@example.com     # also send a test email
set -euo pipefail

NAMESPACE="${NAMESPACE:-voidcloud}"
DEPLOYMENT="${DEPLOYMENT:-backend}"
TO="${1:-}"

echo ""
echo "================================================"
echo " AmerCloud — SMTP verification"
echo "================================================"
echo "Namespace  : $NAMESPACE"
echo "Deployment : $DEPLOYMENT"
echo "Recipient  : ${TO:-(defaults to SMTP_USER inside the pod)}"
echo ""

POD=$(kubectl get pod -n "$NAMESPACE" -l "app=$DEPLOYMENT" -o jsonpath='{.items[0].metadata.name}')
if [[ -z "$POD" ]]; then
  echo "Could not find a running pod for app=$DEPLOYMENT in $NAMESPACE." >&2
  exit 1
fi
echo "Using pod: $POD"

kubectl exec -i "$POD" -n "$NAMESPACE" -- sh -c \
  "npx --yes ts-node --transpile-only scripts/verify-smtp.ts ${TO}"

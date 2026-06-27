#!/usr/bin/env bash
set -euo pipefail

NAMESPACE=${1:-voidcloud}

echo "Namespace: $NAMESPACE"

echo "Pods (wide):"
kubectl get pods -n "$NAMESPACE" -o wide

echo "Describe pod for each failed pod:"
for p in $(kubectl get pod -n "$NAMESPACE" --no-headers | awk '$3 != "Running" {print $1}'); do
  echo "--- Describe $p ---"
  kubectl describe pod "$p" -n "$NAMESPACE" || true
  echo "--- Logs $p ---"
  kubectl logs "$p" -n "$NAMESPACE" --all-containers --tail=200 || true
done

echo "Service endpoints:" 
kubectl get svc -n "$NAMESPACE"

echo "Ingress (if present):" 
kubectl get ingress -n "$NAMESPACE" || true

echo "Events:" 
kubectl get events -n "$NAMESPACE" --sort-by='.metadata.creationTimestamp' | tail -n 50 || true

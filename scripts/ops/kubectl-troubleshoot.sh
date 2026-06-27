#!/usr/bin/env bash
set -euo pipefail

function show_help() {
  cat <<'EOF'
Usage: ./scripts/ops/kubectl-troubleshoot.sh [namespace] [-h|--help]

Options:
  namespace    Kubernetes namespace to inspect (default: voidcloud).
  -h, --help   Show this help message.
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    -h|--help)
      show_help
      exit 0
      ;;
    *)
      if [[ -z "${NAMESPACE:-}" ]]; then
        NAMESPACE=$1
        shift
      else
        echo "Unknown option: $1" >&2
        show_help
        exit 1
      fi
      ;;
  esac
done

NAMESPACE=${NAMESPACE:-voidcloud}

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

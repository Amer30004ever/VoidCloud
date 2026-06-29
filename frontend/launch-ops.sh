#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
OPS_DIR="$ROOT_DIR/mind/scripts/ops"
CMD="${1:-run-all}"

case "$CMD" in
  check-endpoints)
    exec "$OPS_DIR/check-endpoints.sh";
    ;;
  kubectl-troubleshoot)
    exec "$OPS_DIR/kubectl-troubleshoot.sh";
    ;;
  reset-admin)
    exec "$OPS_DIR/reset-admin-password.sh";
    ;;
  run-all)
    exec "$OPS_DIR/run-all-checks.sh";
    ;;
  *)
    echo "Usage: $0 {check-endpoints|kubectl-troubleshoot|reset-admin|run-all}" >&2
    exit 2
    ;;
esac

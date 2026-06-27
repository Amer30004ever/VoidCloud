#!/usr/bin/env bash
set -euo pipefail

echo "Running endpoint checks..."
./check-endpoints.sh || true

echo "Running kubectl troubleshoot..."
./kubectl-troubleshoot.sh || true

# Do not run reset by default
echo "Ops checks complete"

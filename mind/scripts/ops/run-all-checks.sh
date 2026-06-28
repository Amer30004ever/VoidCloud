#!/usr/bin/env bash
set -euo pipefail

function show_help() {
	cat <<'EOF'
Usage: ./mind/scripts/ops/run-all-checks.sh [-h|--help]

Options:
	-h, --help  Show this help message.
EOF
}

while [[ $# -gt 0 ]]; do
	case "$1" in
		-h|--help)
			show_help
			exit 0
			;;
		*)
			echo "Unknown option: $1" >&2
			show_help
			exit 1
			;;
	esac
done

echo "Running endpoint checks..."
./check-endpoints.sh || true

echo "Running kubectl troubleshoot..."
./kubectl-troubleshoot.sh || true

# Do not run reset by default
echo "Ops checks complete"

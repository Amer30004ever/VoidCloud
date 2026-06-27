#!/usr/bin/env bash
set -euo pipefail

function show_help() {
  cat <<'EOF'
Usage: ./scripts/ops/generate-api-endpoints.sh [-h|--help]

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

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
BACKEND_SRC="$ROOT_DIR/backend/src"
OUTPUT="$ROOT_DIR/scripts/ops/api-endpoints.txt"

# Extract controller paths and method paths from TypeScript files.
# This is a lightweight scanner and assumes simple decorator syntax.

> "$OUTPUT"

echo "Generating API endpoints list to $OUTPUT"

grep -R -E '@Controller|@Get|@Post|@Put|@Delete|@Patch' "$BACKEND_SRC" | while IFS= read -r line; do
  echo "$line"
done | \
  perl -ne '
    if (/@Controller\(([^)]*)\)/) {
      $ctrl = $1;
      $ctrl =~ s/["\'\s]//g;
      $ctrl = "/$ctrl" unless $ctrl =~ m#^/#;
      $ctrl =~ s#/$##;
      print "CTRL:$ctrl\n";
    } elsif (/@(Get|Post|Put|Delete|Patch)\(([^)]*)\)/) {
      $method = $1;
      $path = $2;
      $path =~ s/["\'\s]//g;
      $path = "/$path" unless $path =~ m#^/#;
      $path =~ s#/$##;
      print "METHOD:$method PATH:$path\n";
    }
  ' | \
  perl -ne '
    BEGIN { $ctrl = "" }
    chomp;
    if (/^CTRL:(.*)/) { $ctrl = $1; next }
    if (/^METHOD:(.*) PATH:(.*)/) {
      $method = $1;
      $path = $2;
      $path = "" if $path eq "/";
      $endpoint = "/api/v1" . $ctrl . $path;
      $endpoint =~ s#//+#/#g;
      print "$method $endpoint\n";
    }
  ' | sort -u > "$OUTPUT"

echo "Generated $(wc -l < "$OUTPUT") endpoints."

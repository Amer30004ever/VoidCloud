#!/usr/bin/env bash
# ---------------------------------------------------------------------------
# Migration drift gate.
#
# Runs READ-ONLY checks against a target database (staging by default) and
# exits non-zero on any drift:
#
#   1. `prisma migrate status`  — every migration in database/prisma/migrations
#      must be applied, with matching checksums, and nothing may be applied
#      that the repo does not know about (or be in a failed state).
#   2. `prisma migrate diff --exit-code` — the live schema must match
#      schema.prisma exactly.
#   3. expected-tables manifest — every table the manifest lists must exist
#      (catches a restore/DR gap that step 2 alone can miss on partial DBs).
#   4. migration checksums — `prisma migrate status` does NOT verify the
#      recorded checksums, so an edited-after-apply migration passes step 1
#      silently. Compare each _prisma_migrations.checksum against the sha256
#      of the migration.sql actually in the repo.
#
# Neither prisma command writes to the database: `migrate status` only reads
# _prisma_migrations, and `migrate diff` is a pure comparison that prints SQL.
#
# Usage:
#   DATABASE_URL=postgresql://user:pass@host:5432/db scripts/check-migration-drift.sh
#   scripts/check-migration-drift.sh --url "$STAGING_DATABASE_URL"
#
# Env:
#   DATABASE_URL / STAGING_DATABASE_URL  target database (required)
#   PRISMA_VERSION                        default 6.19.3
#   SKIP_TABLE_MANIFEST=1                 skip check 3 (needs psql)
#
# Exit codes: 0 clean · 1 drift detected · 2 misconfiguration
# ---------------------------------------------------------------------------
set -uo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PRISMA_VERSION="${PRISMA_VERSION:-6.19.3}"
TARGET_URL="${DATABASE_URL:-${STAGING_DATABASE_URL:-}}"
LABEL="${DRIFT_TARGET_LABEL:-staging}"

while [ $# -gt 0 ]; do
  case "$1" in
    --url) TARGET_URL="$2"; shift 2 ;;
    --label) LABEL="$2"; shift 2 ;;
    -h|--help) sed -n '2,30p' "${BASH_SOURCE[0]}"; exit 0 ;;
    *) echo "Unknown argument: $1" >&2; exit 2 ;;
  esac
done

if [ -z "$TARGET_URL" ]; then
  echo "ERROR: no target database. Set DATABASE_URL or STAGING_DATABASE_URL, or pass --url." >&2
  exit 2
fi

# Never print credentials.
REDACTED="$(printf '%s' "$TARGET_URL" | sed -E 's#(//[^:]+):[^@]*@#\1:***@#')"
echo "== Migration drift gate — target: ${LABEL} (${REDACTED})"

cd "$REPO_ROOT/database" || exit 2
FAILED=0

# --- 1. migrate status ------------------------------------------------------
echo ""
echo "-- [1/4] prisma migrate status"
STATUS_OUT="$(DATABASE_URL="$TARGET_URL" npx --yes "prisma@${PRISMA_VERSION}" migrate status 2>&1)"
STATUS_RC=$?
echo "$STATUS_OUT"

if [ $STATUS_RC -ne 0 ]; then
  echo "::error::migrate status reported a problem (exit ${STATUS_RC}) — unapplied, failed, or unknown migrations."
  FAILED=1
elif echo "$STATUS_OUT" | grep -qiE "not yet been applied|failed migration|drift|modified after|not found in the migrations directory"; then
  echo "::error::migrate status output indicates drift."
  FAILED=1
else
  echo "OK: migration history matches the repository."
fi

# --- 2. migrate diff --------------------------------------------------------
echo ""
echo "-- [2/4] prisma migrate diff (live schema vs schema.prisma)"
DIFF_OUT="$(DATABASE_URL="$TARGET_URL" npx --yes "prisma@${PRISMA_VERSION}" migrate diff \
  --from-url "$TARGET_URL" \
  --to-schema-datamodel prisma/schema.prisma \
  --exit-code --script 2>&1)"
DIFF_RC=$?

if [ $DIFF_RC -eq 0 ]; then
  echo "OK: no schema drift."
elif [ $DIFF_RC -eq 2 ]; then
  echo "::error::Schema drift detected between ${LABEL} and schema.prisma:"
  echo "$DIFF_OUT"
  FAILED=1
else
  echo "::error::migrate diff failed to run (exit ${DIFF_RC}):"
  echo "$DIFF_OUT"
  FAILED=1
fi

# --- 3. expected-tables manifest -------------------------------------------
echo ""
echo "-- [3/4] expected-tables manifest completeness"
MANIFEST="$REPO_ROOT/database/scripts/expected-tables.txt"
if [ "${SKIP_TABLE_MANIFEST:-0}" = "1" ]; then
  echo "SKIPPED (SKIP_TABLE_MANIFEST=1)."
elif ! command -v psql >/dev/null 2>&1; then
  echo "SKIPPED: psql not installed."
elif [ ! -f "$MANIFEST" ]; then
  echo "::error::manifest missing: $MANIFEST"
  FAILED=1
else
  ACTUAL="$(mktemp)"
  if psql "$TARGET_URL" -Atc \
      "SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY 1" > "$ACTUAL" 2>/dev/null; then
    MISSING="$(comm -13 <(sort "$ACTUAL") <(grep -v '^\s*$' "$MANIFEST" | sort))"
    if [ -n "$MISSING" ]; then
      echo "::error::tables in schema.prisma but absent from ${LABEL}:"
      echo "$MISSING"
      FAILED=1
    else
      echo "OK: all $(grep -c . "$MANIFEST") expected tables present."
    fi
  else
    echo "::error::could not query ${LABEL} with psql."
    FAILED=1
  fi
  rm -f "$ACTUAL"
fi

# --- 4. migration checksum verification ------------------------------------
# `migrate status` reports "up to date" even when a migration file was edited
# after being applied (verified: tampering with a checksum row leaves step 1
# green). Prisma stores a plain sha256 hex of migration.sql, so re-derive it.
echo ""
echo "-- [4/4] migration checksum verification"
if [ "${SKIP_TABLE_MANIFEST:-0}" = "1" ]; then
  echo "SKIPPED (SKIP_TABLE_MANIFEST=1)."
elif ! command -v psql >/dev/null 2>&1; then
  echo "SKIPPED: psql not installed."
elif ! command -v sha256sum >/dev/null 2>&1; then
  echo "SKIPPED: sha256sum not available."
else
  RECORDED="$(mktemp)"
  if psql "$TARGET_URL" -Atc \
      "SELECT migration_name || ' ' || checksum FROM _prisma_migrations WHERE finished_at IS NOT NULL ORDER BY 1" \
      > "$RECORDED" 2>/dev/null; then
    MISMATCHES=0
    while read -r NAME SUM; do
      [ -z "${NAME:-}" ] && continue
      FILE="$REPO_ROOT/database/prisma/migrations/$NAME/migration.sql"
      if [ ! -f "$FILE" ]; then
        echo "::error::migration applied on ${LABEL} but missing from the repo: $NAME"
        MISMATCHES=$((MISMATCHES + 1))
        continue
      fi
      ACTUAL_SUM="$(sha256sum "$FILE" | cut -d' ' -f1)"
      if [ "$ACTUAL_SUM" != "$SUM" ]; then
        echo "::error::checksum mismatch for $NAME (migration.sql was edited after it was applied)"
        echo "         recorded on ${LABEL}: $SUM"
        echo "         sha256 of repo file: $ACTUAL_SUM"
        MISMATCHES=$((MISMATCHES + 1))
      fi
    done < "$RECORDED"
    if [ "$MISMATCHES" -ne 0 ]; then
      FAILED=1
    else
      echo "OK: all $(grep -c . "$RECORDED") applied migrations match their repo checksums."
    fi
  else
    echo "::error::could not read _prisma_migrations from ${LABEL}."
    FAILED=1
  fi
  rm -f "$RECORDED"
fi

echo ""
if [ "$FAILED" -ne 0 ]; then
  echo "RESULT: DRIFT DETECTED against ${LABEL}."
  exit 1
fi
echo "RESULT: ${LABEL} is in sync with the migration history and schema.prisma."
exit 0

#!/usr/bin/env bash
set -euo pipefail

DB_HOST="${DB_HOST:-postgres}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-void_portal}"
DB_USER="${DB_USER:-postgres}"
DB_PASS="${DB_PASS:-postgres}"
BACKUP_DIR="${BACKUP_DIR:-/var/backups/voidcloud}"
SCRATCH_DB="${SCRATCH_DB:-voidcloud_restore_test}"

export PGPASSWORD="${DB_PASS}"

LATEST="$(find "${BACKUP_DIR}" -name 'voidcloud_backup_*.sql.gz' -type f -printf '%T@ %p\n' | sort -rn | head -1 | cut -d' ' -f2-)"

if [ -z "${LATEST}" ]; then
  echo "ERROR: No backup files found in ${BACKUP_DIR}" >&2
  exit 1
fi

echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] Using backup: ${LATEST}"

echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] Creating scratch database ${SCRATCH_DB}..."
dropdb -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" --if-exists "${SCRATCH_DB}" 2>/dev/null || true
createdb -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" "${SCRATCH_DB}"

echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] Restoring backup into ${SCRATCH_DB}..."
gunzip -c "${LATEST}" | psql -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" -d "${SCRATCH_DB}"

echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] Verifying restore..."
TABLE_COUNT="$(psql -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" -d "${SCRATCH_DB}" -t -A -c "SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public';")"
ROW_COUNT="$(psql -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" -d "${SCRATCH_DB}" -t -A -c "SELECT sum(n_live_tup) FROM pg_stat_user_tables;")"

echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] Restore verification:"
echo "  Tables: ${TABLE_COUNT}"
echo "  Rows: ${ROW_COUNT}"

if [ "${TABLE_COUNT}" -eq 0 ]; then
  echo "ERROR: Restore verification failed — no tables found in scratch database." >&2
  exit 1
fi

# --- Schema completeness gate -------------------------------------------------
# Counting tables cannot catch a backup taken from an already-broken schema.
# Compare the restored table set against the expected manifest derived from
# schema.prisma and fail loudly on ANY missing table.
EXPECTED_TABLES_FILE="${EXPECTED_TABLES_FILE:-$(dirname "$0")/expected-tables.txt}"

if [ ! -f "${EXPECTED_TABLES_FILE}" ]; then
  echo "ERROR: Expected-tables manifest not found at ${EXPECTED_TABLES_FILE}." >&2
  echo "       Run: node database/scripts/generate-expected-tables.mjs" >&2
  exit 1
fi

ACTUAL_TABLES_FILE="$(mktemp)"
trap 'rm -f "${ACTUAL_TABLES_FILE}" "${EXPECTED_SORTED:-}" "${MISSING_FILE:-}"' EXIT

psql -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" -d "${SCRATCH_DB}" -t -A -c \
  "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE';" \
  | sed '/^$/d' | LC_ALL=C sort > "${ACTUAL_TABLES_FILE}"

EXPECTED_SORTED="$(mktemp)"
grep -v '^[[:space:]]*$' "${EXPECTED_TABLES_FILE}" | grep -v '^#' | LC_ALL=C sort > "${EXPECTED_SORTED}"

MISSING_FILE="$(mktemp)"
LC_ALL=C comm -23 "${EXPECTED_SORTED}" "${ACTUAL_TABLES_FILE}" > "${MISSING_FILE}"
MISSING_COUNT="$(wc -l < "${MISSING_FILE}" | tr -d ' ')"
EXTRA_COUNT="$(LC_ALL=C comm -13 "${EXPECTED_SORTED}" "${ACTUAL_TABLES_FILE}" | grep -vc '^_prisma_migrations$' || true)"

echo "  Expected tables: $(wc -l < "${EXPECTED_SORTED}" | tr -d ' ')"
echo "  Missing tables: ${MISSING_COUNT}"
echo "  Unexpected tables: ${EXTRA_COUNT}"

if [ "${MISSING_COUNT}" -ne 0 ]; then
  echo "ERROR: Schema completeness check failed — ${MISSING_COUNT} expected table(s) missing from the restored database:" >&2
  sed 's/^/  - /' "${MISSING_FILE}" >&2
  exit 1
fi

echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] Schema completeness verified — all expected tables present."

echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] Restore drill completed successfully."


echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] Dropping scratch database ${SCRATCH_DB}..."
dropdb -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" "${SCRATCH_DB}"

echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] Restore drill finished."
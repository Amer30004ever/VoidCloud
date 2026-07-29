#!/usr/bin/env bash
set -euo pipefail

DB_HOST="${DB_HOST:-postgres}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-void_portal}"
DB_USER="${DB_USER:-postgres}"
DB_PASS="${DB_PASS:-postgres}"
BACKUP_DIR="${BACKUP_DIR:-/var/backups/voidcloud}"
RETENTION_DAYS="${RETENTION_DAYS:-7}"
TIMESTAMP="$(date -u +%Y%m%d%H%M%S)"
FILENAME="voidcloud_backup_${TIMESTAMP}.sql.gz"

mkdir -p "${BACKUP_DIR}"

export PGPASSWORD="${DB_PASS}"

echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] Starting backup of ${DB_NAME}..."

pg_dump -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" -d "${DB_NAME}" \
  --no-owner --no-privileges --clean --if-exists \
  | gzip > "${BACKUP_DIR}/${FILENAME}"

BACKUP_SIZE="$(du -h "${BACKUP_DIR}/${FILENAME}" | cut -f1)"
echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] Backup complete: ${FILENAME} (${BACKUP_SIZE})"

echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] Pruning backups older than ${RETENTION_DAYS} days..."
find "${BACKUP_DIR}" -name 'voidcloud_backup_*.sql.gz' -mtime +"${RETENTION_DAYS}" -delete

echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] Backup job finished."
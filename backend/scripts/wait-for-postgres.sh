#!/bin/sh
set -e

if [ -z "${POSTGRES_HOST}" ] && [ -n "${DATABASE_URL}" ]; then
  POSTGRES_HOST=$(printf '%s' "${DATABASE_URL}" | sed -n 's|.*@\([^:/]*\).*|\1|p')
fi
POSTGRES_HOST="${POSTGRES_HOST:-postgres}"

if [ -z "${DATABASE_URL}" ]; then
  echo "ERROR: DATABASE_URL is not set"
  exit 1
fi

: "${POSTGRES_USER:=postgres}"
: "${POSTGRES_DB:=voidcloud}"

if [ -z "${POSTGRES_PASSWORD}" ]; then
  echo "ERROR: POSTGRES_PASSWORD is not set"
  exit 1
fi

echo "Waiting for Postgres at ${POSTGRES_HOST}..."
attempt=1
delay=2
until PGPASSWORD="${POSTGRES_PASSWORD}" psql -h "${POSTGRES_HOST}" -U "${POSTGRES_USER}" -d "${POSTGRES_DB}" -c 'SELECT 1' >/dev/null 2>&1; do
  if [ "$attempt" -ge 30 ]; then
    echo "ERROR: Postgres authentication/connectivity failed after ${attempt} attempts"
    echo "Check that voidcloud-secrets.POSTGRES_PASSWORD matches the password stored in the Postgres data directory."
    exit 1
  fi
  echo "Postgres not ready/authenticated yet; retrying in ${delay}s (attempt ${attempt}/30)..."
  sleep "$delay"
  attempt=$((attempt + 1))
  if [ "$delay" -lt 30 ]; then
    delay=$((delay * 2))
    if [ "$delay" -gt 30 ]; then delay=30; fi
  fi
done
echo "Postgres is ready"

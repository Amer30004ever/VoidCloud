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

echo "Waiting for Postgres at ${POSTGRES_HOST}..."
until PGPASSWORD="${POSTGRES_PASSWORD}" psql -h "${POSTGRES_HOST}" -U "${POSTGRES_USER}" -d "${POSTGRES_DB}" -c '\q' 2>/dev/null; do
  sleep 2
done
echo "Postgres is ready"

echo "Applying Prisma migrations..."
npx prisma migrate deploy

echo "Seeding database..."
npx ts-node --transpile-only prisma/seed.ts

echo "Starting API..."
exec node /app/dist/main.js

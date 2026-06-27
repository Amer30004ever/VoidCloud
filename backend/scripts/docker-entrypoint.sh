#!/bin/sh
set -e

sh /app/scripts/run-migrate.sh

echo "Seeding database..."
npx ts-node --transpile-only prisma/seed.ts

echo "Starting API..."
exec node /app/dist/main.js

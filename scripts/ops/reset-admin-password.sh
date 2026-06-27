#!/usr/bin/env bash
set -euo pipefail

ADMIN_EMAIL=${ADMIN_EMAIL:-}
ADMIN_PASSWORD=${ADMIN_PASSWORD:-}

function show_help() {
  cat <<'EOF'
Usage: ./scripts/ops/reset-admin-password.sh [options]

Options:
  -e, --email <email>        Admin email address.
  -p, --password <password>  Admin password.
  -h, --help                 Show this help message.

Run without arguments to prompt for any missing values.
Use environment variables ADMIN_EMAIL and ADMIN_PASSWORD to avoid placing secrets on the command line.
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    -e|--email)
      ADMIN_EMAIL=$2
      shift 2
      ;;
    -p|--password)
      ADMIN_PASSWORD=$2
      shift 2
      ;;
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

if [ -z "${ADMIN_EMAIL:-}" ]; then
  read -rp "Admin email [amer30004ever@hotmail.com]: " ADMIN_EMAIL
  ADMIN_EMAIL=${ADMIN_EMAIL:-amer30004ever@hotmail.com}
fi

if [ -z "${ADMIN_PASSWORD:-}" ]; then
  read -rsp "Admin password: " ADMIN_PASSWORD
  echo
  if [ -z "${ADMIN_PASSWORD}" ]; then
    echo "Admin password is required." >&2
    exit 1
  fi
fi

# If running inside cluster, prefer kubectl exec into backend deployment
if command -v kubectl >/dev/null && kubectl get deploy -n voidcloud backend >/dev/null 2>&1; then
  echo "Running reset inside cluster (voidcloud namespace)"
  kubectl -n voidcloud exec --stdin deploy/backend -- /bin/sh -c "cd /app && export NODE_OPTIONS='--max-old-space-size=512' && ADMIN_EMAIL='$ADMIN_EMAIL' ADMIN_PASSWORD='$ADMIN_PASSWORD' node - <<'EOF'
const bcrypt = require('bcryptjs');
const { Pool } = require('pg');

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL environment variable is not set');
}

const pool = new Pool({ connectionString });

(async () => {
  try {
    const email = process.env.ADMIN_EMAIL || 'amer30004ever@hotmail.com';
    const newPassword = process.env.ADMIN_PASSWORD || 'AmerAdmin2026!';
    const passwordHash = await bcrypt.hash(newPassword, 12);

    const result = await pool.query(
      'UPDATE "User" SET password = $1, "mustChangePassword" = false WHERE email = $2 RETURNING email',
      [passwordHash, email],
    );

    if (result.rowCount === 0) {
      throw new Error(`User with email ${email} was not found`);
    }

    console.log(`✅ Admin password reset for ${email}`);
    console.log(`📝 New password: ${newPassword}`);
  } catch (e) {
    console.error('❌ Reset failed:', e);
    process.exit(1);
  } finally {
    await pool.end();
  }
})();
EOF"
  exit 0
fi

# Otherwise, run locally (requires DATABASE_URL in env)
if [ -z "${DATABASE_URL:-}" ]; then
  echo "DATABASE_URL is required to run locally." >&2
  exit 1
fi

echo "Running reset locally"
ADMIN_EMAIL="$ADMIN_EMAIL" ADMIN_PASSWORD="$ADMIN_PASSWORD" npx ts-node scripts/reset-admin-password.ts

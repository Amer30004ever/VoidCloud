/* eslint-disable no-console */
/**
 * Reset the AmerCloud admin password.
 *
 * Usage (inside the backend container):
 *   ADMIN_EMAIL=amer30004ever@hotmail.com \
 *   ADMIN_PASSWORD='YourNewPassword123!' \
 *   npx ts-node scripts/reset-admin-password.ts
 *
 * Defaults: ADMIN_EMAIL=amer30004ever@hotmail.com, ADMIN_PASSWORD=AmerAdmin2026!
 */
import { Pool } from 'pg';
import * as bcrypt from 'bcryptjs';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL environment variable is not set');
}

const pool = new Pool({ connectionString });

async function main() {
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
}

main()
  .catch((e) => {
    console.error('❌ Reset failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await pool.end();
  });

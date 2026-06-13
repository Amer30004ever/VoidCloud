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
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const email = process.env.ADMIN_EMAIL || 'amer30004ever@hotmail.com';
  const newPassword = process.env.ADMIN_PASSWORD || 'AmerAdmin2026!';
  const passwordHash = await bcrypt.hash(newPassword, 12);

  const user = await prisma.user.update({
    where: { email },
    data: { password: passwordHash, mustChangePassword: false },
  });

  console.log(`✅ Admin password reset for ${user.email}`);
  console.log(`📝 New password: ${newPassword}`);
}

main()
  .catch((e) => { console.error('❌ Reset failed:', e); process.exit(1); })
  .finally(() => prisma.$disconnect());

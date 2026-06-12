import { PrismaClient, Role } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import { Pool } from 'pg';

const ADMIN_EMAIL = (process.env.ADMIN_EMAIL ?? 'amer30004ever@hotmail.com').toLowerCase();
const ADMIN_NAME = process.env.ADMIN_NAME ?? 'Amer Admin';

function generateSecurePassword(): string {
  // 24 chars, URL-safe, ~144 bits of entropy
  return crypto.randomBytes(18).toString('base64url');
}

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL is required for seeding');
  }

  const pool = new Pool({ connectionString });
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

  try {
    const existing = await prisma.user.findUnique({ where: { email: ADMIN_EMAIL } });

    // Use env override if provided; otherwise keep existing password on re-runs,
    // or generate a fresh secure one on first deploy.
    let plainPassword: string | null = null;
    let passwordHash: string | undefined;

    if (process.env.ADMIN_PASSWORD) {
      plainPassword = process.env.ADMIN_PASSWORD;
      passwordHash = await bcrypt.hash(plainPassword, 10);
    } else if (!existing) {
      plainPassword = generateSecurePassword();
      passwordHash = await bcrypt.hash(plainPassword, 10);
    }

    await prisma.user.upsert({
      where: { email: ADMIN_EMAIL },
      update: {
        ...(passwordHash ? { password: passwordHash } : {}),
        name: ADMIN_NAME,
        role: Role.ADMIN,
        isActive: true,
        mustChangePassword: false,
      },
      create: {
        email: ADMIN_EMAIL,
        name: ADMIN_NAME,
        password: passwordHash!,
        role: Role.ADMIN,
        isActive: true,
        mustChangePassword: false,
      },
    });

    if (plainPassword && !process.env.ADMIN_PASSWORD) {
      console.log('==============================================================');
      console.log('  ADMIN USER PROVISIONED (first deploy)');
      console.log(`  Email:    ${ADMIN_EMAIL}`);
      console.log(`  Password: ${plainPassword}`);
      console.log('  ^^ STORE THIS NOW. It will not be shown again.');
      console.log('==============================================================');
    } else {
      console.log(`Seeded admin user: ${ADMIN_EMAIL} (role=ADMIN, active=true)`);
    }
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main().catch((error) => {
  console.error('Seed failed:', error);
  process.exit(1);
});

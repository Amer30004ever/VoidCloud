import { PrismaClient, Role } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import * as bcrypt from 'bcryptjs';
import { Pool } from 'pg';

const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? 'admin@amer.dev';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? 'AmerDevOps2026!';
const ADMIN_NAME = process.env.ADMIN_NAME ?? 'Amer Admin';

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL is required for seeding');
  }

  const pool = new Pool({ connectionString });
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

  try {
    const password = await bcrypt.hash(ADMIN_PASSWORD, 10);

    await prisma.user.upsert({
      where: { email: ADMIN_EMAIL },
      update: {
        password,
        name: ADMIN_NAME,
        role: Role.ADMIN,
        isActive: true,
        mustChangePassword: false,
      },
      create: {
        email: ADMIN_EMAIL,
        name: ADMIN_NAME,
        password,
        role: Role.ADMIN,
        isActive: true,
        mustChangePassword: false,
      },
    });

    console.log(`Seeded admin user: ${ADMIN_EMAIL}`);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main().catch((error) => {
  console.error('Seed failed:', error);
  process.exit(1);
});

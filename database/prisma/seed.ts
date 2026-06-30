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

    if (existing) {
      await prisma.user.update({
        where: { email: ADMIN_EMAIL },
        data: {
          ...(passwordHash ? { password: passwordHash } : {}),
          name: ADMIN_NAME,
          role: Role.SUPER_ADMIN,
          isActive: true,
          mustChangePassword: false,
        },
      });
    } else {
      if (!passwordHash) {
        // Safety net — shouldn't happen because we generate above when !existing
        plainPassword = generateSecurePassword();
        passwordHash = await bcrypt.hash(plainPassword, 10);
      }
      await prisma.user.create({
        data: {
          email: ADMIN_EMAIL,
          name: ADMIN_NAME,
          password: passwordHash,
          role: Role.SUPER_ADMIN,
          isActive: true,
          mustChangePassword: false,
        },
      });
    }

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

    const plans = [
      { name: 'Free Trial', slug: 'free', priceUSD: 0, priceEGP: 0, cpuLimit: 0.25, memoryLimit: 512, storageLimit: 10240, vpsLimit: 1, customDomainLimit: 0, sortOrder: 0, features: { whatsapp: true, crm: true } },
      { name: 'Starter', slug: 'starter', priceUSD: 9, priceEGP: 270, cpuLimit: 0.5, memoryLimit: 1024, storageLimit: 20480, vpsLimit: 1, customDomainLimit: 1, sortOrder: 1, features: { whatsapp: true, crm: true } },
      { name: 'Pro', slug: 'pro', priceUSD: 29, priceEGP: 870, cpuLimit: 2, memoryLimit: 4096, storageLimit: 51200, vpsLimit: 2, customDomainLimit: 3, sortOrder: 2, features: { whatsapp: true, crm: true, analytics: true } },
      { name: 'Business', slug: 'business', priceUSD: 79, priceEGP: 2370, cpuLimit: 4, memoryLimit: 8192, storageLimit: 102400, vpsLimit: 5, customDomainLimit: 10, sortOrder: 3, features: { whatsapp: true, crm: true, analytics: true, priority: true } },
      { name: 'Enterprise', slug: 'enterprise', priceUSD: 0, priceEGP: 0, cpuLimit: 16, memoryLimit: 32768, storageLimit: 512000, vpsLimit: 9999, customDomainLimit: 9999, sortOrder: 4, features: { whatsapp: true, crm: true, analytics: true, sla: true } },
    ];

    for (const plan of plans) {
      await prisma.cloudPlan.upsert({
        where: { slug: plan.slug },
        update: { isActive: true },
        create: plan,
      });
    }

    const rbacRoles = [
      { name: 'SUPER_ADMIN', description: 'Full system access' },
      { name: 'ADMIN', description: 'Tenant-level management' },
      { name: 'AGENT', description: 'Conversation management' },
      { name: 'USER', description: 'VPS management' },
    ];
    for (const role of rbacRoles) {
      await prisma.rbacRole.upsert({
        where: { name: role.name },
        update: {},
        create: role,
      });
    }

    console.log('Seeded cloud plans and RBAC roles');
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main().catch((error) => {
  console.error('Seed failed:', error);
  process.exit(1);
});

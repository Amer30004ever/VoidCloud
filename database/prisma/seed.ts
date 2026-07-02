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

// ─── Test / Demo users ──────────────────────────────────────────────────
// These are seeded for development/demo purposes with known passwords.
// In production, rotate or remove these accounts.
const DEMO_USERS = [
  {
    email: 'admin@voidcloud.com',
    name: 'Super Admin',
    password: 'VoidCloud2026!',
    role: Role.SUPER_ADMIN,
  },
  {
    email: 'business@voidcloud.com',
    name: 'Business Admin',
    password: 'Admin2026!',
    role: Role.ADMIN,
  },
  {
    email: 'agent@voidcloud.com',
    name: 'Support Agent',
    password: 'Agent2026!',
    role: Role.AGENT,
  },
  {
    email: 'user@voidcloud.com',
    name: 'Regular User',
    password: 'User2026!',
    role: Role.USER,
  },
];

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL is required for seeding');
  }

  const pool = new Pool({ connectionString });
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

  try {
    // ─── Primary admin (env-configurable) ───────────────────────────────
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
      console.log(`Seeded admin user: ${ADMIN_EMAIL} (role=SUPER_ADMIN, active=true)`);
    }

    // ─── Demo / test users ───────────────────────────────────────────────
    // Demo users are created ONLY when ALL of the following are true:
    //   1. NODE_ENV === 'development'  (never staging, test, preprod, or production)
    //   2. ENABLE_DEMO_USERS === 'true'  (explicit opt-in; off by default)
    //
    // This double-gate prevents known static credentials from existing in any
    // non-development environment, even if NODE_ENV is not set to 'production'.
    const isDev = process.env.NODE_ENV === 'development';
    const demoEnabled = process.env.ENABLE_DEMO_USERS === 'true';

    if (isDev && demoEnabled) {
      for (const demo of DEMO_USERS) {
        const hash = await bcrypt.hash(demo.password, 10);
        await prisma.user.upsert({
          where: { email: demo.email },
          // Always sync name, role, AND password so quick-fill creds remain valid
          // across re-runs without manual intervention.
          update: {
            name: demo.name,
            role: demo.role,
            password: hash,
            isActive: true,
            mustChangePassword: false,
          },
          create: {
            email: demo.email,
            name: demo.name,
            password: hash,
            role: demo.role,
            isActive: true,
            mustChangePassword: false,
          },
        });
        console.log(`Seeded demo user: ${demo.email} (role=${demo.role})`);
      }
    } else if (!isDev) {
      console.log(`Demo users skipped: NODE_ENV=${process.env.NODE_ENV ?? 'unset'} (must be 'development').`);
    } else {
      console.log('Demo users skipped: set ENABLE_DEMO_USERS=true to enable in development.');
    }

    // ─── Cloud plans ────────────────────────────────────────────────────
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

    // ─── RBAC roles ──────────────────────────────────────────────────────
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

    // Only log demo credentials in non-production environments.
    // In production, rotate or remove demo accounts — never log passwords.
    if (process.env.NODE_ENV !== 'production') {
      console.log('');
      console.log('═══════════════════════════════════════════════════');
      console.log('  DEMO ACCOUNT CREDENTIALS (dev/staging only)');
      console.log('───────────────────────────────────────────────────');
      for (const d of DEMO_USERS) {
        console.log(`  ${d.role.padEnd(12)} ${d.email}  /  ${d.password}`);
      }
      console.log('═══════════════════════════════════════════════════');
      console.log('  ⚠  Do NOT run this seed in production with known passwords.');
    } else {
      console.log('Demo users upserted (production: credentials not logged).');
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

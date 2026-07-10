import { PrismaClient, Role } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import * as bcrypt from 'bcryptjs';
import { Pool } from 'pg';

/**
 * Void Cloud seed script.
 *
 * Idempotent + safe by design:
 *   - Requires SEED_ENABLED=true (fails loudly otherwise). Never runs automatically
 *     on every deploy. Only run this via the one-shot `voidcloud-db-seed` Job or
 *     manually with `SEED_ENABLED=true SEED_ADMIN_PASSWORD=... pnpm --filter db seed`.
 *   - Requires SEED_ADMIN_EMAIL + SEED_ADMIN_PASSWORD. No hardcoded fallback.
 *     Fails loudly at startup if missing.
 *   - If the admin already exists, the script SKIPS the admin entirely — never
 *     resets the password, role, activation state, 2FA, or any other field.
 *   - No demo/test users are ever created here — those belonged in the old
 *     seed script and were a security hazard (static known credentials).
 *
 * Non-admin bootstrap data (cloud plans + RBAC role definitions) is always upserted
 * because those rows are reference data, not credentials.
 */

async function main() {
  const enabled = process.env.SEED_ENABLED === 'true';
  if (!enabled) {
    console.error(
      '[seed] Refusing to run: SEED_ENABLED is not "true". ' +
        'Seeding is opt-in and only intended for the one-time bootstrap job.',
    );
    process.exit(1);
  }

  const adminEmailRaw = process.env.SEED_ADMIN_EMAIL;
  const adminPassword = process.env.SEED_ADMIN_PASSWORD;
  const adminName = process.env.SEED_ADMIN_NAME ?? 'Platform Admin';

  if (!adminEmailRaw || !adminPassword) {
    console.error(
      '[seed] Refusing to run: SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD are required. ' +
        'No hardcoded fallback exists. Set them in the environment / secret store and re-run.',
    );
    process.exit(1);
  }
  if (adminPassword.length < 12) {
    console.error('[seed] SEED_ADMIN_PASSWORD must be at least 12 characters.');
    process.exit(1);
  }

  const adminEmail = adminEmailRaw.trim().toLowerCase();

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error('[seed] DATABASE_URL is required for seeding');
    process.exit(1);
  }

  const pool = new Pool({ connectionString });
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

  try {
    // ─── Admin: skip entirely if one already exists ────────────────────
    const existing = await prisma.user.findUnique({
      where: { email: adminEmail },
    });

    if (existing) {
      console.log(
        `[seed] Admin ${adminEmail} already exists (id=${existing.id}). ` +
          'Skipping — password, role, activation, and 2FA are left untouched.',
      );
    } else {
      const passwordHash = await bcrypt.hash(adminPassword, 12);
      const created = await prisma.user.create({
        data: {
          email: adminEmail,
          name: adminName,
          password: passwordHash,
          role: Role.SUPER_ADMIN,
          isActive: true,
          mustChangePassword: true, // force rotation on first login
        },
      });
      console.log(
        `[seed] Provisioned SUPER_ADMIN ${created.email} (id=${created.id}). ` +
          'mustChangePassword=true — user must rotate on first login.',
      );
    }

    // ─── Cloud plans (reference data, safe to upsert) ───────────────────
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

    // ─── RBAC role definitions (reference data) ─────────────────────────
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

    console.log('[seed] Cloud plans and RBAC role definitions synced.');
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main().catch((err) => {
  console.error('[seed] Failed:', err);
  process.exit(1);
});

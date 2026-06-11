import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const PLANS = [
  {
    name: 'Free Trial', slug: 'free', priceUSD: 0, priceEGP: 0, trialDays: 7,
    cpuLimit: 0.25, memoryLimit: 512, storageLimit: 1024, deploymentLimit: 1,
    customDomainLimit: 0, apiRequestLimit: 10000, teamMemberLimit: 1, databaseSizeLimit: 0,
    description: '7-day free trial — kick the tires, no credit card needed.',
    features: ['1 deployment', 'Custom subdomain', 'SSL', 'Community support'], sortOrder: 0,
  },
  {
    name: 'Starter', slug: 'starter', priceUSD: 9, priceEGP: 270,
    cpuLimit: 0.5, memoryLimit: 1024, storageLimit: 10240, deploymentLimit: 3,
    customDomainLimit: 1, apiRequestLimit: 50000, teamMemberLimit: 1, databaseSizeLimit: 100,
    description: 'For side projects and personal apps.',
    features: ['3 deployments', '1 custom domain', 'PostgreSQL 100MB', 'Daily backups', '24h support'], sortOrder: 1,
  },
  {
    name: 'Pro', slug: 'pro', priceUSD: 29, priceEGP: 870, isPopular: true,
    cpuLimit: 2, memoryLimit: 4096, storageLimit: 51200, deploymentLimit: 10,
    customDomainLimit: 3, apiRequestLimit: 200000, teamMemberLimit: 3, databaseSizeLimit: 1024, redisLimit: 256,
    description: 'For growing teams shipping in production.',
    features: ['10 deployments', '3 custom domains', 'PostgreSQL 1GB', 'Redis 256MB', 'Staging env', '4h priority support'], sortOrder: 2,
  },
  {
    name: 'Business', slug: 'business', priceUSD: 79, priceEGP: 2370,
    cpuLimit: 4, memoryLimit: 8192, storageLimit: 102400, deploymentLimit: 25,
    customDomainLimit: 10, apiRequestLimit: 500000, teamMemberLimit: 5, databaseSizeLimit: 5120, redisLimit: 1024,
    description: 'For businesses with serious workloads.',
    features: ['25 deployments', '10 custom domains', 'PostgreSQL 5GB', 'Redis 1GB', 'Staging + Prod', '5 team members', '1h dedicated support'], sortOrder: 3,
  },
  {
    name: 'Enterprise', slug: 'enterprise', priceUSD: 0, priceEGP: 0,
    cpuLimit: 16, memoryLimit: 32768, storageLimit: 512000, deploymentLimit: 9999,
    customDomainLimit: 9999, apiRequestLimit: 99999999, teamMemberLimit: 9999, databaseSizeLimit: 51200, redisLimit: 8192,
    description: 'Custom resources, dedicated infra, custom SLA. Talk to sales.',
    features: ['Unlimited everything', 'Dedicated namespace / vCluster', 'Custom SLA', 'SOC2 reporting', '24/7 dedicated support'], sortOrder: 4,
  },
];

export async function seedCloud() {
  for (const p of PLANS) {
    await prisma.cloudPlan.upsert({
      where: { slug: p.slug },
      update: {},
      create: { ...p, features: p.features as any },
    });
  }
  console.log(`[cloud-seed] ensured ${PLANS.length} plans`);
}

if (require.main === module) {
  seedCloud().finally(() => prisma.$disconnect());
}

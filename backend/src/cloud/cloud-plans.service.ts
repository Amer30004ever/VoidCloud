import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { randomBytes, createHash } from 'crypto';

export interface PlanInput {
  name: string;
  slug?: string;
  description?: string;
  priceUSD?: number;
  priceEGP?: number;
  interval?: string;
  cpuLimit?: number;
  memoryLimit?: number;
  storageLimit?: number;
  deploymentLimit?: number;
  customDomainLimit?: number;
  apiRequestLimit?: number;
  teamMemberLimit?: number;
  databaseSizeLimit?: number;
  redisLimit?: number | null;
  trialDays?: number;
  features?: unknown;
  isActive?: boolean;
  isPopular?: boolean;
  sortOrder?: number;
}

const slugify = (s: string) =>
  s.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

@Injectable()
export class CloudPlansService {
  constructor(private prisma: PrismaService) {}

  list(activeOnly = false) {
    return this.prisma.cloudPlan.findMany({
      where: activeOnly ? { isActive: true } : {},
      orderBy: [{ sortOrder: 'asc' }, { priceUSD: 'asc' }],
    });
  }

  async get(id: string) {
    const plan = await this.prisma.cloudPlan.findUnique({ where: { id } });
    if (!plan) throw new NotFoundException('Plan not found');
    return plan;
  }

  create(data: PlanInput) {
    return this.prisma.cloudPlan.create({
      data: {
        name: data.name,
        slug: data.slug ?? slugify(data.name),
        description: data.description,
        priceUSD: data.priceUSD ?? 0,
        priceEGP: data.priceEGP ?? 0,
        interval: data.interval ?? 'monthly',
        cpuLimit: data.cpuLimit ?? 0.25,
        memoryLimit: data.memoryLimit ?? 512,
        storageLimit: data.storageLimit ?? 1024,
        deploymentLimit: data.deploymentLimit ?? 1,
        customDomainLimit: data.customDomainLimit ?? 0,
        apiRequestLimit: data.apiRequestLimit ?? 10000,
        teamMemberLimit: data.teamMemberLimit ?? 1,
        databaseSizeLimit: data.databaseSizeLimit ?? 0,
        redisLimit: data.redisLimit ?? null,
        trialDays: data.trialDays ?? 0,
        features: (data.features as any) ?? [],
        isActive: data.isActive ?? true,
        isPopular: data.isPopular ?? false,
        sortOrder: data.sortOrder ?? 0,
      },
    });
  }

  async update(id: string, data: Partial<PlanInput>) {
    await this.get(id);
    return this.prisma.cloudPlan.update({
      where: { id },
      data: { ...data, features: data.features as any },
    });
  }

  async remove(id: string) {
    await this.get(id);
    return this.prisma.cloudPlan.delete({ where: { id } });
  }
}

export function randomNamespace(userId: string) {
  return `amercloud-user-${userId.slice(0, 8)}-${randomBytes(3).toString('hex')}`;
}
export function randomSubdomain(name: string) {
  return `${slugify(name).slice(0, 20)}-${randomBytes(3).toString('hex')}`;
}
export function hashApiKey(plain: string) {
  return createHash('sha256').update(plain).digest('hex');
}

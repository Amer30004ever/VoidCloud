import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
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

export interface CustomPlanInput {
  cpu: number;
  memory: number;
  storage: number;
  deploymentLimit?: number;
  customDomainLimit?: number;
}

const slugify = (s: string) =>
  s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

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

  /**
   * Calculate price for custom plan based on resource usage
   * Pricing model (per month):
   * - CPU: $2 per core
   * - Memory: $1 per GB
   * - Storage: $0.10 per GB
   * - Base fee: $5
   */
  calculateCustomPrice(input: CustomPlanInput) {
    const cpuPrice = input.cpu * 2;
    const memoryPrice = (input.memory / 1024) * 1; // Convert MB to GB
    const storagePrice = (input.storage / 1024) * 0.10; // Convert MB to GB
    const baseFee = 5;
    
    const totalUSD = cpuPrice + memoryPrice + storagePrice + baseFee;
    const totalEGP = totalUSD * 50; // Approximate EGP conversion
    
    return {
      priceUSD: Math.max(5, Math.round(totalUSD * 100) / 100),
      priceEGP: Math.max(250, Math.round(totalEGP)),
      breakdown: {
        cpu: cpuPrice,
        memory: memoryPrice,
        storage: storagePrice,
        base: baseFee
      }
    };
  }

  /**
   * Create a custom plan for a user (one-time use)
   */
  async createCustomPlan(userId: string, input: CustomPlanInput) {
    const pricing = this.calculateCustomPrice(input);
    
    // Generate a unique slug for this custom plan
    const customSlug = `custom-${userId.slice(0, 8)}-${Date.now()}`;
    
    return this.prisma.cloudPlan.create({
      data: {
        name: `Custom Plan (${input.cpu} CPU, ${input.memory}MB RAM, ${input.storage}MB Storage)`,
        slug: customSlug,
        description: 'Custom configuration based on your requirements',
        priceUSD: pricing.priceUSD,
        priceEGP: pricing.priceEGP,
        interval: 'monthly',
        cpuLimit: input.cpu,
        memoryLimit: input.memory,
        storageLimit: input.storage,
        deploymentLimit: input.deploymentLimit ?? 1,
        customDomainLimit: input.customDomainLimit ?? 0,
        apiRequestLimit: 10000,
        teamMemberLimit: 1,
        databaseSizeLimit: 0,
        redisLimit: null,
        trialDays: 0,
        features: ['Custom Configuration', 'Flexible Resources'],
        isActive: true,
        isPopular: false,
        sortOrder: 999, // Always show custom plans last
      },
    });
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

import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { randomNamespace, randomSubdomain } from './cloud-plans.service';

export interface DeploymentInput {
  name: string;
  type?: 'GITHUB' | 'DOCKER_IMAGE' | 'DOCKER_COMPOSE';
  source: string;
  cpu?: number;
  memory?: number;
  storage?: number;
  replicas?: number;
  customDomains?: string[];
  envVars?: Record<string, string>;
  healthCheck?: string;
}

@Injectable()
export class CloudDeploymentsService {
  constructor(private prisma: PrismaService) {}

  list(userId: string) {
    return this.prisma.cloudDeployment.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async get(userId: string, id: string, allowAny = false) {
    const d = await this.prisma.cloudDeployment.findUnique({ where: { id } });
    if (!d || (!allowAny && d.userId !== userId)) throw new NotFoundException();
    return d;
  }

  async create(userId: string, input: DeploymentInput) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { cloudPlan: true },
    });
    if (!user) throw new NotFoundException('User not found');
    if (user.suspendedAt) throw new ForbiddenException('Account suspended');

    const limits = this.effectiveLimits(user);
    const count = await this.prisma.cloudDeployment.count({
      where: { userId, status: { not: 'DELETED' } },
    });
    if (count >= limits.deploymentLimit) {
      throw new BadRequestException(
        `Plan limit reached (${limits.deploymentLimit} deployments). Upgrade your plan.`,
      );
    }
    if ((input.cpu ?? 0.25) > limits.cpuLimit)
      throw new BadRequestException(`CPU exceeds plan limit (${limits.cpuLimit})`);
    if ((input.memory ?? 512) > limits.memoryLimit)
      throw new BadRequestException(`Memory exceeds plan limit (${limits.memoryLimit}MB)`);
    if ((input.storage ?? 1024) > limits.storageLimit)
      throw new BadRequestException(`Storage exceeds plan limit (${limits.storageLimit}MB)`);
    if ((input.customDomains?.length ?? 0) > limits.customDomainLimit)
      throw new BadRequestException(`Domain count exceeds plan limit (${limits.customDomainLimit})`);

    return this.prisma.cloudDeployment.create({
      data: {
        userId,
        name: input.name,
        type: input.type ?? 'DOCKER_IMAGE',
        source: input.source,
        namespace: randomNamespace(userId),
        subdomain: randomSubdomain(input.name),
        cpu: input.cpu ?? 0.25,
        memory: input.memory ?? 512,
        storage: input.storage ?? 1024,
        replicas: input.replicas ?? 1,
        customDomains: input.customDomains ?? [],
        envVars: (input.envVars ?? {}) as any,
        healthCheck: input.healthCheck,
        status: 'PENDING',
      },
    });
  }

  async update(userId: string, id: string, input: Partial<DeploymentInput>) {
    await this.get(userId, id);
    return this.prisma.cloudDeployment.update({
      where: { id },
      data: {
        name: input.name,
        source: input.source,
        cpu: input.cpu,
        memory: input.memory,
        storage: input.storage,
        replicas: input.replicas,
        customDomains: input.customDomains,
        envVars: input.envVars as any,
        healthCheck: input.healthCheck,
      },
    });
  }

  async remove(userId: string, id: string) {
    await this.get(userId, id);
    return this.prisma.cloudDeployment.update({
      where: { id },
      data: { status: 'DELETED' },
    });
  }

  async restart(userId: string, id: string) {
    await this.get(userId, id);
    return this.prisma.cloudDeployment.update({
      where: { id },
      data: { status: 'DEPLOYING', lastDeployedAt: new Date() },
    });
  }

  /** Stub metrics (Phase 2 wires Prometheus) */
  async metrics(userId: string, id: string) {
    const d = await this.get(userId, id);
    const seed = parseInt(d.id.slice(0, 6), 36);
    const rand = (n: number) => ((seed * (n + 7)) % 100) / 100;
    return {
      cpu: Array.from({ length: 30 }, (_, i) => ({ t: i, v: rand(i) * d.cpu })),
      memory: Array.from({ length: 30 }, (_, i) => ({ t: i, v: rand(i + 1) * d.memory })),
      requests: Array.from({ length: 30 }, (_, i) => ({ t: i, v: Math.floor(rand(i + 2) * 200) })),
    };
  }

  async usage(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { cloudPlan: true },
    });
    if (!user) throw new NotFoundException();
    const limits = this.effectiveLimits(user);
    const deployments = await this.prisma.cloudDeployment.findMany({
      where: { userId, status: { not: 'DELETED' } },
    });
    const used = deployments.reduce(
      (acc, d) => ({
        cpu: acc.cpu + d.cpu,
        memory: acc.memory + d.memory,
        storage: acc.storage + d.storage,
      }),
      { cpu: 0, memory: 0, storage: 0 },
    );
    return {
      plan: user.cloudPlan,
      limits,
      used: { ...used, deployments: deployments.length, apiRequests: Math.floor(Math.random() * limits.apiRequestLimit * 0.4) },
    };
  }

  effectiveLimits(user: any) {
    const override = (user.overrideLimits ?? {}) as Record<string, number>;
    const plan = user.cloudPlan ?? {
      cpuLimit: 0.25, memoryLimit: 512, storageLimit: 1024,
      deploymentLimit: 1, customDomainLimit: 0, apiRequestLimit: 10000, teamMemberLimit: 1,
    };
    return {
      cpuLimit: override.cpuLimit ?? plan.cpuLimit,
      memoryLimit: override.memoryLimit ?? plan.memoryLimit,
      storageLimit: override.storageLimit ?? plan.storageLimit,
      deploymentLimit: override.deploymentLimit ?? plan.deploymentLimit,
      customDomainLimit: override.customDomainLimit ?? plan.customDomainLimit,
      apiRequestLimit: override.apiRequestLimit ?? plan.apiRequestLimit,
      teamMemberLimit: override.teamMemberLimit ?? plan.teamMemberLimit,
    };
  }
}

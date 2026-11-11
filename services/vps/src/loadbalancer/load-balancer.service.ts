import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { LoadBalancerAlgorithm, LoadBalancerStatus, Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

type Actor = { id: string; role: Role | string };

export const LOAD_BALANCER_MONTHLY_USD = 5;

export interface LoadBalancerInput {
  name?: string;
  algorithm?: LoadBalancerAlgorithm;
  listenPort?: number;
  targetPort?: number;
  healthCheckPath?: string;
  backendVpsIds?: string[];
  enabled?: boolean;
}

const NAME_RE = /^[a-z0-9][a-z0-9-]{1,62}$/;

@Injectable()
export class LoadBalancerService {
  constructor(private readonly prisma: PrismaService) {}

  private scope(user: Actor) {
    return user.role === Role.SUPER_ADMIN ? {} : { userId: user.id };
  }

  private async owned(id: string, user: Actor) {
    const lb = await this.prisma.loadBalancer.findFirst({ where: { id, ...this.scope(user) }, include: { backends: true } });
    if (!lb) throw new NotFoundException('Load balancer not found');
    return lb;
  }

  /** Every backend must be a non-deleted VPS owned by the same tenant. */
  private async assertBackends(ids: string[], ownerId: string) {
    const unique = [...new Set(ids)];
    if (unique.length > 50) throw new BadRequestException('At most 50 backends');
    if (!unique.length) return unique;
    const rows = await this.prisma.cloudDeployment.findMany({
      where: { id: { in: unique }, userId: ownerId, status: { not: 'DELETED' } }, select: { id: true },
    });
    if (rows.length !== unique.length) throw new BadRequestException('One or more backend VPS not found');
    return unique;
  }

  private validatePorts(i: LoadBalancerInput) {
    for (const p of [i.listenPort, i.targetPort]) {
      if (p !== undefined && (!Number.isInteger(p) || p < 1 || p > 65535)) throw new BadRequestException('Port must be 1-65535');
    }
    if (i.algorithm && !Object.values(LoadBalancerAlgorithm).includes(i.algorithm)) throw new BadRequestException('Unknown algorithm');
    if (i.healthCheckPath !== undefined && !/^\/[\w\-./]*$/.test(i.healthCheckPath)) throw new BadRequestException('Invalid health check path');
  }

  list(user: Actor, vpsId?: string) {
    return this.prisma.loadBalancer.findMany({
      where: {
        ...this.scope(user),
        ...(vpsId ? { OR: [{ vpsId }, { backends: { some: { vpsId } } }] } : {}),
      },
      include: { backends: { include: { vps: { select: { id: true, name: true, ipv4Address: true, status: true } } } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(input: LoadBalancerInput & { vpsId?: string }, user: Actor) {
    const name = (input.name ?? '').trim().toLowerCase();
    if (!NAME_RE.test(name)) throw new BadRequestException('Name must be lowercase letters, digits, dashes');
    this.validatePorts(input);
    const backends = await this.assertBackends([...(input.backendVpsIds ?? []), ...(input.vpsId ? [input.vpsId] : [])], user.id);
    if (backends.length < 1) throw new BadRequestException('Select at least one backend VPS');
    const exists = await this.prisma.loadBalancer.findFirst({ where: { userId: user.id, name } });
    if (exists) throw new BadRequestException('A load balancer with that name already exists');
    return this.prisma.loadBalancer.create({
      data: {
        userId: user.id, name, vpsId: input.vpsId ?? null,
        algorithm: input.algorithm ?? LoadBalancerAlgorithm.ROUND_ROBIN,
        listenPort: input.listenPort ?? 80, targetPort: input.targetPort ?? 80,
        healthCheckPath: input.healthCheckPath ?? '/',
        status: LoadBalancerStatus.ACTIVE, monthlyUsd: LOAD_BALANCER_MONTHLY_USD,
        backends: { create: backends.map((vpsId) => ({ vpsId })) },
      },
      include: { backends: true },
    });
  }

  async update(id: string, input: LoadBalancerInput, user: Actor) {
    const lb = await this.owned(id, user);
    this.validatePorts(input);
    const data: Record<string, unknown> = {};
    for (const k of ['algorithm', 'listenPort', 'targetPort', 'healthCheckPath'] as const) if (input[k] !== undefined) data[k] = input[k];
    if (input.enabled !== undefined) data.status = input.enabled ? LoadBalancerStatus.ACTIVE : LoadBalancerStatus.DISABLED;
    return this.prisma.$transaction(async (tx) => {
      if (input.backendVpsIds) {
        const ids = await this.assertBackends(input.backendVpsIds, lb.userId);
        if (!ids.length) throw new BadRequestException('Select at least one backend VPS');
        await tx.loadBalancerBackend.deleteMany({ where: { loadBalancerId: id, vpsId: { notIn: ids } } });
        const have = new Set(lb.backends.map((b) => b.vpsId));
        const add = ids.filter((v) => !have.has(v));
        if (add.length) await tx.loadBalancerBackend.createMany({ data: add.map((vpsId) => ({ loadBalancerId: id, vpsId })) });
      }
      return tx.loadBalancer.update({ where: { id }, data, include: { backends: true } });
    });
  }

  async remove(id: string, user: Actor) {
    await this.owned(id, user);
    await this.prisma.loadBalancer.delete({ where: { id } });
    return { ok: true };
  }
}

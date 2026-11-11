import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { CloudDeploymentStatus, Role } from '@prisma/client';
import { randomBytes } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';

type Actor = { id: string; role: Role | string };

export interface CloneVpsInput {
  /** Defaults to "<source>-staging" (staging) or "<source>-node-N" (cluster). */
  name?: string;
  /** Copy disk contents via snapshot+restore (queued job). */
  syncData?: boolean;
  /** "staging" (default) marks the copy isStaging; "cluster" adds a peer node. */
  mode?: 'staging' | 'cluster';
}

const NAME_RE = /^[a-z0-9][a-z0-9-]{1,62}$/;

@Injectable()
export class VpsCloneService {
  private readonly logger = new Logger(VpsCloneService.name);
  constructor(private readonly prisma: PrismaService) {}

  async clone(sourceId: string, input: CloneVpsInput, user: Actor) {
    const src = await this.prisma.cloudDeployment.findUnique({ where: { id: sourceId } });
    if (!src || (user.role !== Role.SUPER_ADMIN && src.userId !== user.id)) {
      throw new NotFoundException('VPS not found');
    }
    if (src.status === CloudDeploymentStatus.DELETED) throw new BadRequestException('Cannot clone a deleted VPS');
    if (src.isStaging && input.mode !== 'cluster') throw new BadRequestException('Cannot clone a staging copy into another staging copy');

    const mode = input.mode ?? 'staging';
    let name = (input.name ?? '').trim().toLowerCase();
    if (!name) {
      if (mode === 'staging') name = `${src.name}-staging`;
      else {
        const peers = await this.prisma.cloudDeployment.count({ where: { clonedFromId: src.id, isStaging: false } });
        name = `${src.name}-node-${peers + 2}`;
      }
    }
    name = name.replace(/[^a-z0-9-]/g, '-').slice(0, 63);
    if (!NAME_RE.test(name)) throw new BadRequestException('Invalid name');

    // Quota: the copy consumes the same resources as the source.
    if (src.tenantId) {
      const quota = await this.prisma.tenantQuota.findUnique({ where: { tenantId: src.tenantId } });
      if (quota) {
        if (quota.currentVpsCount + 1 > quota.maxVpsCount) throw new BadRequestException('VPS count quota exceeded');
        if (quota.currentCpu + src.cpu > quota.maxCpu) throw new BadRequestException('CPU quota exceeded');
        if (quota.currentRamMb + src.memory > quota.maxRamMb) throw new BadRequestException('RAM quota exceeded');
      }
    }

    const suffix = randomBytes(3).toString('hex');
    const copy = await this.prisma.cloudDeployment.create({
      data: {
        userId: src.userId,
        tenantId: src.tenantId,
        organizationId: src.organizationId,
        name,
        type: src.type,
        source: src.source,
        namespace: `${src.namespace}-${mode === 'staging' ? 'stg' : 'n'}-${suffix}`.slice(0, 63),
        cpu: src.cpu,
        memory: src.memory,
        storage: src.storage,
        replicas: src.replicas,
        customDomains: [], // never carry production domains onto a copy
        envVars: src.envVars ?? undefined,
        healthCheck: src.healthCheck,
        billingMode: src.billingMode,
        apps: src.apps,
        status: CloudDeploymentStatus.PENDING,
        statusMessage: input.syncData ? 'Queued: snapshot + restore from source' : 'Queued: fresh provision with source plan',
        clonedFromId: src.id,
        isStaging: mode === 'staging',
      },
    });
    this.logger.log(`clone ${copy.id} <- ${src.id} mode=${mode} syncData=${!!input.syncData}`);
    return { vps: copy, syncData: !!input.syncData, mode };
  }

  async listClones(sourceId: string, user: Actor) {
    const src = await this.prisma.cloudDeployment.findUnique({ where: { id: sourceId } });
    if (!src || (user.role !== Role.SUPER_ADMIN && src.userId !== user.id)) throw new NotFoundException('VPS not found');
    return this.prisma.cloudDeployment.findMany({
      where: { clonedFromId: sourceId, status: { not: CloudDeploymentStatus.DELETED } },
      orderBy: { createdAt: 'desc' },
    });
  }
}

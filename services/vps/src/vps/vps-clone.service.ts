import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { CloudDeploymentStatus, Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { VpsService } from './vps.service';

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
  constructor(private readonly prisma: PrismaService, private readonly vps: VpsService) {}

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

    // Reuse the normal create path so quota, credit and cluster scheduling
    // apply exactly as for a fresh VPS, then stamp clone lineage on the row.
    const created = await this.vps.create(
      { name, cpu: src.cpu, memory: src.memory, storage: src.storage, billingMode: src.billingMode } as any,
      user as any,
    );
    const copy = await this.prisma.cloudDeployment.update({
      where: { id: (created as { id: string }).id },
      data: {
        clonedFromId: src.id,
        isStaging: mode === 'staging',
        envVars: src.envVars ?? undefined,
        healthCheck: src.healthCheck,
        customDomains: [], // never carry production domains onto a copy
        statusMessage: input.syncData ? 'Queued: snapshot + restore from source' : 'Provisioned with source plan (empty disk)',
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

import {
  Injectable,
  ForbiddenException,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ProxmoxService } from '../proxmox/proxmox.service';

@Injectable()
export class VPSMigrationService {
  private readonly logger = new Logger(VPSMigrationService.name);

  constructor(
    private prisma: PrismaService,
    private proxmox: ProxmoxService,
  ) {}

  private async assertOwner(vpsId: string, userId: string) {
    const vps = await this.prisma.cloudDeployment.findUnique({
      where: { id: vpsId },
    });
    if (!vps) throw new NotFoundException('VPS not found');
    if (vps.userId !== userId) throw new ForbiddenException();
    return vps;
  }

  async getAvailableTargets(vpsId: string, userId: string) {
    const vps = await this.assertOwner(vpsId, userId);
    const [nodes, storage] = await Promise.all([
      this.proxmox.listClusterNodes(),
      this.proxmox.listClusterStorage(),
    ]);
    return {
      current: { node: vps.proxmoxNode ?? null, storage: null },
      nodes: nodes
        .filter((n) => n.name !== vps.proxmoxNode)
        .map(({ name, currentLoad, online }) => ({
          name,
          currentLoad,
          online,
        })),
      storage: storage.map(({ name, available, total }) => ({
        name,
        available,
        total,
      })),
    };
  }

  private estimateDowntime(diskGB: number): number {
    // Rough estimate: ~1s per GB for online migration shadow copy + ~5s base.
    return Math.max(5, Math.round(diskGB * 1));
  }

  async migrateVPS(
    vpsId: string,
    userId: string,
    targetNode: string,
    targetStorage?: string,
  ) {
    const vps = await this.assertOwner(vpsId, userId);
    if (!targetNode) throw new BadRequestException('targetNode required');
    if (vps.proxmoxNode && targetNode === vps.proxmoxNode) {
      throw new BadRequestException('VPS is already on the target node');
    }

    const estimatedDowntime = this.estimateDowntime(vps.storage / 1024);

    const migration = await this.prisma.vPSMigration.create({
      data: {
        vpsId,
        userId,
        sourceNode: vps.proxmoxNode ?? 'unknown',
        targetNode,
        targetStorage,
        status: 'RUNNING',
        estimatedDowntimeSec: estimatedDowntime,
        startedAt: new Date(),
      },
    });

    // Kick off Proxmox migration (no await — track via poll)
    void this.runMigration(migration.id).catch((e) =>
      this.logger.error(`Migration ${migration.id} failed: ${e?.message}`),
    );

    return { migrationId: migration.id, estimatedDowntime, status: 'RUNNING' };
  }

  private async runMigration(migrationId: string) {
    const m = await this.prisma.vPSMigration.findUnique({
      where: { id: migrationId },
    });
    if (!m) return;
    const vps = await this.prisma.cloudDeployment.findUnique({
      where: { id: m.vpsId },
    });
    if (!vps?.proxmoxVMID || !vps.proxmoxNode) {
      // Stub mode — simulate success quickly
      await this.prisma.vPSMigration.update({
        where: { id: migrationId },
        data: { status: 'COMPLETED', progress: 100, completedAt: new Date() },
      });
      await this.prisma.cloudDeployment.update({
        where: { id: m.vpsId },
        data: { proxmoxNode: m.targetNode },
      });
      return;
    }
    try {
      const upid = await this.proxmox.startContainerMigration(
        vps.proxmoxNode,
        vps.proxmoxVMID,
        m.targetNode,
        m.targetStorage ?? undefined,
      );
      await this.prisma.vPSMigration.update({
        where: { id: migrationId },
        data: { proxmoxTaskId: upid ?? undefined },
      });
      // Caller polls /status to advance state machine.
    } catch (e) {
      await this.prisma.vPSMigration.update({
        where: { id: migrationId },
        data: {
          status: 'FAILED',
          errorMessage: (e as Error).message,
          completedAt: new Date(),
        },
      });
    }
  }

  async getMigrationStatus(migrationId: string, userId: string) {
    const m = await this.prisma.vPSMigration.findUnique({
      where: { id: migrationId },
    });
    if (!m) throw new NotFoundException('Migration not found');
    if (m.userId !== userId) throw new ForbiddenException();

    // Refresh from Proxmox if still running
    if (m.status === 'RUNNING' && m.proxmoxTaskId) {
      try {
        const task = await this.proxmox.getTaskStatus(
          m.sourceNode,
          m.proxmoxTaskId,
        );
        if (task.status === 'stopped') {
          const success = task.exitstatus === 'OK';
          const updated = await this.prisma.vPSMigration.update({
            where: { id: migrationId },
            data: {
              status: success ? 'COMPLETED' : 'FAILED',
              progress: 100,
              completedAt: new Date(),
              errorMessage: success
                ? null
                : (task.exitstatus ?? 'Migration failed'),
            },
          });
          if (success) {
            await this.prisma.cloudDeployment.update({
              where: { id: m.vpsId },
              data: { proxmoxNode: m.targetNode },
            });
          }
          return this.toStatus(updated);
        }
        if (typeof task.progress === 'number') {
          await this.prisma.vPSMigration.update({
            where: { id: migrationId },
            data: { progress: Math.round(task.progress * 100) },
          });
        }
      } catch (e) {
        this.logger.warn(`status poll failed: ${(e as Error).message}`);
      }
    } else if (m.status === 'RUNNING' && !m.proxmoxTaskId) {
      // Stubbed migration — simulate progress based on elapsed
      const elapsed =
        (Date.now() - (m.startedAt?.getTime() ?? Date.now())) / 1000;
      const progress = Math.min(
        100,
        Math.round((elapsed / Math.max(m.estimatedDowntimeSec, 5)) * 100),
      );
      const done = progress >= 100;
      const updated = await this.prisma.vPSMigration.update({
        where: { id: migrationId },
        data: {
          progress,
          status: done ? 'COMPLETED' : 'RUNNING',
          completedAt: done ? new Date() : null,
        },
      });
      if (done) {
        await this.prisma.cloudDeployment.update({
          where: { id: m.vpsId },
          data: { proxmoxNode: m.targetNode },
        });
      }
      return this.toStatus(updated);
    }

    return this.toStatus(
      await this.prisma.vPSMigration.findUniqueOrThrow({
        where: { id: migrationId },
      }),
    );
  }

  private toStatus(m: {
    status: string;
    progress: number;
    estimatedDowntimeSec: number;
    startedAt: Date | null;
  }) {
    const elapsed = m.startedAt
      ? (Date.now() - m.startedAt.getTime()) / 1000
      : 0;
    const remaining =
      m.status === 'RUNNING'
        ? Math.max(
            0,
            Math.round(
              (m.estimatedDowntimeSec * (100 - m.progress)) / 100 - 0,
            ) || 0,
          )
        : 0;
    return {
      status: m.status,
      progress: m.progress,
      estimatedRemaining:
        remaining || Math.max(0, m.estimatedDowntimeSec - elapsed),
    };
  }

  async cancelMigration(migrationId: string, userId: string) {
    const m = await this.prisma.vPSMigration.findUnique({
      where: { id: migrationId },
    });
    if (!m) throw new NotFoundException('Migration not found');
    if (m.userId !== userId) throw new ForbiddenException();
    if (m.status !== 'RUNNING' && m.status !== 'SCHEDULED') {
      throw new BadRequestException(
        `Cannot cancel migration in ${m.status} state`,
      );
    }
    if (m.proxmoxTaskId) {
      try {
        await this.proxmox.stopTask(m.sourceNode, m.proxmoxTaskId);
      } catch {
        /* ignore */
      }
    }
    await this.prisma.vPSMigration.update({
      where: { id: migrationId },
      data: { status: 'CANCELLED', completedAt: new Date() },
    });
    return { ok: true };
  }

  async scheduleMigration(
    vpsId: string,
    userId: string,
    targetNode: string,
    scheduledTime: Date,
  ) {
    const vps = await this.assertOwner(vpsId, userId);
    if (scheduledTime.getTime() < Date.now())
      throw new BadRequestException('scheduledTime must be in the future');
    const m = await this.prisma.vPSMigration.create({
      data: {
        vpsId,
        userId,
        sourceNode: vps.proxmoxNode ?? 'unknown',
        targetNode,
        status: 'SCHEDULED',
        scheduledFor: scheduledTime,
        estimatedDowntimeSec: this.estimateDowntime(vps.storage / 1024),
      },
    });
    return { migrationId: m.id, scheduledFor: m.scheduledFor };
  }

  async getMigrationHistory(vpsId: string, userId: string) {
    await this.assertOwner(vpsId, userId);
    return this.prisma.vPSMigration.findMany({
      where: { vpsId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  /** Admin: drain a node by migrating every VPS on it to another node. */
  async drainNode(sourceNode: string, targetNode: string, adminUserId: string) {
    const vps = await this.prisma.cloudDeployment.findMany({
      where: { proxmoxNode: sourceNode },
    });
    const results: Array<{
      vpsId: string;
      migrationId?: string;
      error?: string;
    }> = [];
    for (const v of vps) {
      try {
        const r = await this.migrateVPS(v.id, v.userId, targetNode);
        results.push({ vpsId: v.id, migrationId: r.migrationId });
      } catch (e) {
        results.push({ vpsId: v.id, error: (e as Error).message });
      }
    }
    this.logger.log(
      `Admin ${adminUserId} drained node ${sourceNode} → ${targetNode}: ${results.length} VPS`,
    );
    return { sourceNode, targetNode, count: results.length, results };
  }
}

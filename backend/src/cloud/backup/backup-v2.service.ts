import { Injectable, Logger, NotFoundException, ForbiddenException, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { BackupType, Prisma } from '@prisma/client';

export interface UpdateScheduleDto {
  enabled?: boolean;
  frequency?: 'DAILY' | 'WEEKLY' | 'MONTHLY';
  retention?: number;
  hour?: number | null;
  dayOfWeek?: number | null;
  dayOfMonth?: number | null;
}

@Injectable()
export class BackupServiceV2 implements OnModuleInit {
  private readonly logger = new Logger(BackupServiceV2.name);
  private scheduleTimer: ReturnType<typeof setInterval> | null = null;
  private cleanupTimer: ReturnType<typeof setInterval> | null = null;

  constructor(private prisma: PrismaService) {}

  onModuleInit() {
    if (process.env.BACKUP_SCHEDULER_DISABLED === '1') return;
    // Check every hour for scheduled backups + retention cleanup
    this.scheduleTimer = setInterval(
      () => this.processScheduledBackups().catch((e) => this.logger.warn(`scheduled: ${e.message}`)),
      60 * 60 * 1000,
    );
    this.cleanupTimer = setInterval(
      () => this.cleanupExpiredBackups().catch((e) => this.logger.warn(`cleanup: ${e.message}`)),
      60 * 60 * 1000,
    );
  }

  // ---------------- VPS ownership ----------------
  private async assertVpsOwner(vpsId: string, userId: string) {
    const vps = await this.prisma.cloudDeployment.findUnique({ where: { id: vpsId } });
    if (!vps) throw new NotFoundException('VPS not found');
    if (vps.userId !== userId) throw new ForbiddenException();
    return vps;
  }

  private async assertBackupOwner(backupId: string, userId: string) {
    const b = await this.prisma.cloudBackup.findUnique({
      where: { id: backupId },
      include: { deployment: true },
    });
    if (!b) throw new NotFoundException('Backup not found');
    if (b.deployment.userId !== userId) throw new ForbiddenException();
    return b;
  }

  // ---------------- Create / List / Delete / Restore ----------------
  async createBackup(vpsId: string, userId: string, name?: string, type: BackupType = BackupType.MANUAL) {
    await this.assertVpsOwner(vpsId, userId);
    const bucket = process.env.S3_BACKUP_BUCKET || 'amercloud-backups';
    const ts = Date.now();
    const path = `s3://${bucket}/${vpsId}/${ts}.tar.gz`;
    const record = await this.prisma.cloudBackup.create({
      data: {
        deploymentId: vpsId,
        userId,
        name: name?.trim() || `backup-${new Date(ts).toISOString().slice(0, 10)}`,
        type,
        storagePath: path,
        status: 'IN_PROGRESS',
        sizeMB: 0,
      },
    });

    // TODO: real Proxmox vzdump call. Stubbed completion with a fake size.
    try {
      const fakeSizeMB = Math.floor(500 + Math.random() * 2500);
      const completed = await this.prisma.cloudBackup.update({
        where: { id: record.id },
        data: {
          status: 'COMPLETED',
          sizeMB: fakeSizeMB,
          sizeBytes: BigInt(fakeSizeMB) * BigInt(1024 * 1024),
          completedAt: new Date(),
        },
      });
      await this.enforceRetention(vpsId);
      return completed;
    } catch (e: any) {
      this.logger.error(`backup failed: ${e.message}`);
      return this.prisma.cloudBackup.update({ where: { id: record.id }, data: { status: 'FAILED' } });
    }
  }

  listBackups(vpsId: string) {
    return this.prisma.cloudBackup.findMany({
      where: { deploymentId: vpsId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async listAllForUser(userId: string, opts?: { vpsId?: string; from?: Date; to?: Date }) {
    const where: Prisma.CloudBackupWhereInput = {
      deployment: { userId },
      ...(opts?.vpsId ? { deploymentId: opts.vpsId } : {}),
      ...(opts?.from || opts?.to
        ? { createdAt: { ...(opts.from ? { gte: opts.from } : {}), ...(opts.to ? { lte: opts.to } : {}) } }
        : {}),
    };
    return this.prisma.cloudBackup.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: { deployment: { select: { id: true, name: true } } },
      take: 500,
    });
  }

  async deleteBackup(backupId: string, userId: string) {
    await this.assertBackupOwner(backupId, userId);
    // TODO: delete from S3
    await this.prisma.cloudBackup.delete({ where: { id: backupId } });
    return { ok: true };
  }

  async deleteMany(ids: string[], userId: string) {
    const owned = await this.prisma.cloudBackup.findMany({
      where: { id: { in: ids }, deployment: { userId } },
      select: { id: true },
    });
    const ownedIds = owned.map((o) => o.id);
    if (ownedIds.length) await this.prisma.cloudBackup.deleteMany({ where: { id: { in: ownedIds } } });
    return { deleted: ownedIds.length };
  }

  async restoreBackup(backupId: string, userId: string, targetVpsId?: string) {
    const b = await this.assertBackupOwner(backupId, userId);
    if (targetVpsId) await this.assertVpsOwner(targetVpsId, userId);
    const restoreTo = targetVpsId ?? b.deploymentId;
    this.logger.log(`Restoring backup ${backupId} -> VPS ${restoreTo} from ${b.storagePath}`);
    // TODO: real Proxmox restore
    return { ok: true, restoredTo: restoreTo };
  }

  // ---------------- Schedule ----------------
  getSchedule(vpsId: string) {
    return this.prisma.backupSchedule.findUnique({ where: { vpsId } });
  }

  async updateSchedule(vpsId: string, userId: string, data: UpdateScheduleDto) {
    await this.assertVpsOwner(vpsId, userId);
    const payload = {
      enabled: data.enabled ?? true,
      frequency: data.frequency ?? 'DAILY',
      retention: Math.max(1, Math.min(60, data.retention ?? 7)),
      hour: data.hour ?? 2,
      dayOfWeek: data.dayOfWeek ?? null,
      dayOfMonth: data.dayOfMonth ?? null,
    };
    return this.prisma.backupSchedule.upsert({
      where: { vpsId },
      update: payload,
      create: { vpsId, ...payload },
    });
  }

  // ---------------- Periodic ----------------
  private async enforceRetention(vpsId: string) {
    const sched = await this.prisma.backupSchedule.findUnique({ where: { vpsId } });
    const keep = sched?.retention ?? 14;
    const all = await this.prisma.cloudBackup.findMany({
      where: { deploymentId: vpsId, status: 'COMPLETED' },
      orderBy: { createdAt: 'desc' },
      select: { id: true },
    });
    const toDelete = all.slice(keep).map((b) => b.id);
    if (toDelete.length) {
      await this.prisma.cloudBackup.deleteMany({ where: { id: { in: toDelete } } });
      this.logger.log(`retention: deleted ${toDelete.length} backups for VPS ${vpsId}`);
    }
  }

  async processScheduledBackups() {
    const now = new Date();
    const schedules = await this.prisma.backupSchedule.findMany({
      where: { enabled: true },
      include: { vps: true },
    });
    for (const s of schedules) {
      if (!this.shouldRun(s, now)) continue;
      try {
        this.logger.log(`scheduled backup for VPS ${s.vpsId}`);
        await this.createBackup(s.vpsId, s.vps.userId, `auto-${now.toISOString().slice(0, 16)}`, BackupType.SCHEDULED);
        await this.prisma.backupSchedule.update({ where: { vpsId: s.vpsId }, data: { lastRunAt: now } });
      } catch (e: any) {
        this.logger.warn(`scheduled backup failed for ${s.vpsId}: ${e.message}`);
      }
    }
  }

  private shouldRun(s: { frequency: string; hour: number | null; dayOfWeek: number | null; dayOfMonth: number | null; lastRunAt: Date | null }, now: Date): boolean {
    const hour = s.hour ?? 2;
    if (now.getHours() !== hour) return false;
    if (s.lastRunAt && now.getTime() - s.lastRunAt.getTime() < 60 * 60 * 1000) return false;
    if (s.frequency === 'DAILY') return true;
    if (s.frequency === 'WEEKLY') return now.getDay() === (s.dayOfWeek ?? 0);
    if (s.frequency === 'MONTHLY') return now.getDate() === (s.dayOfMonth ?? 1);
    return false;
  }

  async cleanupExpiredBackups() {
    const schedules = await this.prisma.backupSchedule.findMany();
    for (const s of schedules) {
      await this.enforceRetention(s.vpsId).catch(() => {});
    }
  }
}

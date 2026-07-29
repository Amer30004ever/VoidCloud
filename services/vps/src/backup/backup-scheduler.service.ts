import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { BackupSchedule, BackupType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class VpsBackupSchedulerService {
  private readonly logger = new Logger(VpsBackupSchedulerService.name);

  constructor(private readonly prisma: PrismaService) {}

  @Cron(CronExpression.EVERY_HOUR)
  async tick() {
    const schedules = await this.prisma.backupSchedule.findMany({
      where: { enabled: true },
      include: { vps: true },
    });

    for (const schedule of schedules) {
      if (!this.isDue(schedule)) continue;

      try {
        const backup = await this.prisma.cloudBackup.create({
          data: {
            deploymentId: schedule.vpsId,
            userId: schedule.vps.userId,
            type: BackupType.SCHEDULED,
            status: 'pending',
            name: `Scheduled backup ${new Date().toISOString()}`,
            sizeMB: 0,
            storagePath: `/tmp/backups/${schedule.vpsId}/${Date.now()}`,
            sizeBytes: BigInt(0),
          },
        });

        await this.prisma.backupSchedule.update({
          where: { id: schedule.id },
          data: { lastRunAt: new Date() },
        });

        await this.triggerProxmoxBackup(backup.id, schedule.vps);
        await this.enforceRetention(schedule.vpsId, schedule.retention);
      } catch (err) {
        this.logger.error(`Backup schedule failed for ${schedule.vpsId}: ${err}`);
      }
    }
  }

  async getBackups(vpsId: string) {
    return this.prisma.cloudBackup.findMany({
      where: { deploymentId: vpsId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createSchedule(vpsId: string, dto: Partial<BackupSchedule>) {
    const { frequency, retention, hour, dayOfWeek, dayOfMonth } = dto;
    return this.prisma.backupSchedule.upsert({
      where: { vpsId },
      create: {
        vpsId,
        frequency: frequency ?? 'DAILY',
        retention: retention ?? 7,
        hour: hour ?? null,
        dayOfWeek: dayOfWeek ?? null,
        dayOfMonth: dayOfMonth ?? null,
      },
      update: {
        frequency: frequency ?? 'DAILY',
        retention: retention ?? 7,
        hour: hour ?? null,
        dayOfWeek: dayOfWeek ?? null,
        dayOfMonth: dayOfMonth ?? null,
      },
    });
  }

  async getSchedule(vpsId: string) {
    return this.prisma.backupSchedule.findUnique({
      where: { vpsId },
    });
  }

  async restoreBackup(backupId: string) {
    return { ok: true, message: 'Restore queued' };
  }

  private isDue(schedule: BackupSchedule): boolean {
    const now = new Date();
    if (!schedule.lastRunAt) return true;

    const last = schedule.lastRunAt;
    switch (schedule.frequency) {
      case 'HOURLY':
        return now.getTime() - last.getTime() > 3600000;
      case 'DAILY':
        return now.getTime() - last.getTime() > 86400000;
      case 'WEEKLY':
        return now.getTime() - last.getTime() > 7 * 86400000;
      case 'MONTHLY':
        return now.getTime() - last.getTime() > 30 * 86400000;
      default:
        return false;
    }
  }

  private async triggerProxmoxBackup(backupId: string, vps: { id: string; proxmoxVMID?: number | null }) {
    this.logger.log(`Simulating Proxmox backup for backup ${backupId} (VM ${vps.proxmoxVMID})`);
    await new Promise((resolve) => setTimeout(resolve, 1000));
    await this.prisma.cloudBackup.update({
      where: { id: backupId },
      data: {
        status: 'completed',
        completedAt: new Date(),
        sizeMB: Math.floor(Math.random() * 500 + 50),
        sizeBytes: BigInt(Math.floor(Math.random() * 500 + 50)) * BigInt(1024) * BigInt(1024),
      },
    });
  }

  private async enforceRetention(vpsId: string, retention: number) {
    const completed = await this.prisma.cloudBackup.findMany({
      where: { deploymentId: vpsId, status: 'completed' },
      orderBy: { createdAt: 'asc' },
    });

    if (completed.length <= retention) return;

    const toDelete = completed.slice(0, completed.length - retention);
    for (const backup of toDelete) {
      await this.prisma.cloudBackup.delete({ where: { id: backup.id } });
    }
  }
}

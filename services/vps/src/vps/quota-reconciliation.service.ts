import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class QuotaReconciliationService implements OnModuleInit {
  private readonly logger = new Logger(QuotaReconciliationService.name);

  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit() {
    await this.reconcileAll();
  }

  @Cron(CronExpression.EVERY_HOUR)
  async tick() {
    await this.reconcileAll();
  }

  async reconcileAll() {
    const quotas = await this.prisma.tenantQuota.findMany();
    let corrected = 0;
    for (const quota of quotas) {
      const agg = await this.prisma.cloudDeployment.aggregate({
        where: { tenantId: quota.tenantId, status: { not: 'DELETED' } },
        _sum: { cpu: true, memory: true, storage: true },
        _count: true,
      });
      const liveCpu = agg._sum.cpu ?? 0;
      const liveRam = agg._sum.memory ?? 0;
      const liveDisk = Math.ceil((agg._sum.storage ?? 0) / 1024);
      const liveCount = agg._count;

      if (
        liveCpu !== quota.currentCpu ||
        liveRam !== quota.currentRamMb ||
        liveDisk !== quota.currentDiskGb ||
        liveCount !== quota.currentVpsCount
      ) {
        await this.prisma.tenantQuota.update({
          where: { tenantId: quota.tenantId },
          data: {
            currentCpu: liveCpu,
            currentRamMb: liveRam,
            currentDiskGb: liveDisk,
            currentVpsCount: liveCount,
          },
        });
        corrected += 1;
      }
    }
    if (corrected > 0) {
      this.logger.warn(`quota reconciliation corrected drift for ${corrected} tenant(s)`);
    }
  }
}

import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { AbuseService } from './abuse.service';

/**
 * Server-side outbound-abuse detector (Prompt 0.17).
 *
 * Runs on a schedule independent of any browser tab — it scans recent
 * UsageMetric samples for abuse signatures (mass SMTP, mass outbound to
 * many distinct IPs, sustained 100% CPU) and raises automated AbuseReports
 * + SUPER_ADMIN notifications when a threshold is crossed.
 */
@Injectable()
export class AbuseDetectorScheduler implements OnModuleInit {
  private readonly logger = new Logger(AbuseDetectorScheduler.name);

  constructor(private readonly abuse: AbuseService) {}

  async onModuleInit() {
    // Best-effort initial sweep on boot.
    this.abuse.detectOutboundAbuse().catch((e) => this.logger.warn(`initial abuse sweep failed: ${e?.message ?? e}`));
  }

  @Cron(CronExpression.EVERY_10_MINUTES)
  async tick() {
    try {
      const signals = await this.abuse.detectOutboundAbuse();
      if (signals.length) {
        this.logger.warn(`outbound-abuse sweep flagged ${signals.length} VPS instance(s)`);
      }
    } catch (e: any) {
      this.logger.warn(`abuse sweep failed: ${e?.message ?? e}`);
    }
  }
}

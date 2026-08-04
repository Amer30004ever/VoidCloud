import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { SupportService } from './support.service';

/**
 * Runs the support SLA sweep on a schedule (Tier 9.9): flags breaches and
 * escalates at-risk tickets so no ticket silently rots in the queue.
 */
@Injectable()
export class SupportSlaScheduler {
  private readonly logger = new Logger(SupportSlaScheduler.name);

  constructor(private readonly support: SupportService) {}

  @Cron(CronExpression.EVERY_5_MINUTES)
  async sweep() {
    try {
      const result = await this.support.runSlaSweep();
      if (result.escalated || result.breached) {
        this.logger.warn(
          `SLA sweep: scanned=${result.scanned} escalated=${result.escalated} breached=${result.breached}`,
        );
      }
    } catch (error) {
      this.logger.error(
        `SLA sweep failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
}

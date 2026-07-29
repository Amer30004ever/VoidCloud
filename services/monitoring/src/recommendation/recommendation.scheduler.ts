import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { RecommendationService } from './recommendation.service';

/**
 * Daily recommendation sweep (Prompt 5.1).
 *
 * Runs every day at 06:00 and generates scaling recommendations for all
 * active VPS instances based on recent UsageMetric averages.
 */
@Injectable()
export class RecommendationScheduler {
  private readonly logger = new Logger(RecommendationScheduler.name);

  constructor(private readonly recommendation: RecommendationService) {}

  @Cron(CronExpression.EVERY_DAY_AT_6AM)
  async tick() {
    try {
      const results = await this.recommendation.generateForAllActive();
      if (results.length) {
        this.logger.log(`recommendation sweep created ${results.length} recommendation(s)`);
      }
    } catch (e: any) {
      this.logger.warn(`recommendation sweep failed: ${e?.message ?? e}`);
    }
  }
}

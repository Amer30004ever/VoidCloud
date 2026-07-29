import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { AlertingService } from './alerting.service';

@Injectable()
export class AlertingScheduler {
  private readonly logger = new Logger(AlertingScheduler.name);

  constructor(private readonly alerting: AlertingService) {}

  @Cron('*/2 * * * *')
  async runPlatformHealthCheck() {
    try {
      await Promise.all([
        this.alerting.checkPlatformHealth(),
        this.alerting.checkInfrastructure(),
      ]);
    } catch (e) {
      this.logger.warn(`Health check failed: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  @Cron('*/2 * * * *')
  async runVpsHealthCheck() {
    try {
      await this.alerting.checkVpsHealth();
    } catch (e) {
      this.logger.warn(`VPS health check failed: ${e instanceof Error ? e.message : String(e)}`);
    }
  }
}

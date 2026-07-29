import { Module } from '@nestjs/common';
import { AlertingService } from './alerting.service';
import { AlertingScheduler } from './alerting.scheduler';
import { PrismaModule } from '../prisma/prisma.module';
import { HealthCheckModule } from '../health-check/health-check.module';

@Module({
  imports: [PrismaModule, HealthCheckModule],
  providers: [AlertingService, AlertingScheduler],
  exports: [AlertingService],
})
export class AlertingModule {}

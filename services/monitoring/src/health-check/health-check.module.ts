import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { HealthCheckController } from './health-check.controller';
import { HealthCheckService } from './health-check.service';
import { HealthCheckScheduler } from './health-check.scheduler';

@Module({
  imports: [ScheduleModule.forRoot()],
  controllers: [HealthCheckController],
  providers: [HealthCheckService, HealthCheckScheduler],
  exports: [HealthCheckService, HealthCheckScheduler],
})
export class HealthCheckModule {}

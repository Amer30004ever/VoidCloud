import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { MonitoringModule } from './monitoring/monitoring.module';
import { HealthController } from './health/health.controller';
import { PrismaModule } from './prisma/prisma.module';
import { HealthCheckModule } from './health-check/health-check.module';
import { SettingsController } from './settings/settings.controller';
import { AbuseModule } from './abuse/abuse.module';
import { AbuseDetectorScheduler } from './abuse/abuse-detector.scheduler';
import { PodsModule } from './pods/pods.module';
import { AlertingModule } from './alerting/alerting.module';
import { AlertingScheduler } from './alerting/alerting.scheduler';
import { PlatformSecretsModule } from './secrets/platform-secrets.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    ScheduleModule.forRoot(),
    MonitoringModule,
    HealthCheckModule,
    AbuseModule,
    PodsModule,
    AlertingModule,
    PlatformSecretsModule,
  ],
  controllers: [HealthController, SettingsController],
  providers: [AbuseDetectorScheduler, AlertingScheduler],
})
export class AppModule { }

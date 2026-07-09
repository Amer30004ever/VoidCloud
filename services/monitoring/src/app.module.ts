import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MonitoringModule } from './monitoring/monitoring.module';
import { HealthController } from './health/health.controller';
import { PrismaModule } from './prisma/prisma.module';
import { HealthCheckModule } from './health-check/health-check.module';
import { SettingsController } from './settings/settings.controller';

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true }), PrismaModule, MonitoringModule, HealthCheckModule],
  controllers: [HealthController, SettingsController],
})
export class AppModule {}

import { Module } from '@nestjs/common';
import { MonitoringController } from './monitoring.controller';
import { MonitoringService } from './monitoring.service';
import { RecommendationModule } from '../recommendation/recommendation.module';
import { ApiUsageModule } from '../../../shared/api-usage/api-usage.module';
import { IncidentsModule } from './incidents/incidents.module';

@Module({
  controllers: [MonitoringController],
  providers: [MonitoringService],
  imports: [RecommendationModule, ApiUsageModule, IncidentsModule],
})
export class MonitoringModule {}

import { Module } from '@nestjs/common';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';
import { StatsModule } from '../stats/stats.module';
import { KubernetesModule } from '../kubernetes/kubernetes.module';

@Module({
  imports: [StatsModule, KubernetesModule],
  controllers: [DashboardController],
  providers: [DashboardService],
  exports: [DashboardService],
})
export class DashboardModule {}

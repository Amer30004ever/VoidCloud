import { Module } from '@nestjs/common';
import { AlertsService } from './alerts.service';
import { AlertsController } from './alerts.controller';
import { KubernetesModule } from '../kubernetes/kubernetes.module';
import { LogsModule } from '../logs/logs.module';

@Module({
  imports: [KubernetesModule, LogsModule],
  providers: [AlertsService],
  controllers: [AlertsController],
  exports: [AlertsService],
})
export class AlertsModule {}

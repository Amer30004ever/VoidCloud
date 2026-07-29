import { Module } from '@nestjs/common';
import { EventPattern } from '@nestjs/microservices';
import { ScheduleModule } from '@nestjs/schedule';
import { VpsController } from './vps.controller';
import { VpsService } from './vps.service';
import { VpsProvisionService } from './vps-provision.service';
import { QuotaReconciliationService } from './quota-reconciliation.service';
import { DomainVerificationScheduler } from './domain-verification.scheduler';
import { ProxmoxService } from '../proxmox/proxmox.service';
import { ClustersModule } from '../clusters/clusters.module';
import { BackupModule } from '../backup/backup.module';
import { ApiUsageModule } from '../../../shared/api-usage/api-usage.module';
import { BillingModule } from '../../../billing/src/billing/billing.module';
import { K8sAppService } from '../k8s/k8s-app.service';

@Module({
  imports: [ClustersModule, ScheduleModule.forRoot(), BackupModule, ApiUsageModule, BillingModule],
  controllers: [VpsController],
  providers: [VpsService, VpsProvisionService, QuotaReconciliationService, DomainVerificationScheduler, ProxmoxService, K8sAppService],
})
export class VpsModule {}

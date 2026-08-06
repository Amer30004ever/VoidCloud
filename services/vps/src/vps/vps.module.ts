import { Module } from '@nestjs/common';
import { EventPattern } from '@nestjs/microservices';
import { ScheduleModule } from '@nestjs/schedule';
import { VpsController } from './vps.controller';
import { VpsService } from './vps.service';
import { VpsProvisionService } from './vps-provision.service';
import { QuotaReconciliationService } from './quota-reconciliation.service';
import { DomainVerificationScheduler } from './domain-verification.scheduler';
import { ProxmoxService } from '../proxmox/proxmox.service';
import { IsolationReconcilerService } from '../proxmox/isolation-reconciler.service';
import { IsolationController } from '../proxmox/isolation.controller';
import { ClustersModule } from '../clusters/clusters.module';
import { BackupModule } from '../backup/backup.module';
import { ApiUsageModule } from '../../../shared/api-usage/api-usage.module';
import { K8sAppService } from '../k8s/k8s-app.service';
import { FloatingIpService } from '../network/floating-ip.service';
import { FloatingIpController } from '../network/floating-ip.controller';
import { ManagedDatabaseProvisionerService } from '../managed/managed-database-provisioner.service';
import { ManagedDatabaseService } from '../managed/managed-database.service';
import { ManagedDatabaseController } from '../managed/managed-database.controller';
import { ObjectStorageService } from '../managed/object-storage.service';
import { ObjectStorageController } from '../managed/object-storage.controller';
import { ManagedK8sService } from '../managed/managed-k8s.service';
import { ManagedK8sController } from '../managed/managed-k8s.controller';
import { VmImportService } from '../managed/vm-import.service';
import { VmImportController } from '../managed/vm-import.controller';

import { CreditService } from '../../../billing/src/billing/credit.service';

@Module({
  imports: [ClustersModule, ScheduleModule.forRoot(), BackupModule, ApiUsageModule],
  controllers: [VpsController, IsolationController, FloatingIpController, ManagedDatabaseController, ObjectStorageController, ManagedK8sController, VmImportController],
  providers: [VpsService, VpsProvisionService, QuotaReconciliationService, DomainVerificationScheduler, ProxmoxService, IsolationReconcilerService, K8sAppService, FloatingIpService, ManagedDatabaseService,
    ManagedDatabaseProvisionerService, ObjectStorageService, ManagedK8sService, VmImportService, CreditService],
})
export class VpsModule { }

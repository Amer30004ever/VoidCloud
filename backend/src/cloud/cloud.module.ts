import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { CloudPlansService } from './cloud-plans.service';
import { CloudDeploymentsService } from './cloud-deployments.service';
import { CloudBillingService } from './cloud-billing.service';
import { CloudAdminService } from './cloud-admin.service';
import { KubernetesService } from './kubernetes/kubernetes.service';
import { PrometheusService } from './metrics/prometheus.service';
import { ProxmoxService } from './proxmox/proxmox.service';
import { StripeService } from './billing/stripe.service';
import { FawryService } from './billing/fawry.service';
import { InstapayService } from './billing/instapay.service';
import { CloudEmailService } from './notifications/email.service';
import { TwoFactorService } from './auth/two-factor.service';
import { CloudAuditService } from './audit/cloud-audit.service';
import { CloudBackupService } from './backup/cloud-backup.service';
import {
  CloudPlansController,
  CloudDeploymentsController,
  CloudBillingController,
  CloudWebhooksController,
  CloudAdminController,
  CloudTwoFactorController,
  CloudBackupController,
} from './cloud.controllers';

@Module({
  imports: [AuthModule],
  controllers: [
    CloudPlansController,
    CloudDeploymentsController,
    CloudBillingController,
    CloudWebhooksController,
    CloudAdminController,
    CloudTwoFactorController,
    CloudBackupController,
  ],
  providers: [
    CloudPlansService, CloudDeploymentsService, CloudBillingService, CloudAdminService,
    KubernetesService, PrometheusService, ProxmoxService,
    StripeService, FawryService, InstapayService,
    CloudEmailService, TwoFactorService, CloudAuditService, CloudBackupService,
  ],
  exports: [CloudPlansService, CloudDeploymentsService, CloudBillingService, CloudEmailService, TwoFactorService],
})
export class CloudModule {}

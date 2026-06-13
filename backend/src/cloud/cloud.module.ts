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
import { CloudAccountService } from './auth/account.service';
import { CloudAuditService } from './audit/cloud-audit.service';
import { ActivityService } from './audit/activity.service';
import { CloudBackupService } from './backup/cloud-backup.service';
import { VpsTerminalGateway } from './terminal/vps-terminal.gateway';
import { VpsAlertService } from './monitoring/vps-alert.service';
import { VpsAlertController } from './monitoring/vps-alert.controller';
import {
  CloudPlansController,
  CloudTemplatesController,
  CloudDeploymentsController,
  CloudBillingController,
  CloudWebhooksController,
  CloudAdminController,
  CloudTwoFactorController,
  CloudAccountController,
  CloudBackupController,
} from './cloud.controllers';



@Module({
  imports: [AuthModule],
  controllers: [
    CloudPlansController,
    CloudTemplatesController,
    CloudDeploymentsController,
    CloudBillingController,
    CloudWebhooksController,
    CloudAdminController,
    CloudTwoFactorController,
    CloudAccountController,
    CloudBackupController,
    VpsAlertController,
  ],
  providers: [
    CloudPlansService, CloudDeploymentsService, CloudBillingService, CloudAdminService,
    KubernetesService, PrometheusService, ProxmoxService,
    StripeService, FawryService, InstapayService,
    CloudEmailService, TwoFactorService, CloudAccountService, CloudAuditService, ActivityService, CloudBackupService,
    VpsTerminalGateway, VpsAlertService,
  ],
  exports: [CloudPlansService, CloudDeploymentsService, CloudBillingService, CloudEmailService, TwoFactorService],
})
export class CloudModule {}

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
import { BackupServiceV2 } from './backup/backup-v2.service';
import { SSHKeyService } from './ssh/ssh-key.service';
import { VPSResizeService } from './vps/vps-resize.service';
import { FirewallService } from './firewall/firewall.service';
import { OrganizationService } from './organization/organization.service';
import { VpsTerminalGateway } from './terminal/vps-terminal.gateway';
import { VpsAlertService } from './monitoring/vps-alert.service';
import { VpsAlertController } from './monitoring/vps-alert.controller';
import { ImageService } from './images/image.service';
import { DNSService } from './dns/dns.service';
import { AnalyticsService } from './analytics/analytics.service';
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
  CloudSshKeyController,
  CloudVpsResizeController,
  CloudFirewallController,
  CloudOrganizationController,
  CloudVpsTransferController,
} from './cloud.controllers';
import { CloudImageController, CloudDomainController, CloudAnalyticsController, CloudRateLimitController, CloudWebhookController, CloudVpsMigrationController, AdminVpsMigrationController } from './cloud.controllers';
import { RateLimitService } from './rate-limit/rate-limit.service';
import { WebhookService } from './webhook/webhook.service';
import { VPSMigrationService } from './vps/vps-migration.service';



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
    CloudSshKeyController,
    CloudVpsResizeController,
    CloudFirewallController,
    CloudOrganizationController,
    CloudVpsTransferController,
    VpsAlertController,
    CloudImageController,
    CloudDomainController,
    CloudAnalyticsController,
    CloudRateLimitController,
    CloudWebhookController,
    CloudVpsMigrationController,
    AdminVpsMigrationController,
  ],
  providers: [
    CloudPlansService, CloudDeploymentsService, CloudBillingService, CloudAdminService,
    KubernetesService, PrometheusService, ProxmoxService,
    StripeService, FawryService, InstapayService,
    CloudEmailService, TwoFactorService, CloudAccountService, CloudAuditService, ActivityService, CloudBackupService, BackupServiceV2,
    SSHKeyService, VPSResizeService, FirewallService, OrganizationService,
    VpsTerminalGateway, VpsAlertService, ImageService, DNSService, AnalyticsService,
    RateLimitService, WebhookService, VPSMigrationService,
  ],
  exports: [CloudPlansService, CloudDeploymentsService, CloudBillingService, CloudEmailService, TwoFactorService, WebhookService],
})
export class CloudModule {}

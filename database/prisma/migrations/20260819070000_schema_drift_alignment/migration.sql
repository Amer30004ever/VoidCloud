-- DropForeignKey
ALTER TABLE "BackupSchedule" DROP CONSTRAINT "BackupSchedule_vpsId_fkey";

-- DropForeignKey
ALTER TABLE "BillingPaymentAlert" DROP CONSTRAINT "BillingPaymentAlert_invoiceId_fkey";

-- DropForeignKey
ALTER TABLE "CloudBackup" DROP CONSTRAINT "CloudBackup_deploymentId_fkey";

-- DropForeignKey
ALTER TABLE "CloudDeployment" DROP CONSTRAINT "CloudDeployment_organizationId_fkey";

-- DropForeignKey
ALTER TABLE "CloudDeployment" DROP CONSTRAINT "cloud_deployments_proxmoxClusterId_fkey";

-- DropForeignKey
ALTER TABLE "CustomImage" DROP CONSTRAINT "CustomImage_sourceVpsId_fkey";

-- DropForeignKey
ALTER TABLE "CustomImage" DROP CONSTRAINT "CustomImage_userId_fkey";

-- DropForeignKey
ALTER TABLE "CustomImageShare" DROP CONSTRAINT "CustomImageShare_imageId_fkey";

-- DropForeignKey
ALTER TABLE "DNSRecord" DROP CONSTRAINT "DNSRecord_domainId_fkey";

-- DropForeignKey
ALTER TABLE "Domain" DROP CONSTRAINT "Domain_userId_fkey";

-- DropForeignKey
ALTER TABLE "Domain" DROP CONSTRAINT "Domain_vpsId_fkey";

-- DropForeignKey
ALTER TABLE "FirewallRule" DROP CONSTRAINT "FirewallRule_userId_fkey";

-- DropForeignKey
ALTER TABLE "FirewallRule" DROP CONSTRAINT "FirewallRule_vpsId_fkey";

-- DropForeignKey
ALTER TABLE "Organization" DROP CONSTRAINT "Organization_ownerId_fkey";

-- DropForeignKey
ALTER TABLE "OrganizationInvitation" DROP CONSTRAINT "OrganizationInvitation_organizationId_fkey";

-- DropForeignKey
ALTER TABLE "OrganizationMember" DROP CONSTRAINT "OrganizationMember_organizationId_fkey";

-- DropForeignKey
ALTER TABLE "OrganizationMember" DROP CONSTRAINT "OrganizationMember_userId_fkey";

-- DropForeignKey
ALTER TABLE "SSHKey" DROP CONSTRAINT "SSHKey_userId_fkey";

-- DropForeignKey
ALTER TABLE "UsageMetric" DROP CONSTRAINT "UsageMetric_vpsId_fkey";

-- DropForeignKey
ALTER TABLE "VpsAlertNotification" DROP CONSTRAINT "VpsAlertNotification_alertRuleId_fkey";

-- DropForeignKey
ALTER TABLE "VpsAlertNotification" DROP CONSTRAINT "VpsAlertNotification_vpsId_fkey";

-- DropForeignKey
ALTER TABLE "VpsAlertRule" DROP CONSTRAINT "VpsAlertRule_userId_fkey";

-- DropForeignKey
ALTER TABLE "VpsAlertRule" DROP CONSTRAINT "VpsAlertRule_vpsId_fkey";

-- DropForeignKey
ALTER TABLE "VpsSecuritySettings" DROP CONSTRAINT "VpsSecuritySettings_vps_fkey";

-- DropForeignKey
ALTER TABLE "_VPSKeys" DROP CONSTRAINT "_VPSKeys_A_fkey";

-- DropForeignKey
ALTER TABLE "_VPSKeys" DROP CONSTRAINT "_VPSKeys_B_fkey";

-- DropForeignKey
ALTER TABLE "abuse_reports" DROP CONSTRAINT "abuse_reports_targetVpsId_fkey";

-- DropForeignKey
ALTER TABLE "credit_transactions" DROP CONSTRAINT "credit_transactions_relatedVpsId_fkey";

-- DropForeignKey
ALTER TABLE "credit_transactions" DROP CONSTRAINT "credit_transactions_userId_fkey";

-- DropForeignKey
ALTER TABLE "managed_database_events" DROP CONSTRAINT "managed_database_events_databaseId_fkey";

-- DropForeignKey
ALTER TABLE "ptr_record_requests" DROP CONSTRAINT "ptr_record_requests_userId_fkey";

-- DropForeignKey
ALTER TABLE "ptr_record_requests" DROP CONSTRAINT "ptr_record_requests_vpsId_fkey";

-- DropForeignKey
ALTER TABLE "support_ticket_messages" DROP CONSTRAINT "support_ticket_messages_ticketId_fkey";

-- DropForeignKey
ALTER TABLE "vps_provision_jobs" DROP CONSTRAINT "vps_provision_jobs_vpsId_fkey";

-- DropForeignKey
ALTER TABLE "whatsapp_broadcast_recipients" DROP CONSTRAINT "whatsapp_broadcast_recipients_broadcastId_fkey";

-- DropIndex
DROP INDEX "ApiKey_tenantId_idx";

-- DropIndex
DROP INDEX "cloud_deployments_proxmoxClusterId_idx";

-- DropIndex
DROP INDEX "PlatformSecret_createdAt_idx";

-- DropIndex
DROP INDEX "tenant_quotas_tenantId_idx";

-- DropIndex
DROP INDEX "tos_acceptances_userId_idx";

-- AlterTable
ALTER TABLE "BackupSchedule" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "BillingPaymentAlert" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "Conversation" ADD COLUMN     "assignedTo" TEXT;

-- AlterTable
UPDATE "CustomImage" SET "storageUrl" = '' WHERE "storageUrl" IS NULL;
ALTER TABLE "CustomImage" ALTER COLUMN "type" DROP DEFAULT,
ALTER COLUMN "sizeMB" DROP DEFAULT,
ALTER COLUMN "storageUrl" SET NOT NULL;

-- AlterTable
ALTER TABLE "FirewallRule" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "Organization" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "User" ALTER COLUMN "themePreference" DROP NOT NULL;

-- AlterTable
ALTER TABLE "VpsAlertRule" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "WhatsappContact" ADD COLUMN     "crmContactId" TEXT,
ADD COLUMN     "isBlocked" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "profilePic" TEXT;

-- AlterTable
ALTER TABLE "_VPSKeys" ADD CONSTRAINT "_VPSKeys_AB_pkey" PRIMARY KEY ("A", "B");

-- DropIndex
DROP INDEX "_VPSKeys_AB_unique";

-- AlterTable
ALTER TABLE "abuse_reports" ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "agent_invites" ADD COLUMN     "createdBy" TEXT NOT NULL,
ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "credit_transactions" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "ip_block_list" ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "expiresAt" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "createdAt" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "managed_database_events" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "oauth_identities" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "platform_secrets" RENAME CONSTRAINT "PlatformSecret_pkey" TO "platform_secrets_pkey";

-- AlterTable
ALTER TABLE "platform_settings" ALTER COLUMN "updatedAt" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "proxmox_clusters" ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "createdAt" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "updatedAt" DROP DEFAULT,
ALTER COLUMN "updatedAt" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "ptr_record_requests" ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "service_health_logs" ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "checkedAt" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "support_ticket_messages" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "support_tickets" ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "tenant_quotas" ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "maxCpu" SET DATA TYPE DOUBLE PRECISION,
ALTER COLUMN "currentCpu" SET DATA TYPE DOUBLE PRECISION,
ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "tos_acceptances" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "vps_health_logs" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "vps_provision_jobs" ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "whatsapp_broadcast_recipients" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "whatsapp_broadcasts" ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "sentAt" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "createdAt" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "updatedAt" DROP DEFAULT,
ALTER COLUMN "updatedAt" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "whatsapp_templates" ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "updatedAt" DROP DEFAULT;

-- CreateIndex
CREATE INDEX "WhatsappContact_userId_idx" ON "WhatsappContact"("userId");

-- CreateIndex
CREATE INDEX "WhatsappContact_crmContactId_idx" ON "WhatsappContact"("crmContactId");

-- CreateIndex
CREATE INDEX "vps_provision_jobs_idempotencyKey_idx" ON "vps_provision_jobs"("idempotencyKey");

-- AddForeignKey
ALTER TABLE "agent_invites" ADD CONSTRAINT "agent_invites_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CloudDeployment" ADD CONSTRAINT "CloudDeployment_proxmoxClusterId_fkey" FOREIGN KEY ("proxmoxClusterId") REFERENCES "proxmox_clusters"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CloudDeployment" ADD CONSTRAINT "CloudDeployment_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "abuse_reports" ADD CONSTRAINT "abuse_reports_targetVpsId_fkey" FOREIGN KEY ("targetVpsId") REFERENCES "CloudDeployment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ptr_record_requests" ADD CONSTRAINT "ptr_record_requests_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ptr_record_requests" ADD CONSTRAINT "ptr_record_requests_vpsId_fkey" FOREIGN KEY ("vpsId") REFERENCES "CloudDeployment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vps_provision_jobs" ADD CONSTRAINT "vps_provision_jobs_vpsId_fkey" FOREIGN KEY ("vpsId") REFERENCES "CloudDeployment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VpsAlertRule" ADD CONSTRAINT "VpsAlertRule_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VpsAlertRule" ADD CONSTRAINT "VpsAlertRule_vpsId_fkey" FOREIGN KEY ("vpsId") REFERENCES "CloudDeployment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VpsAlertNotification" ADD CONSTRAINT "VpsAlertNotification_alertRuleId_fkey" FOREIGN KEY ("alertRuleId") REFERENCES "VpsAlertRule"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VpsAlertNotification" ADD CONSTRAINT "VpsAlertNotification_vpsId_fkey" FOREIGN KEY ("vpsId") REFERENCES "CloudDeployment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CloudBackup" ADD CONSTRAINT "CloudBackup_deploymentId_fkey" FOREIGN KEY ("deploymentId") REFERENCES "CloudDeployment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BackupSchedule" ADD CONSTRAINT "BackupSchedule_vpsId_fkey" FOREIGN KEY ("vpsId") REFERENCES "CloudDeployment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VpsSecuritySettings" ADD CONSTRAINT "VpsSecuritySettings_vpsId_fkey" FOREIGN KEY ("vpsId") REFERENCES "CloudDeployment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BillingPaymentAlert" ADD CONSTRAINT "BillingPaymentAlert_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "CloudInvoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "credit_transactions" ADD CONSTRAINT "credit_transactions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "credit_transactions" ADD CONSTRAINT "credit_transactions_relatedVpsId_fkey" FOREIGN KEY ("relatedVpsId") REFERENCES "CloudDeployment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FirewallRule" ADD CONSTRAINT "FirewallRule_vpsId_fkey" FOREIGN KEY ("vpsId") REFERENCES "CloudDeployment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FirewallRule" ADD CONSTRAINT "FirewallRule_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Organization" ADD CONSTRAINT "Organization_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganizationMember" ADD CONSTRAINT "OrganizationMember_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganizationMember" ADD CONSTRAINT "OrganizationMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganizationInvitation" ADD CONSTRAINT "OrganizationInvitation_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Domain" ADD CONSTRAINT "Domain_vpsId_fkey" FOREIGN KEY ("vpsId") REFERENCES "CloudDeployment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Domain" ADD CONSTRAINT "Domain_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DNSRecord" ADD CONSTRAINT "DNSRecord_domainId_fkey" FOREIGN KEY ("domainId") REFERENCES "Domain"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UsageMetric" ADD CONSTRAINT "UsageMetric_vpsId_fkey" FOREIGN KEY ("vpsId") REFERENCES "CloudDeployment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SSHKey" ADD CONSTRAINT "SSHKey_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomImage" ADD CONSTRAINT "CustomImage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomImage" ADD CONSTRAINT "CustomImage_sourceVpsId_fkey" FOREIGN KEY ("sourceVpsId") REFERENCES "CloudDeployment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomImageShare" ADD CONSTRAINT "CustomImageShare_imageId_fkey" FOREIGN KEY ("imageId") REFERENCES "CustomImage"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "whatsapp_broadcast_recipients" ADD CONSTRAINT "whatsapp_broadcast_recipients_broadcastId_fkey" FOREIGN KEY ("broadcastId") REFERENCES "whatsapp_broadcasts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "support_ticket_messages" ADD CONSTRAINT "support_ticket_messages_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "support_tickets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "managed_database_events" ADD CONSTRAINT "managed_database_events_databaseId_fkey" FOREIGN KEY ("databaseId") REFERENCES "managed_databases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_VPSKeys" ADD CONSTRAINT "_VPSKeys_A_fkey" FOREIGN KEY ("A") REFERENCES "CloudDeployment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_VPSKeys" ADD CONSTRAINT "_VPSKeys_B_fkey" FOREIGN KEY ("B") REFERENCES "SSHKey"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- RenameIndex
ALTER INDEX "cloud_deployments_tenantId_status_idx" RENAME TO "CloudDeployment_tenantId_status_idx";

-- RenameIndex
ALTER INDEX "ip_block_list_ip_unique" RENAME TO "ip_block_list_ipAddress_key";

-- RenameIndex
ALTER INDEX "service_health_hourly_rollups_service_hour_uk" RENAME TO "service_health_hourly_rollups_serviceName_hourStart_key";


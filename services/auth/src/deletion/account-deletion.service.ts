import {
  Injectable,
  UnauthorizedException,
  ForbiddenException,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { Prisma, Role } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { withImpersonation, type AuditActor } from '../common/audit-impersonation';

@Injectable()
export class AccountDeletionService {
  private readonly logger = new Logger(AccountDeletionService.name);

  constructor(private prisma: PrismaService) {}


  async deleteAccount(userId: string, password: string, actor?: AuditActor) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, password: true, role: true },
    });
    if (!user) throw new NotFoundException('User not found');
    if (!(await bcrypt.compare(password || '', user.password))) {
      throw new UnauthorizedException('Password is incorrect');
    }

    await this.executeDeletion(userId);

    await this.prisma.auditLog.create({
      data: {
        action: 'USER_SELF_DELETED',
        userId,
        userEmail: user.email,
        resource: userId,
        details: withImpersonation(
          { reason: 'user_requested' },
          actor,
        ) as Prisma.InputJsonValue,
      },
    });

    return { ok: true };
  }

  async adminDelete(
    actorId: string,
    targetUserId: string,
    reason?: string,
    actor?: AuditActor,
  ) {
    if (!reason) {
      throw new BadRequestException('A reason is required for admin deletion');
    }

    const target = await this.prisma.user.findUnique({
      where: { id: targetUserId },
      select: { id: true, email: true, role: true },
    });
    if (!target) throw new NotFoundException('User not found');

    if (target.role === Role.SUPER_ADMIN) {
      throw new ForbiddenException('Cannot delete a SUPER_ADMIN account');
    }

    await this.executeDeletion(targetUserId);

    await this.prisma.auditLog.create({
      data: {
        action: 'USER_ADMIN_DELETED',
        adminId: actorId,
        userId: targetUserId,
        userEmail: target.email,
        resource: targetUserId,
        details: withImpersonation(
          { reason, targetRole: target.role },
          actor,
        ) as Prisma.InputJsonValue,
      },
    });


    return { ok: true };
  }

  private async executeDeletion(userId: string) {
    const now = new Date();
    const deletedId = crypto.randomUUID();
    const anonymizedEmail = `deleted_${deletedId}@deleted.invalid`;

    await this.prisma.$transaction(async (tx) => {
      // --- 1. Delete personal/operational data ---
      await tx.apiKey.deleteMany({ where: { userId } });
      await tx.appSecret.deleteMany({ where: { userId } });
      await tx.notification.deleteMany({ where: { userId } });
      await tx.userTenant.deleteMany({ where: { userId } });
      await tx.oAuthIdentity.deleteMany({ where: { userId } });
      await tx.passwordResetToken.deleteMany({ where: { userId } });
      await tx.agentInvite.deleteMany({ where: { createdBy: userId } });
      await tx.toSAcceptance.deleteMany({ where: { userId } });
      await tx.note.deleteMany({ where: { userId } });
      await tx.crmLead.deleteMany({ where: { userId } });
      await tx.crmContact.deleteMany({ where: { userId } });
      await tx.crmCompany.deleteMany({ where: { userId } });
      await tx.crmDeal.deleteMany({ where: { userId } });
      await tx.crmTask.deleteMany({ where: { userId } });
      await tx.crmActivity.deleteMany({ where: { userId } });
      await tx.message.deleteMany({ where: { userId } });
      await tx.conversation.deleteMany({ where: { userId } });
      await tx.whatsappContact.deleteMany({ where: { userId } });
      await tx.savedJob.deleteMany({ where: { userId } });
      await tx.pathEnrollment.deleteMany({ where: { userId } });
      await tx.certificationTracker.deleteMany({ where: { userId } });
      await tx.cV.deleteMany({ where: { userId } });
      await tx.bookTracker.deleteMany({ where: { userId } });
      await tx.conferenceInterest.deleteMany({ where: { userId } });
      await tx.blogPost.deleteMany({ where: { authorId: userId } });
      await tx.script.deleteMany({ where: { userId } });
      await tx.workflowTemplate.deleteMany({ where: { userId } });
      await tx.channel.deleteMany({ where: { userId } });
      await tx.knowledgeArticle.deleteMany({ where: { userId } });
      await tx.codeReview.deleteMany({ where: { userId } });
      await tx.calendarEvent.deleteMany({ where: { userId } });
      await tx.webhook.deleteMany({ where: { userId } });
      await tx.project.deleteMany({ where: { userId } });
      await tx.cloudPaymentMethod.deleteMany({ where: { userId } });
      await tx.vpsAlertRule.deleteMany({ where: { userId } });
      await tx.firewallRule.deleteMany({ where: { userId } });
      await tx.vPSSnapshot.deleteMany({ where: { userId } });
      await tx.ptrRecordRequest.deleteMany({ where: { userId } });
      await tx.usageMetric.deleteMany({ where: { userId } });
      await tx.apiUsageLog.deleteMany({ where: { userId } });
      await tx.vpsProvisionJob.deleteMany({ where: { userId } });
      await tx.referralPayoutRequest.deleteMany({ where: { userId } });
      await tx.document.deleteMany({ where: { authorId: userId } });
      await tx.documentVersion.deleteMany({ where: { createdBy: userId } });
      await tx.documentCollaborator.deleteMany({ where: { userId } });
      await tx.sSHKey.deleteMany({ where: { userId } });
      await tx.aPIRateLimit.deleteMany({ where: { userId } });
      await tx.webhookEndpoint.deleteMany({ where: { userId } });
      await tx.customImage.deleteMany({ where: { userId } });
      await tx.customImageShare.deleteMany({ where: { sharedBy: userId } });

      // --- 2. Handle VPS-related data ---
      const userDeployments = await tx.cloudDeployment.findMany({
        where: { userId },
        select: { id: true },
      });
      const vpsIds = userDeployments.map((d) => d.id);

      if (vpsIds.length) {
        await tx.cloudBackup.deleteMany({ where: { deploymentId: { in: vpsIds } } });
        await tx.vpsSecuritySettings.deleteMany({ where: { vpsId: { in: vpsIds } } });
        await tx.backupSchedule.deleteMany({ where: { vpsId: { in: vpsIds } } });
        await tx.abuseReport.deleteMany({ where: { targetVpsId: { in: vpsIds } } });
        await tx.vPSMigration.deleteMany({ where: { vpsId: { in: vpsIds } } });
        await tx.vpsHealthLog.deleteMany({ where: { vpsId: { in: vpsIds } } });
        await tx.vpsAlertNotification.deleteMany({ where: { vpsId: { in: vpsIds } } });
        await tx.vPSSnapshot.deleteMany({ where: { userId, vpsId: { in: vpsIds } } });
        await tx.usageMetric.deleteMany({ where: { vpsId: { in: vpsIds } } });
        await tx.apiUsageLog.deleteMany({ where: { vpsId: { in: vpsIds } } });
        await tx.domain.deleteMany({ where: { vpsId: { in: vpsIds } } });
        await tx.customImage.deleteMany({ where: { sourceVpsId: { in: vpsIds } } });
      }

      // --- 3. Handle organizations ---
      const userOrgs = await tx.organization.findMany({
        where: { ownerId: userId },
        select: { id: true },
      });
      if (userOrgs.length) {
        const orgIds = userOrgs.map((o) => o.id);
        await tx.organizationMember.deleteMany({ where: { organizationId: { in: orgIds } } });
        await tx.organizationInvitation.deleteMany({ where: { organizationId: { in: orgIds } } });
        await tx.organization.deleteMany({ where: { id: { in: orgIds } } });
      }

      // --- 4. Anonymize audit logs (retain for compliance) ---
      await tx.auditLog.updateMany({
        where: { userId },
        data: { userId: null, userEmail: null },
      });
      await tx.auditLog.updateMany({
        where: { adminId: userId },
        data: { adminId: null },
      });

      // --- 5. Mark VPS as TERMINATED and anonymize ---
      await tx.cloudDeployment.updateMany(
        {
          where: { userId },
          data: {
            status: 'TERMINATED',
            name: 'Deleted',
            subdomain: null,
            ipv4Address: null,
            rootPasswordHash: null,
            controlPanelUser: null,
            controlPanelPassword: null,
            envVars: null,
            healthCheck: null,
            webhookUrl: null,
            terminatedAt: now,
            lastDeployedAt: null,
            provisionedAt: null,
            suspendedAt: null,
            networkSuspendedAt: null,
            abuseStatus: null,
            abuseFlags: null,
            apps: [],
            installedApps: null,
            controlPanel: null,
            controlPanelStatus: null,
            controlPanelUrl: null,
            controlPanelInstalledAt: null,
          } as Prisma.CloudDeploymentUpdateManyMutationInput,
        },
      );

      // --- 7. Soft-delete the user ---
      await tx.user.update({
        where: { id: userId },
        data: {
          email: anonymizedEmail,
          name: 'Deleted User',
          password: '',
          phone: null,
          avatar: null,
          githubId: null,
          googleId: null,
          twoFactorSecret: null,
          twoFactorEnabled: false,
          recoveryCodes: [],
          webhookUrl: null,
          themePreference: null,
          notificationPrefs: null,
          emailVerified: false,
          emailVerifyTokenHash: null,
          emailVerifyExpires: null,
          isActive: false,
          mustChangePassword: false,
          onboardingCompleted: false,
          onboardingSkipped: false,
          overrideLimits: null,
          referralPayoutMethod: null,
          creditBalance: 0,
          updatedAt: now,
        },
      });
    });
  }
}

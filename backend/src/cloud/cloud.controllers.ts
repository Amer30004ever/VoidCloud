import {
  Body, Controller, Delete, Get, Param, Post, Put, Query, Req, Res, UseGuards, Headers,
  ForbiddenException, BadRequestException, HttpCode, RawBodyRequest,
} from '@nestjs/common';
import { ApiTags, ApiSecurity } from '@nestjs/swagger';
import { Response } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { Role } from '@prisma/client';
import { CloudPlansService } from './cloud-plans.service';
import { CloudDeploymentsService } from './cloud-deployments.service';
import { CloudBillingService } from './cloud-billing.service';
import { CloudAdminService } from './cloud-admin.service';
import { StripeService } from './billing/stripe.service';
import { FawryService } from './billing/fawry.service';
import { InstapayService } from './billing/instapay.service';
import { TwoFactorService } from './auth/two-factor.service';
import { CloudAccountService } from './auth/account.service';
import { CloudAuditService } from './audit/cloud-audit.service';
import { ActivityService } from './audit/activity.service';
import { CloudBackupService } from './backup/cloud-backup.service';
import { BackupServiceV2 } from './backup/backup-v2.service';
import { SSHKeyService } from './ssh/ssh-key.service';
import { VPSResizeService } from './vps/vps-resize.service';
import { FirewallService, type FirewallRuleInput } from './firewall/firewall.service';
import { OrganizationService } from './organization/organization.service';
import { ImageService } from './images/image.service';
import { DNSService, type CreateDNSRecordDto } from './dns/dns.service';
import { AnalyticsService } from './analytics/analytics.service';
import type { OrgRole } from '@prisma/client';
import { CloudEmailService } from './notifications/email.service';
import { MailerService } from '../mailer/mailer.service';



interface AuthedRequest { user: { id: string; role: Role; email: string; impersonatedBy?: string; impersonatorEmail?: string } }

const ADMIN_ROLES = [Role.ADMIN, Role.SUPER_ADMIN] as const;

function extractIp(req: any): string | undefined {
  const fwd = req?.headers?.['x-forwarded-for'];
  if (typeof fwd === 'string' && fwd.length) return fwd.split(',')[0].trim();
  return req?.ip || req?.socket?.remoteAddress || undefined;
}
function extractUA(req: any): string | undefined {
  return req?.headers?.['user-agent'] || undefined;
}


@ApiTags('Cloud / Plans')
@Controller('cloud/plans')
export class CloudPlansController {
  constructor(private plans: CloudPlansService) {}

  @Public()
  @Get()
  list() { return this.plans.list(true); }

  @ApiSecurity('bearer')
  @UseGuards(JwtAuthGuard)
  @Get(':id')
  get(@Param('id') id: string) { return this.plans.get(id); }
}

@ApiTags('Cloud / Templates')
@Controller('cloud/templates')
export class CloudTemplatesController {
  @Public()
  @Get()
  list() {
    // OS templates available for new VPS instances. Keep in sync with
    // backend/src/cloud/proxmox/template-manifest.ts.
    return [
      { id: 'debian-12', label: 'Debian 12', proxmoxId: 9101, description: 'Lightweight VPS for starter plans', hasDocker: false },
      { id: 'ubuntu-22.04', label: 'Ubuntu 22.04', proxmoxId: 9102, description: 'Full-featured VPS with Docker preinstalled', hasDocker: true },
      { id: 'alpine', label: 'Alpine Linux', proxmoxId: 9100, description: 'Ultra-lightweight for free tier', hasDocker: false },
    ];
  }
}

@ApiTags('Cloud / Deployments')
@ApiSecurity('bearer')
@UseGuards(JwtAuthGuard)
@Controller('cloud/deployments')
export class CloudDeploymentsController {
  constructor(private deployments: CloudDeploymentsService) {}

  @Get()
  list(@Req() req: AuthedRequest) { return this.deployments.list(req.user.id); }

  @Post()
  create(@Req() req: AuthedRequest, @Body() body: any) {
    return this.deployments.create(req.user.id, body);
  }

  @Get('usage/me')
  usage(@Req() req: AuthedRequest) { return this.deployments.usage(req.user.id); }

  @Get(':id')
  get(@Req() req: AuthedRequest, @Param('id') id: string) {
    return this.deployments.get(req.user.id, id);
  }

  @Put(':id')
  update(@Req() req: AuthedRequest, @Param('id') id: string, @Body() body: any) {
    return this.deployments.update(req.user.id, id, body);
  }

  @Delete(':id')
  remove(@Req() req: AuthedRequest, @Param('id') id: string) {
    return this.deployments.remove(req.user.id, id);
  }

  @Post(':id/restart')
  restart(@Req() req: AuthedRequest, @Param('id') id: string) {
    return this.deployments.restart(req.user.id, id);
  }
  @Post(':id/start')
  start(@Req() req: AuthedRequest, @Param('id') id: string) { return this.deployments.start(req.user.id, id); }
  @Post(':id/stop')
  stop(@Req() req: AuthedRequest, @Param('id') id: string) { return this.deployments.stop(req.user.id, id); }
  @Post(':id/reinstall')
  reinstall(@Req() req: AuthedRequest, @Param('id') id: string) { return this.deployments.reinstall(req.user.id, id); }
  @Post(':id/reset-root-password')
  resetRootPw(@Req() req: AuthedRequest, @Param('id') id: string) { return this.deployments.resetRootPassword(req.user.id, id); }
  @Put(':id/resize')
  resize(@Req() req: AuthedRequest, @Param('id') id: string, @Body() body: { cpu?: number; memory?: number; storage?: number }) {
    return this.deployments.resize(req.user.id, id, body);
  }

  @Get(':id/metrics')
  metrics(@Req() req: AuthedRequest, @Param('id') id: string) {
    return this.deployments.metrics(req.user.id, id);
  }

  @Get(':id/usage')
  usageOne(@Req() req: AuthedRequest, @Param('id') id: string) {
    return this.deployments.vpsUsage(req.user.id, id);
  }

  @Get(':id/logs')
  async logs(@Req() req: AuthedRequest, @Param('id') id: string) {
    return this.deployments.tailLogs(req.user.id, id);
  }

  @Get(':id/logs/stream')
  async logsStream(@Req() req: any, @Param('id') id: string, @Res() res: Response) {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();
    const stop = await this.deployments.streamLogs(req.user.id, id, (line) => {
      res.write(`data: ${JSON.stringify({ line })}\n\n`);
    });
    const hb = setInterval(() => res.write(': ping\n\n'), 25000);
    req.on('close', () => { clearInterval(hb); stop(); });
  }
}

@ApiTags('Cloud / Billing')
@ApiSecurity('bearer')
@UseGuards(JwtAuthGuard)
@Controller('cloud/billing')
export class CloudBillingController {
  constructor(private billing: CloudBillingService) {}

  @Get('current')
  current(@Req() req: AuthedRequest) { return this.billing.currentSubscription(req.user.id); }

  @Post('subscribe')
  subscribe(@Req() req: AuthedRequest, @Body() body: { planId: string; provider: 'stripe'|'fawry'|'instapay'|'cash'; customerPhone?: string; payerInstapayId?: string }) {
    return this.billing.subscribe(req.user.id, body);
  }

  @Post('cancel')
  cancel(@Req() req: AuthedRequest) { return this.billing.cancel(req.user.id); }

  @Get('invoices')
  invoices(@Req() req: AuthedRequest) { return this.billing.invoices(req.user.id); }

  @Get('invoices/:id')
  invoice(@Req() req: AuthedRequest, @Param('id') id: string) {
    return this.billing.getInvoice(req.user.id, id);
  }

  @Get('payment-methods')
  pmList(@Req() req: AuthedRequest) { return this.billing.paymentMethods(req.user.id); }

  @Post('payment-methods')
  pmAdd(@Req() req: AuthedRequest, @Body() body: any) {
    return this.billing.addPaymentMethod(req.user.id, body.type, body.providerId, body.label, body.last4);
  }

  @Delete('payment-methods/:id')
  pmRemove(@Req() req: AuthedRequest, @Param('id') id: string) {
    return this.billing.removePaymentMethod(req.user.id, id);
  }
}

@ApiTags('Cloud / Webhooks')
@Controller('cloud/webhooks')
export class CloudWebhooksController {
  constructor(
    private billing: CloudBillingService,
    private stripeSvc: StripeService,
    private fawrySvc: FawryService,
  ) {}

  @Public()
  @Post('stripe')
  @HttpCode(200)
  async stripe(@Req() req: RawBodyRequest<any>, @Headers('stripe-signature') sig: string, @Body() body: any) {
    if (this.stripeSvc.isLive()) {
      if (!sig || !req.rawBody) throw new BadRequestException('Missing signature/body');
      const event = this.stripeSvc.verifyWebhook(req.rawBody, sig);
      if (event.type === 'checkout.session.completed') {
        const invoiceId = event.data.object?.metadata?.invoiceId;
        if (invoiceId) await this.billing.confirmPayment(invoiceId);
      }
      return { received: true };
    }
    if (body?.type === 'checkout.session.completed' && body?.data?.invoiceId) {
      return this.billing.confirmPayment(body.data.invoiceId);
    }
    return { received: true };
  }

  @Public()
  @Post('fawry')
  @HttpCode(200)
  async fawry(@Body() body: any, @Headers('x-fawry-signature') sig?: string) {
    if (process.env.FAWRY_SECURITY_KEY && !this.fawrySvc.verifyWebhook(body, sig)) {
      throw new BadRequestException('Invalid signature');
    }
    const invoiceId = body?.merchantRefNumber?.replace(/^amercloud_/, '') || body?.invoiceId;
    if (invoiceId && (body?.orderStatus === 'PAID' || body?.status === 'PAID')) {
      return this.billing.confirmPayment(invoiceId);
    }
    return { received: true };
  }

  @Public()
  @Post('instapay')
  @HttpCode(200)
  instapay(@Body() body: any) {
    const invoiceId = body?.reference_id?.replace(/^AMP_/, '') || body?.invoiceId;
    if (invoiceId && (body?.status === 'PAID' || body?.status === 'success')) {
      return this.billing.confirmPayment(invoiceId);
    }
    return { received: true };
  }
}

@ApiTags('Cloud / 2FA')
@ApiSecurity('bearer')
@UseGuards(JwtAuthGuard)
@Controller('cloud/auth/2fa')
export class CloudTwoFactorController {
  constructor(private tfa: TwoFactorService) {}
  @Get('status') status(@Req() req: AuthedRequest) { return this.tfa.status(req.user.id); }
  @Post('enable')  enable(@Req() req: AuthedRequest) { return this.tfa.beginEnable(req.user.id, req.user.email); }
  @Post('verify')  verify(@Req() req: AuthedRequest, @Body() b: { token: string }) { return this.tfa.verifyAndActivate(req.user.id, b.token); }
  @Post('recovery-codes/regenerate')
  regen(@Req() req: AuthedRequest) { return this.tfa.regenerateRecoveryCodes(req.user.id); }
  @Post('disable')
  disable(@Req() req: AuthedRequest, @Body() b: { password?: string; recoveryCode?: string }) {
    return this.tfa.disableWithProof(req.user.id, b.password, b.recoveryCode);
  }
}

@ApiTags('Cloud / Account')
@Controller('cloud/account')
export class CloudAccountController {
  constructor(private account: CloudAccountService, private activity: ActivityService) {}

  @ApiSecurity('bearer')
  @UseGuards(JwtAuthGuard)
  @Get('activity')
  myActivity(
    @Req() req: AuthedRequest,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.activity.listForUser(req.user.id, {
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 50,
    });
  }

  @ApiSecurity('bearer')
  @UseGuards(JwtAuthGuard)
  @Post('email/request-change')
  @HttpCode(200)
  requestEmail(@Req() req: AuthedRequest, @Body() b: { currentPassword: string; newEmail: string }) {
    return this.account.requestEmailChange(req.user.id, b.currentPassword, b.newEmail);
  }

  @Public()
  @Post('email/confirm')
  @HttpCode(200)
  confirmEmail(@Body() b: { token: string }) {
    return this.account.confirmEmailChange(b.token);
  }

  @ApiSecurity('bearer')
  @UseGuards(JwtAuthGuard)
  @Post('password/change')
  @HttpCode(200)
  changePassword(@Req() req: AuthedRequest, @Body() b: { currentPassword: string; newPassword: string }) {
    return this.account.changePassword(req.user.id, b.currentPassword, b.newPassword);
  }

  @ApiSecurity('bearer')
  @UseGuards(JwtAuthGuard)
  @Get('profile')
  getProfile(@Req() req: AuthedRequest) { return this.account.getProfile(req.user.id); }

  @ApiSecurity('bearer')
  @UseGuards(JwtAuthGuard)
  @Put('profile')
  updateProfile(@Req() req: AuthedRequest, @Body() b: { displayName?: string; phone?: string | null }) {
    return this.account.updateProfile(req.user.id, b);
  }

  @ApiSecurity('bearer')
  @UseGuards(JwtAuthGuard)
  @Delete('')
  @HttpCode(200)
  deleteAccount(@Req() req: AuthedRequest, @Body() b: { password: string }) {
    return this.account.deleteAccount(req.user.id, b.password);
  }

  @ApiSecurity('bearer')
  @UseGuards(JwtAuthGuard)
  @Get('notifications/preferences')
  getNotifPrefs(@Req() req: AuthedRequest) { return this.account.getNotificationPreferences(req.user.id); }

  @ApiSecurity('bearer')
  @UseGuards(JwtAuthGuard)
  @Put('notifications/preferences')
  setNotifPrefs(@Req() req: AuthedRequest, @Body() b: Record<string, boolean>) {
    return this.account.updateNotificationPreferences(req.user.id, b);
  }
}


@ApiTags('Cloud / Backups')
@ApiSecurity('bearer')
@UseGuards(JwtAuthGuard)
@Controller('cloud')
export class CloudBackupController {
  constructor(
    private backups: CloudBackupService,
    private backupsV2: BackupServiceV2,
    private deployments: CloudDeploymentsService,
  ) {}

  // ---- VPS-scoped ----
  @Get('vps/:id/backups')
  async listForVps(@Req() req: AuthedRequest, @Param('id') id: string) {
    await this.deployments.get(req.user.id, id);
    return this.backupsV2.listBackups(id);
  }

  @Post('vps/:id/backups')
  async create(@Req() req: AuthedRequest, @Param('id') id: string, @Body() body: { name?: string }) {
    return this.backupsV2.createBackup(id, req.user.id, body?.name);
  }

  @Post('vps/:id/backups/manual')
  async createManual(@Req() req: AuthedRequest, @Param('id') id: string, @Body() body: { name?: string }) {
    return this.backupsV2.createBackup(id, req.user.id, body?.name);
  }

  @Get('vps/:id/backup-schedule')
  async getSchedule(@Req() req: AuthedRequest, @Param('id') id: string) {
    await this.deployments.get(req.user.id, id);
    return (await this.backupsV2.getSchedule(id)) ?? { vpsId: id, enabled: false, frequency: 'DAILY', retention: 7, hour: 2 };
  }

  @Put('vps/:id/backup-schedule')
  async updateSchedule(
    @Req() req: AuthedRequest,
    @Param('id') id: string,
    @Body() body: { enabled?: boolean; frequency?: 'DAILY' | 'WEEKLY' | 'MONTHLY'; retention?: number; hour?: number; dayOfWeek?: number; dayOfMonth?: number },
  ) {
    return this.backupsV2.updateSchedule(id, req.user.id, body);
  }

  // ---- Backup-scoped ----
  @Get('backups')
  async listAll(
    @Req() req: AuthedRequest,
    @Query('vpsId') vpsId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.backupsV2.listAllForUser(req.user.id, {
      vpsId,
      from: from ? new Date(from) : undefined,
      to: to ? new Date(to) : undefined,
    });
  }

  @Post('backups/:id/restore')
  restore(@Req() req: AuthedRequest, @Param('id') id: string, @Body() body: { targetVpsId?: string }) {
    return this.backupsV2.restoreBackup(id, req.user.id, body?.targetVpsId);
  }

  @Delete('backups/:id')
  remove(@Req() req: AuthedRequest, @Param('id') id: string) {
    return this.backupsV2.deleteBackup(id, req.user.id);
  }

  @Post('backups/batch-delete')
  removeBatch(@Req() req: AuthedRequest, @Body() body: { ids: string[] }) {
    return this.backupsV2.deleteMany(body?.ids ?? [], req.user.id);
  }

  // ---- Legacy compatibility (old paths) ----
  @Get('deployments/:id/backups')
  async legacyList(@Req() req: AuthedRequest, @Param('id') id: string) {
    await this.deployments.get(req.user.id, id);
    return this.backups.list(id);
  }
  @Post('deployments/:id/backups')
  async legacyCreate(@Req() req: AuthedRequest, @Param('id') id: string) {
    return this.backupsV2.createBackup(id, req.user.id);
  }
  @Post('deployments/:id/backups/restore/:backupId')
  legacyRestore(@Req() req: AuthedRequest, @Param('backupId') backupId: string) {
    return this.backupsV2.restoreBackup(backupId, req.user.id);
  }
}


@ApiTags('Cloud / SSH Keys')
@ApiSecurity('bearer')
@UseGuards(JwtAuthGuard)
@Controller('cloud')
export class CloudSshKeyController {
  constructor(private ssh: SSHKeyService) {}

  @Get('ssh-keys')
  list(@Req() req: AuthedRequest) { return this.ssh.listKeys(req.user.id); }

  @Post('ssh-keys')
  add(@Req() req: AuthedRequest, @Body() body: { name: string; publicKey: string }) {
    return this.ssh.addKey(req.user.id, body?.name, body?.publicKey);
  }

  @Delete('ssh-keys/:id')
  remove(@Req() req: AuthedRequest, @Param('id') id: string) {
    return this.ssh.deleteKey(id, req.user.id);
  }

  @Get('vps/:id/ssh-keys')
  listForVps(@Req() req: AuthedRequest, @Param('id') id: string) {
    return this.ssh.getKeysForVPS(id, req.user.id);
  }

  @Post('vps/:id/ssh-keys/:keyId')
  attach(@Req() req: AuthedRequest, @Param('id') id: string, @Param('keyId') keyId: string) {
    return this.ssh.addKeyToVPS(keyId, id, req.user.id);
  }

  @Delete('vps/:id/ssh-keys/:keyId')
  detach(@Req() req: AuthedRequest, @Param('id') id: string, @Param('keyId') keyId: string) {
    return this.ssh.removeKeyFromVPS(keyId, id, req.user.id);
  }
}


@ApiTags('Cloud / VPS Resize')
@ApiSecurity('bearer')
@UseGuards(JwtAuthGuard)
@Controller('cloud/vps')
export class CloudVpsResizeController {
  constructor(private resize: VPSResizeService) {}

  @Get(':id/upgrades')
  upgrades(@Req() req: AuthedRequest, @Param('id') id: string) {
    return this.resize.getAvailableUpgrades(id, req.user.id);
  }

  @Get(':id/resize/price')
  price(@Req() req: AuthedRequest, @Param('id') id: string, @Query('newPlanId') newPlanId: string) {
    if (!newPlanId) throw new BadRequestException('newPlanId required');
    return this.resize.calculateProratedPrice(id, req.user.id, newPlanId);
  }

  @Get(':id/resize/live-supported')
  live(@Req() req: AuthedRequest, @Param('id') id: string) {
    return this.resize.liveResizeSupported(id, req.user.id);
  }

  @Post(':id/resize')
  doResize(@Req() req: AuthedRequest, @Param('id') id: string, @Body() body: { newPlanId: string; confirmPrice: boolean }) {
    return this.resize.resizeVPS(id, body?.newPlanId, req.user.id, !!body?.confirmPrice);
  }
}


@ApiTags('Cloud / Firewall')
@ApiSecurity('bearer')
@UseGuards(JwtAuthGuard)
@Controller('cloud')
export class CloudFirewallController {
  constructor(private fw: FirewallService) {}

  @Get('vps/:id/firewall')
  list(@Req() req: AuthedRequest, @Param('id') id: string) {
    return this.fw.getRules(id, req.user.id);
  }

  @Get('vps/:id/firewall/defaults')
  defaults() { return this.fw.getDefaultRules(); }

  @Post('vps/:id/firewall')
  create(@Req() req: AuthedRequest, @Param('id') id: string, @Body() body: FirewallRuleInput) {
    return this.fw.createRule(id, req.user.id, body);
  }

  @Put('firewall/:id')
  update(@Req() req: AuthedRequest, @Param('id') id: string, @Body() body: Partial<FirewallRuleInput>) {
    return this.fw.updateRule(id, req.user.id, body);
  }

  @Delete('firewall/:id')
  remove(@Req() req: AuthedRequest, @Param('id') id: string) {
    return this.fw.deleteRule(id, req.user.id);
  }

  @Post('firewall/:id/toggle')
  toggle(@Req() req: AuthedRequest, @Param('id') id: string) {
    return this.fw.toggleRule(id, req.user.id);
  }

  @Post('vps/:id/firewall/reorder')
  reorder(@Req() req: AuthedRequest, @Param('id') id: string, @Body() body: { ruleIds: string[] }) {
    return this.fw.reorderRules(id, req.user.id, body?.ruleIds ?? []);
  }

  @Post('vps/:id/firewall/reset')
  reset(@Req() req: AuthedRequest, @Param('id') id: string) {
    return this.fw.resetToDefault(id, req.user.id);
}


@ApiTags('Cloud / Organizations')
@ApiSecurity('bearer')
@UseGuards(JwtAuthGuard)
@Controller('cloud/orgs')
export class CloudOrganizationController {
  constructor(private orgs: OrganizationService) {}

  @Get()
  list(@Req() req: AuthedRequest) { return this.orgs.listForUser(req.user.id); }

  @Post()
  create(@Req() req: AuthedRequest, @Body() body: { name: string }) {
    return this.orgs.create(req.user.id, body?.name);
  }

  @Get('invitations')
  myInvitations(@Req() req: AuthedRequest) { return this.orgs.listMyInvitations(req.user.id); }

  @Post('invitations/:id/accept')
  accept(@Req() req: AuthedRequest, @Param('id') id: string) {
    return this.orgs.acceptInvitation(id, req.user.id);
  }

  @Delete('invitations/:id')
  revoke(@Req() req: AuthedRequest, @Param('id') id: string) {
    return this.orgs.revokeInvitation(id, req.user.id);
  }

  @Get(':id')
  get(@Req() req: AuthedRequest, @Param('id') id: string) {
    return this.orgs.get(id, req.user.id);
  }

  @Put(':id')
  update(@Req() req: AuthedRequest, @Param('id') id: string, @Body() body: { name?: string; avatar?: string | null }) {
    return this.orgs.update(id, req.user.id, body);
  }

  @Delete(':id')
  remove(@Req() req: AuthedRequest, @Param('id') id: string) {
    return this.orgs.remove(id, req.user.id);
  }

  @Get(':id/members')
  members(@Req() req: AuthedRequest, @Param('id') id: string) {
    return this.orgs.listMembers(id, req.user.id);
  }

  @Post(':id/members/invite')
  invite(@Req() req: AuthedRequest, @Param('id') id: string, @Body() body: { email: string; role?: OrgRole }) {
    return this.orgs.invite(id, req.user.id, body?.email, (body?.role ?? 'MEMBER') as OrgRole);
  }

  @Delete(':id/members/:userId')
  removeMember(@Req() req: AuthedRequest, @Param('id') id: string, @Param('userId') userId: string) {
    return this.orgs.removeMember(id, req.user.id, userId);
  }

  @Put(':id/members/:userId/role')
  setRole(@Req() req: AuthedRequest, @Param('id') id: string, @Param('userId') userId: string, @Body() body: { role: OrgRole }) {
    return this.orgs.updateMemberRole(id, req.user.id, userId, body.role);
  }
}

@ApiTags('Cloud / VPS Transfer')
@ApiSecurity('bearer')
@UseGuards(JwtAuthGuard)
@Controller('cloud/vps')
export class CloudVpsTransferController {
  constructor(private orgs: OrganizationService) {}
  @Post(':id/transfer')
  transfer(@Req() req: AuthedRequest, @Param('id') id: string, @Body() body: { organizationId: string | null }) {
    return this.orgs.transferVps(id, req.user.id, body?.organizationId ?? null);
}


@ApiTags('Cloud / Images')
@ApiSecurity('bearer')
@UseGuards(JwtAuthGuard)
@Controller('cloud')
export class CloudImageController {
  constructor(private images: ImageService) {}

  @Get('images')
  list(@Req() req: AuthedRequest) { return this.images.listUserImages(req.user.id); }

  @Get('marketplace')
  marketplace() { return this.images.listMarketplaceImages(); }

  @Post('images/snapshot/:vpsId')
  snapshot(@Req() req: AuthedRequest, @Param('vpsId') vpsId: string, @Body() body: { name: string; description?: string }) {
    return this.images.createSnapshot(vpsId, req.user.id, body?.name, body?.description);
  }

  @Post('images/upload')
  upload(@Req() req: AuthedRequest, @Body() body: { name: string; sizeMB: number; storageUrl: string; description?: string }) {
    return this.images.createFromUpload(req.user.id, body?.name, body?.sizeMB, body?.storageUrl, body?.description);
  }

  @Delete('images/:id')
  remove(@Req() req: AuthedRequest, @Param('id') id: string) {
    return this.images.deleteImage(id, req.user.id);
  }

  @Post('images/:id/deploy')
  deploy(@Req() req: AuthedRequest, @Param('id') id: string, @Body() body: { vpsName: string }) {
    return this.images.deployFromImage(id, req.user.id, body?.vpsName);
  }

  @Post('marketplace/:id/deploy')
  deployFromMarketplace(@Req() req: AuthedRequest, @Param('id') id: string, @Body() body: { vpsName: string }) {
    return this.images.deployFromImage(id, req.user.id, body?.vpsName);
  }

  @Post('images/:id/share')
  share(@Req() req: AuthedRequest, @Param('id') id: string, @Body() body: { email: string }) {
    if (!body?.email) throw new BadRequestException('email required');
    return this.images.shareImage(id, req.user.id, body.email);
  }

  @Post('images/:id/publish')
  publish(@Req() req: AuthedRequest, @Param('id') id: string, @Body() body: { isPublic: boolean }) {
    return this.images.makePublic(id, req.user.id, !!body?.isPublic);
}


@ApiTags('Cloud / Domains')
@ApiSecurity('bearer')
@UseGuards(JwtAuthGuard)
@Controller('cloud')
export class CloudDomainController {
  constructor(private dns: DNSService) {}

  @Get('vps/:id/domains')
  list(@Req() req: AuthedRequest, @Param('id') id: string) {
    return this.dns.listForVps(id, req.user.id);
  }

  @Post('vps/:id/domains')
  add(@Req() req: AuthedRequest, @Param('id') id: string, @Body() body: { domain: string; autoSSL?: boolean }) {
    return this.dns.addDomain(id, req.user.id, body?.domain, !!body?.autoSSL);
  }

  @Get('domains/:id/verify')
  verifyInfo(@Req() req: AuthedRequest, @Param('id') id: string) {
    return this.dns.getVerificationInstructions(id, req.user.id);
  }

  @Post('domains/:id/verify')
  verify(@Req() req: AuthedRequest, @Param('id') id: string) {
    return this.dns.verifyDomain(id, req.user.id);
  }

  @Post('domains/:id/ssl')
  ssl(@Req() req: AuthedRequest, @Param('id') id: string) {
    return this.dns.requestSSL(id, req.user.id);
  }

  @Delete('domains/:id')
  remove(@Req() req: AuthedRequest, @Param('id') id: string) {
    return this.dns.deleteDomain(id, req.user.id);
  }

  @Get('domains/:id/dns')
  records(@Req() req: AuthedRequest, @Param('id') id: string) {
    return this.dns.getDNSRecords(id, req.user.id);
  }

  @Post('domains/:id/dns')
  addRecord(@Req() req: AuthedRequest, @Param('id') id: string, @Body() body: CreateDNSRecordDto) {
    return this.dns.addDNSRecord(id, req.user.id, body);
  }

  @Delete('dns/:id')
  removeRecord(@Req() req: AuthedRequest, @Param('id') id: string) {
    return this.dns.deleteDNSRecord(id, req.user.id);
}


@ApiTags('Cloud / Analytics')
@ApiSecurity('bearer')
@UseGuards(JwtAuthGuard)
@Controller('cloud/analytics')
export class CloudAnalyticsController {
  constructor(private analytics: AnalyticsService) {}

  @Get('vps/:id/usage')
  usage(@Req() req: AuthedRequest, @Param('id') id: string, @Query('hours') hours?: string) {
    return this.analytics.getVPSUsage(id, req.user.id, hours ? Math.max(1, Math.min(720, parseInt(hours, 10))) : 24);
  }

  @Get('costs')
  costs(@Req() req: AuthedRequest, @Query('months') months?: string) {
    return this.analytics.getCostBreakdown(req.user.id, months ? Math.max(1, Math.min(12, parseInt(months, 10))) : 3);
  }

  @Get('trends')
  trends(@Req() req: AuthedRequest, @Query('days') days?: string) {
    return this.analytics.getResourceTrends(req.user.id, days ? Math.max(1, Math.min(365, parseInt(days, 10))) : 30);
  }

  @Get('export/csv')
  async exportCsv(@Req() req: AuthedRequest, @Res() res: Response) {
    const csv = await this.analytics.exportCSV(req.user.id);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="amercloud-analytics-${Date.now()}.csv"`);
    res.send(csv);
  }
}
















@ApiTags('Cloud / Admin')
@ApiSecurity('bearer')
@UseGuards(JwtAuthGuard)
@Roles(...ADMIN_ROLES)
@Controller('cloud/admin')
export class CloudAdminController {
  constructor(
    private admin: CloudAdminService,
    private plans: CloudPlansService,
    private billing: CloudBillingService,
    private audit: CloudAuditService,
    private activity: ActivityService,
    private tfa: TwoFactorService,
    private mailer: MailerService,
    private deployments: CloudDeploymentsService,
  ) {}

  @Get('activity')
  listActivity(
    @Query('userId') userId?: string,
    @Query('action') action?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('ipAddress') ipAddress?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.activity.listAll({
      userId, action, from, to, ipAddress,
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 100,
    });
  }

  @Get('activity/export')
  async exportActivity(
    @Res() res: Response,
    @Query('userId') userId?: string,
    @Query('action') action?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    const csv = await this.activity.exportCsv({ userId, action, from, to });
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="amercloud-activity-${new Date().toISOString().slice(0,10)}.csv"`);
    res.send(csv);
  }

  @Put('users/:id/role')
  @Roles(Role.SUPER_ADMIN)
  async changeRole(@Req() req: any, @Param('id') id: string, @Body() body: { role: Role }) {
    if (!['USER', 'ADMIN', 'SUPER_ADMIN'].includes(body.role)) {
      throw new BadRequestException('Invalid role');
    }
    const result = await this.admin.changeRole(req.user.id, id, body.role);
    await this.activity.log({
      userId: id, adminId: req.user.id, action: 'ROLE_CHANGE',
      details: { from: result.previousRole, to: result.role },
      ipAddress: extractIp(req), userAgent: extractUA(req),
    });
    return result;
  }

  @Post('impersonate/stop')
  @HttpCode(200)
  async stopImpersonate(@Req() req: any) {
    if (req.user.impersonatedBy) {
      await this.activity.log({
        userId: req.user.id, adminId: req.user.impersonatedBy, action: 'IMPERSONATE_END',
        ipAddress: extractIp(req), userAgent: extractUA(req),
      });
    }
    return { ok: true };
  }

  @Get('smtp/status') smtpStatus() { return this.mailer.status(); }
  @Post('smtp/verify') smtpVerify() { return this.mailer.verify(); }
  @Post('smtp/test')
  smtpTest(@Req() req: AuthedRequest, @Body() b: { to?: string }) {
    return this.mailer.sendTest((b?.to || req.user.email).trim());
  }

  @Get('audit-logs')
  auditLogs(@Query('targetId') targetId?: string, @Query('action') action?: string) {
    return this.audit.list({ targetId, action });
  }


  @Get('stats') stats() { return this.admin.stats(); }
  @Get('stats/real') realStats() { return this.admin.realStats(); }

  @Get('users')
  users(@Query('q') q?: string, @Query('planId') planId?: string, @Query('status') status?: string) {
    return this.admin.listUsers(q, planId, status);
  }
  @Post('users')
  createUser(@Body() body: { email: string; name: string; password: string; role?: Role; planId?: string | null }) {
    return this.admin.createUser(body);
  }
  @Delete('users/:id')
  deleteUser(@Param('id') id: string) { return this.admin.deleteUser(id); }
  @Post('users/:id/reset-password')
  resetPw(@Param('id') id: string) { return this.admin.resetUserPassword(id); }
  @Post('reset-admin-password')
  @Roles(Role.SUPER_ADMIN)
  resetAdminPassword(@Body() body: { newPassword: string; email?: string }) {
    return this.admin.resetAdminPassword(body.newPassword, body.email);
  }
  @Post('users/:id/reset-2fa')
  reset2fa(@Param('id') id: string) { return this.tfa.adminReset(id); }
  @Post('users/:id/impersonate')
  async impersonate(@Req() req: any, @Param('id') id: string) {
    const result = await this.admin.impersonate(req.user.id, id);
    await this.activity.log({
      userId: id, adminId: req.user.id, action: 'IMPERSONATE_START',
      ipAddress: extractIp(req), userAgent: extractUA(req),
    });
    return result;
  }
  @Put('users/:id/plan')
  setPlan(@Param('id') id: string, @Body() body: { planId: string | null }) {
    return this.admin.setUserPlan(id, body.planId);
  }
  @Put('users/:id/suspend')
  suspend(@Param('id') id: string, @Body() body: { reason: string }) {
    return this.admin.suspend(id, body.reason ?? 'Manual suspension');
  }
  @Put('users/:id/activate')
  activate(@Param('id') id: string) { return this.admin.activate(id); }
  @Put('users/:id/override-limits')
  override(@Param('id') id: string, @Body() body: Record<string, number>) {
    return this.admin.overrideLimits(id, body);
  }
  @Put('users/:id/extend-trial')
  extendTrial(@Param('id') id: string, @Body() body: { days: number }) {
    return this.admin.extendTrial(id, body.days ?? 7);
  }

  @Get('plans') plansList() { return this.plans.list(false); }
  @Post('plans') planCreate(@Body() body: any) { return this.plans.create(body); }
  @Put('plans/:id') planUpdate(@Param('id') id: string, @Body() body: any) { return this.plans.update(id, body); }
  @Delete('plans/:id') planDelete(@Param('id') id: string) { return this.plans.remove(id); }

  @Get('billing/transactions') transactions() { return this.admin.transactions(); }
  @Get('billing/transactions.csv')
  async transactionsCsv(@Res() res: Response) {
    const csv = await this.admin.transactionsCSV();
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="amercloud-transactions-${new Date().toISOString().slice(0,10)}.csv"`);
    res.send(csv);
  }
  @Post('billing/refund')
  refund(@Body() body: { invoiceId: string; partial?: number }) {
    return this.admin.refund(body.invoiceId, body.partial);
  }
  @Post('billing/confirm')
  confirm(@Body() body: { invoiceId: string }) {
    return this.billing.confirmPayment(body.invoiceId);
  }
  @Post('billing/reject')
  reject(@Body() body: { invoiceId: string; reason: string }) {
    return this.billing.rejectPayment(body.invoiceId, body.reason ?? 'Rejected by admin');
  }

  @Get('vps') allVps() { return this.deployments.listAll(); }
  @Get('announcements') announcements() { return this.admin.announcements(); }
  @Post('announcements')
  broadcast(@Body() body: { title: string; body: string; severity?: string; audience?: string }) {
    return this.admin.broadcast(body.title, body.body, body.severity, body.audience);
  }
}

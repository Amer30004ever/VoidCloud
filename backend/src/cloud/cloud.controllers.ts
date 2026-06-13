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
import { CloudBackupService } from './backup/cloud-backup.service';
import { CloudEmailService } from './notifications/email.service';
import { MailerService } from '../mailer/mailer.service';


interface AuthedRequest { user: { id: string; role: Role; email: string } }

const ADMIN_ROLES = [Role.ADMIN, Role.SUPER_ADMIN] as const;

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

@ApiTags('Cloud / Backups')
@ApiSecurity('bearer')
@UseGuards(JwtAuthGuard)
@Controller('cloud/deployments/:id/backups')
export class CloudBackupController {
  constructor(private backups: CloudBackupService, private deployments: CloudDeploymentsService) {}
  @Get()
  async list(@Req() req: AuthedRequest, @Param('id') id: string) {
    await this.deployments.get(req.user.id, id);
    return this.backups.list(id);
  }
  @Post()
  async create(@Req() req: AuthedRequest, @Param('id') id: string) {
    await this.deployments.get(req.user.id, id);
    return this.backups.backup(id);
  }
  @Post('restore/:backupId')
  restore(@Param('backupId') backupId: string) { return this.backups.restore(backupId); }
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
    private tfa: TwoFactorService,
    private mailer: MailerService,
    private deployments: CloudDeploymentsService,
  ) {}

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
  @Post('users/:id/reset-2fa')
  reset2fa(@Param('id') id: string) { return this.tfa.adminReset(id); }
  @Post('users/:id/impersonate')
  impersonate(@Param('id') id: string) { return this.admin.impersonate(id); }
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

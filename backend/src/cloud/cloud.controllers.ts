import {
  Body, Controller, Delete, Get, Param, Post, Put, Query, Req, UseGuards, ForbiddenException,
} from '@nestjs/common';
import { ApiTags, ApiSecurity } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { Role } from '@prisma/client';
import { CloudPlansService } from './cloud-plans.service';
import { CloudDeploymentsService } from './cloud-deployments.service';
import { CloudBillingService } from './cloud-billing.service';
import { CloudAdminService } from './cloud-admin.service';

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

  @Get(':id/metrics')
  metrics(@Req() req: AuthedRequest, @Param('id') id: string) {
    return this.deployments.metrics(req.user.id, id);
  }

  @Get(':id/logs')
  logs(@Req() req: AuthedRequest, @Param('id') id: string) {
    // Phase 2: real k8s log stream
    const sample = [
      'INFO  starting application…',
      'INFO  connected to database',
      'INFO  http server listening on :3000',
      'INFO  ready',
    ];
    return { deploymentId: id, lines: sample };
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
  subscribe(@Req() req: AuthedRequest, @Body() body: { planId: string; provider: 'stripe'|'fawry'|'instapay'|'cash' }) {
    return this.billing.subscribe(req.user.id, body.planId, body.provider);
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
  constructor(private billing: CloudBillingService) {}

  @Public()
  @Post('stripe')
  stripe(@Body() body: any) {
    // Phase 2: verify Stripe signature
    if (body?.type === 'checkout.session.completed' && body?.data?.invoiceId) {
      return this.billing.confirmPayment(body.data.invoiceId);
    }
    return { received: true };
  }

  @Public()
  @Post('fawry')
  fawry(@Body() body: any) {
    if (body?.invoiceId && body?.status === 'PAID') {
      return this.billing.confirmPayment(body.invoiceId);
    }
    return { received: true };
  }

  @Public()
  @Post('instapay')
  instapay(@Body() body: any) {
    if (body?.invoiceId && body?.status === 'PAID') {
      return this.billing.confirmPayment(body.invoiceId);
    }
    return { received: true };
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
  ) {}

  @Get('stats') stats() { return this.admin.stats(); }

  @Get('users')
  users(@Query('q') q?: string, @Query('planId') planId?: string, @Query('status') status?: string) {
    return this.admin.listUsers(q, planId, status);
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
  @Post('billing/refund')
  refund(@Body() body: { invoiceId: string; partial?: number }) {
    return this.admin.refund(body.invoiceId, body.partial);
  }
  @Post('billing/confirm')
  confirm(@Body() body: { invoiceId: string }) {
    return this.billing.confirmPayment(body.invoiceId);
  }

  @Get('announcements') announcements() { return this.admin.announcements(); }
  @Post('announcements')
  broadcast(@Body() body: { title: string; body: string; severity?: string; audience?: string }) {
    return this.admin.broadcast(body.title, body.body, body.severity, body.audience);
  }
}

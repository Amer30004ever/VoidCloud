import { Body, Controller, Delete, Get, Param, Post, Put, UseGuards, NotFoundException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { RolesGuard } from '../guards/roles.guard';
import { Roles } from '../decorators/roles.decorator';
import { CurrentUser } from '../decorators/current-user.decorator';
import { PaymentService } from '../payments/payment.service';
import { BillingService } from './billing.service';

@Controller('billing')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiTags('Billing')
@ApiBearerAuth()
export class BillingController {
  constructor(
    private readonly billing: BillingService,
    private readonly payments: PaymentService,
  ) { }

  @Post('subscribe')
  @Roles(Role.USER, Role.ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Subscribe to a plan' })
  @ApiResponse({ status: 201, description: 'Subscription created' })
  async subscribe(
    @CurrentUser() user: { id: string },
    @Body() body: { planId: string; provider: string; customerPhone?: string; payerInstapayId?: string },
  ) {
    const plan = await this.billing.listPlans();
    const planRecord = plan.find((p: any) => p.id === body.planId);
    if (!planRecord) throw new NotFoundException('Plan not found');

    await this.billing.createSubscription(user.id, planRecord.slug);

    const invoice = await this.billing.createInvoiceForPlan(user.id, planRecord.slug);

    return this.payments.checkout({
      userId: user.id,
      invoiceId: invoice.id,
      method: body.provider as any,
      customerPhone: body.customerPhone,
      returnUrl: undefined,
    });
  }

  @Post('payments/checkout')
  @Roles(Role.USER, Role.ADMIN, Role.SUPER_ADMIN)
  checkout(
    @CurrentUser() user: { id: string },
    @Body() body: { invoiceId: string; method: string; customerPhone?: string; returnUrl?: string },
  ) {
    return this.payments.checkout({
      userId: user.id,
      invoiceId: body.invoiceId,
      method: body.method as any,
      customerPhone: body.customerPhone,
      returnUrl: body.returnUrl,
    });
  }

  @Get('invoices/:id/payment-status')
  @Roles(Role.USER, Role.ADMIN, Role.SUPER_ADMIN)
  paymentStatus(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    return this.payments.getPaymentStatus(user.id, id);
  }

  @Get('subscriptions')
  @Roles(Role.USER, Role.ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'List subscriptions' })
  @ApiResponse({ status: 200, description: 'Subscriptions list' })
  listSubscriptions(@CurrentUser() user: { id: string; role: Role }) {
    return this.billing.listSubscriptions(user.role === Role.SUPER_ADMIN ? undefined : user.id);
  }

  @Post('subscriptions')
  @Roles(Role.USER, Role.ADMIN, Role.SUPER_ADMIN)
  createSubscription(@CurrentUser() user: { id: string }, @Body() body: { planSlug: string }) {
    return this.billing.createSubscription(user.id, body.planSlug);
  }

  @Put('subscriptions/:id')
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  updateSubscription(@Param('id') id: string, @Body() body: Record<string, unknown>) {
    return this.billing.updateSubscription(id, body as { planSlug?: string; status?: string });
  }

  @Get('invoices')
  @Roles(Role.USER, Role.ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'List invoices' })
  @ApiResponse({ status: 200, description: 'Invoices list' })
  listInvoices(@CurrentUser() user: { id: string; role: Role }) {
    return this.billing.listInvoices(user.role === Role.SUPER_ADMIN ? undefined : user.id);
  }

  @Get('invoices/:id')
  @Roles(Role.USER, Role.ADMIN, Role.SUPER_ADMIN)
  getInvoice(@Param('id') id: string) {
    return this.billing.getInvoice(id);
  }

  @Post('payments')
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  processPayment(@Body() body: { userId: string; invoiceId: string; provider: string }) {
    return this.billing.processPayment(body);
  }

  @Get('plans')
  @Roles(Role.USER, Role.ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'List billing plans' })
  @ApiResponse({ status: 200, description: 'Plans list' })
  listPlans() {
    return this.billing.listPlans();
  }

  @Post('plans')
  @Roles(Role.SUPER_ADMIN)
  createPlan(@Body() body: Record<string, unknown>) {
    return this.billing.createPlan(body);
  }

  @Put('plans/:id')
  @Roles(Role.SUPER_ADMIN)
  updatePlan(@Param('id') id: string, @Body() body: Record<string, unknown>) {
    return this.billing.updatePlan(id, body);
  }

  @Delete('plans/:id')
  @Roles(Role.SUPER_ADMIN)
  deletePlan(@Param('id') id: string) {
    return this.billing.deletePlan(id);
  }

  @Post('referral')
  @Roles(Role.USER, Role.ADMIN, Role.SUPER_ADMIN)
  createReferral(@CurrentUser() user: { id: string }) {
    return this.billing.createReferral(user.id);
  }

  @Get('referral/stats')
  @Roles(Role.USER, Role.ADMIN, Role.SUPER_ADMIN)
  referralStats(@CurrentUser() user: { id: string }) {
    return this.billing.referralStats(user.id);
  }

  @Post('referral/payout')
  @Roles(Role.USER, Role.ADMIN, Role.SUPER_ADMIN)
  requestPayout(@CurrentUser() user: { id: string }) {
    return this.billing.requestPayout(user.id);
  }

  @Get('admin/transactions')
  @Roles(Role.SUPER_ADMIN, Role.BILLING_MANAGER)
  adminTransactions() {
    return this.billing.listInvoices();
  }

  @Post('admin/billing/confirm')
  @Roles(Role.SUPER_ADMIN, Role.BILLING_MANAGER)
  adminConfirm(@Body() body: { invoiceId: string }) {
    return this.billing.confirmInvoice(body.invoiceId);
  }

  @Post('admin/billing/reject')
  @Roles(Role.SUPER_ADMIN, Role.BILLING_MANAGER)
  adminReject(@Body() body: { invoiceId: string; reason: string }) {
    return this.billing.rejectInvoice(body.invoiceId, body.reason);
  }

  @Post('admin/billing/refund')
  @Roles(Role.SUPER_ADMIN, Role.BILLING_MANAGER)
  adminRefund(@Body() body: { invoiceId: string; partial?: number }) {
    return this.billing.refundInvoice(body.invoiceId, body.partial);
  }

  @Get('admin/billing/stats')
  @Roles(Role.SUPER_ADMIN, Role.BILLING_MANAGER)
  @ApiOperation({ summary: 'Get billing statistics' })
  @ApiResponse({ status: 200, description: 'Billing stats' })
  adminBillingStats() {
    return this.billing.adminBillingStats();
  }
}

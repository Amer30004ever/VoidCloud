import { Body, Controller, Delete, Get, Param, Post, Put, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { RolesGuard } from '../guards/roles.guard';
import { Roles } from '../decorators/roles.decorator';
import { CurrentUser } from '../decorators/current-user.decorator';
import { BillingService } from './billing.service';

@Controller('billing')
@UseGuards(JwtAuthGuard, RolesGuard)
export class BillingController {
  constructor(private readonly billing: BillingService) {}

  @Get('subscriptions')
  listSubscriptions(@CurrentUser() user: { id: string; role: Role }) {
    return this.billing.listSubscriptions(user.role === Role.SUPER_ADMIN ? undefined : user.id);
  }

  @Post('subscriptions')
  createSubscription(
    @CurrentUser() user: { id: string },
    @Body() body: { planSlug: string },
  ) {
    return this.billing.createSubscription(user.id, body.planSlug);
  }

  @Put('subscriptions/:id')
  updateSubscription(@Param('id') id: string, @Body() body: Record<string, unknown>) {
    return this.billing.updateSubscription(id, body as { planSlug?: string; status?: string });
  }

  @Get('invoices')
  listInvoices(@CurrentUser() user: { id: string; role: Role }) {
    return this.billing.listInvoices(user.role === Role.SUPER_ADMIN ? undefined : user.id);
  }

  @Get('invoices/:id')
  getInvoice(@Param('id') id: string) {
    return this.billing.getInvoice(id);
  }

  @Post('payments')
  processPayment(@Body() body: { userId: string; invoiceId: string; provider: string }) {
    return this.billing.processPayment(body);
  }

  @Get('plans')
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
  createReferral(@CurrentUser() user: { id: string }) {
    return this.billing.createReferral(user.id);
  }

  @Get('referral/stats')
  referralStats(@CurrentUser() user: { id: string }) {
    return this.billing.referralStats(user.id);
  }

  @Post('referral/payout')
  requestPayout(@CurrentUser() user: { id: string }) {
    return this.billing.requestPayout(user.id);
  }
}

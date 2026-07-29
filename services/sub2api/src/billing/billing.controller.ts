import { Controller, Get, Post, Body, UseGuards, Request, Headers, HttpException, HttpStatus } from '@nestjs/common';
import { RoleGuard } from '../auth/guards/role.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { BillingService } from './billing.service';
import { Public } from '../decorators/public.decorator';

@Controller('billing')
export class BillingController {
  constructor(private readonly billingService: BillingService) {}

  @UseGuards(JwtAuthGuard, RoleGuard)
  @Roles('user', 'admin', 'agent', 'super_admin')
  @Get()
  async getBilling(@Request() req) {
    return this.billingService.getBillingInfo(req.user.id);
  }

  @UseGuards(JwtAuthGuard, RoleGuard)
  @Roles('user', 'admin', 'agent', 'super_admin')
  @Post('checkout')
  async createCheckout(@Request() req) {
    return this.billingService.createCheckoutSession(req.user.id, req.user.email);
  }

  @Public()
  @Post('webhook')
  async stripeWebhook(@Headers('stripe-signature') signature: string, @Body() body: Buffer) {
    return this.billingService.handleWebhook(body, signature);
  }
}

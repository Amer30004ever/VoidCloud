import { Controller, Get, UseGuards, Request } from '@nestjs/common';
import { BillingService } from './billing.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('billing')
@UseGuards(JwtAuthGuard)
export class BillingController {
  constructor(private readonly billingService: BillingService) {}

  @Get()
  async getBilling(@Request() req) {
    return this.billingService.getBillingInfo(req.user.id);
  }
}

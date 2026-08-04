import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { RolesGuard } from '../guards/roles.guard';
import { Roles } from '../decorators/roles.decorator';
import { PaymentService } from './payment.service';

/**
 * Super-admin readiness probe for the payment rails (Prompt 0.16).
 * Answers two operational questions before a real sandbox transaction:
 *   1. are the Paymob credentials present at all, and
 *   2. do they come from the encrypted vault rather than plaintext env?
 * Only booleans/key names are returned — never a credential value.
 */
@ApiTags('Payments')
@ApiBearerAuth()
@Controller('billing/payments')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SUPER_ADMIN')
export class PaymentReadinessController {
  constructor(private readonly payments: PaymentService) {}

  @Get('readiness')
  @ApiOperation({ summary: 'Paymob credential + vault readiness' })
  readiness() {
    return this.payments.paymentsReadiness();
  }
}

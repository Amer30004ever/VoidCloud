import { Module } from '@nestjs/common';
import { BillingController } from './billing.controller';
import { BillingService } from './billing.service';
import { CreditController } from './credit.controller';
import { CreditService } from './credit.service';
import { MeteringService } from './metering.service';
import { PaymentService } from '../payments/payment.service';
import { PaymentWebhookController } from '../payments/payment-webhook.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [
    PrismaModule,
  ],
  controllers: [BillingController, CreditController, PaymentWebhookController],
  providers: [BillingService, CreditService, MeteringService, PaymentService],
  exports: [CreditService, MeteringService, PaymentService],
})
export class BillingModule { }

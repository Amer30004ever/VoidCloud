import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { BillingController } from './billing.controller';
import { BillingService } from './billing.service';
import { CreditController } from './credit.controller';
import { CreditService } from './credit.service';
import { MeteringService } from './metering.service';
import { SlaCreditService } from './sla-credit.service';
import { SlaCreditController } from './sla-credit.controller';
import { BandwidthService } from './bandwidth.service';
import { BandwidthController } from './bandwidth.controller';
import { PaymentService } from '../payments/payment.service';
import { PaymentWebhookController } from '../payments/payment-webhook.controller';
import { PaymentReadinessController } from '../payments/payment-readiness.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [
    PrismaModule,
    ScheduleModule.forRoot(),
  ],
  controllers: [BillingController, CreditController, SlaCreditController, BandwidthController, PaymentWebhookController, PaymentReadinessController],
  providers: [BillingService, CreditService, MeteringService, SlaCreditService, BandwidthService, PaymentService],
  exports: [CreditService, MeteringService, PaymentService, SlaCreditService, BandwidthService],
})
export class BillingModule { }

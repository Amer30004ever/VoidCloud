import { Module } from '@nestjs/common';
import { WebhooksController } from './webhooks.controller';
import { WebhooksService } from './webhooks.service';
import { WebhookDeliveryConsumer } from './webhook-delivery.consumer';

@Module({
  controllers: [WebhooksController, WebhookDeliveryConsumer],
  providers: [WebhooksService],
})
export class WebhooksModule {}

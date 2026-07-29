import { Controller, Logger } from '@nestjs/common';
import { EventPattern, Payload } from '@nestjs/microservices';
import { PrismaService } from '../prisma/prisma.service';
import { WebhooksService } from './webhooks.service';
import { extractCorrelationIdFromHeaders } from '../../../shared/logging';

export const WEBHOOK_DELIVERY_QUEUE = 'webhook.delivery';
export const WEBHOOK_DELIVERY_RETRY_QUEUE = 'webhook.delivery.retry';
export const WEBHOOK_DELIVERY_DLX = 'webhook.dlq';

@Controller()
export class WebhookDeliveryConsumer {
  private readonly logger = new Logger(WebhookDeliveryConsumer.name);
  private readonly MAX_ATTEMPTS = 3;
  private readonly BASE_DELAY_MS = 1000;

  constructor(
    private readonly prisma: PrismaService,
    private readonly webhooks: WebhooksService,
  ) {}

  @EventPattern(WEBHOOK_DELIVERY_QUEUE)
  async onDelivery(
    @Payload()
    payload: {
      webhookId: string;
      eventType: string;
      payload: unknown;
      attempt?: number;
      headers?: Record<string, unknown>;
    },
  ) {
    const correlationId = extractCorrelationIdFromHeaders(payload.headers);
    const log = (msg: string) => this.logger.log(correlationId ? `[${correlationId.slice(0, 8)}] ${msg}` : msg);
    const logWarn = (msg: string) => this.logger.warn(correlationId ? `[${correlationId.slice(0, 8)}] ${msg}` : msg);
    const logError = (msg: string) => this.logger.error(correlationId ? `[${correlationId.slice(0, 8)}] ${msg}` : msg);
    const attempt = payload.attempt ?? 1;
    const webhook = await this.prisma.webhookEndpoint.findUnique({
      where: { id: payload.webhookId },
    });
    if (!webhook || !webhook.enabled) {
      logWarn(`Skipping disabled or missing webhook ${payload.webhookId}`);
      return;
    }

    try {
      const result = await this.webhooks.deliver(
        {
          id: webhook.id,
          url: webhook.url,
          secret: webhook.secret,
        },
        payload.eventType,
        payload.payload,
      );

      if (!result || result.status < 200 || result.status >= 300) {
        logWarn(`Webhook ${webhook.id} returned non-2xx on attempt ${attempt}: ${result?.status}`);
        if (attempt < this.MAX_ATTEMPTS) {
          await this.scheduleRetry({
            webhookId: payload.webhookId,
            eventType: payload.eventType,
            payload: payload.payload,
            attempt: attempt + 1,
          });
        }
      }
    } catch (err) {
      logWarn(`Webhook ${webhook.id} delivery failed on attempt ${attempt}: ${err instanceof Error ? err.message : String(err)}`);
      if (attempt < this.MAX_ATTEMPTS) {
        await this.scheduleRetry({
          webhookId: payload.webhookId,
          eventType: payload.eventType,
          payload: payload.payload,
          attempt: attempt + 1,
        });
      }
    }
  }

  private async scheduleRetry(
    payload: { webhookId: string; eventType: string; payload: unknown; attempt: number },
  ) {
    const delay = this.BASE_DELAY_MS * 2 ** (payload.attempt - 1);
    log(`Retrying webhook ${payload.webhookId} in ${delay}ms (attempt ${payload.attempt})`);
    setTimeout(async () => {
      try {
        await this.onDelivery(payload);
      } catch {
        logError(`Retry failed for webhook ${payload.webhookId}`);
      }
    }, delay);
  }
}

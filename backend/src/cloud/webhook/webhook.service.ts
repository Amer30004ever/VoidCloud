import {
  Injectable,
  ForbiddenException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { createHmac, randomBytes } from 'crypto';

export const WEBHOOK_EVENTS = [
  'vps.created',
  'vps.deleted',
  'vps.started',
  'vps.stopped',
  'vps.restarted',
  'vps.resized',
  'vps.backup.created',
  'vps.backup.restored',
  'subscription.created',
  'subscription.cancelled',
  'invoice.paid',
  'domain.added',
  'ssl.issued',
  'ssl.expiring',
] as const;

export type WebhookEvent = (typeof WEBHOOK_EVENTS)[number];

export interface CreateWebhookDto {
  name: string;
  url: string;
  events: string[];
  enabled?: boolean;
}

export interface UpdateWebhookDto extends Partial<CreateWebhookDto> {
  regenerateSecret?: boolean;
}

const MAX_ATTEMPTS = 5;
const BACKOFF_MS = [1_000, 2_000, 4_000, 8_000, 16_000];

@Injectable()
export class WebhookService {
  private readonly logger = new Logger(WebhookService.name);

  constructor(private prisma: PrismaService) {}

  private validateUrl(url: string) {
    let u: URL;
    try {
      u = new URL(url);
    } catch {
      throw new Error('Invalid URL');
    }
    if (!['http:', 'https:'].includes(u.protocol))
      throw new Error('URL must use http(s)');
  }

  private validateEvents(events: string[]) {
    const allowed = new Set<string>(WEBHOOK_EVENTS as readonly string[]);
    for (const e of events) {
      if (!allowed.has(e)) throw new Error(`Unknown event: ${e}`);
    }
  }

  async listEndpoints(userId: string) {
    return this.prisma.webhookEndpoint.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createEndpoint(userId: string, data: CreateWebhookDto) {
    this.validateUrl(data.url);
    this.validateEvents(data.events ?? []);
    return this.prisma.webhookEndpoint.create({
      data: {
        userId,
        name: data.name.slice(0, 100),
        url: data.url,
        events: data.events,
        enabled: data.enabled ?? true,
        secret: `whsec_${randomBytes(24).toString('hex')}`,
      },
    });
  }

  private async assertOwner(id: string, userId: string) {
    const w = await this.prisma.webhookEndpoint.findUnique({ where: { id } });
    if (!w) throw new NotFoundException('Webhook not found');
    if (w.userId !== userId) throw new ForbiddenException();
    return w;
  }

  async updateEndpoint(userId: string, id: string, data: UpdateWebhookDto) {
    await this.assertOwner(id, userId);
    if (data.url) this.validateUrl(data.url);
    if (data.events) this.validateEvents(data.events);
    return this.prisma.webhookEndpoint.update({
      where: { id },
      data: {
        ...(data.name !== undefined ? { name: data.name.slice(0, 100) } : {}),
        ...(data.url !== undefined ? { url: data.url } : {}),
        ...(data.events !== undefined ? { events: data.events } : {}),
        ...(data.enabled !== undefined ? { enabled: data.enabled } : {}),
        ...(data.regenerateSecret
          ? { secret: `whsec_${randomBytes(24).toString('hex')}` }
          : {}),
      },
    });
  }

  async deleteEndpoint(userId: string, id: string) {
    await this.assertOwner(id, userId);
    await this.prisma.webhookEndpoint.delete({ where: { id } });
    return { ok: true };
  }

  async listDeliveries(userId: string, id: string, limit = 50) {
    await this.assertOwner(id, userId);
    return this.prisma.webhookDelivery.findMany({
      where: { webhookId: id },
      orderBy: { createdAt: 'desc' },
      take: Math.min(200, Math.max(1, limit)),
    });
  }

  async testEndpoint(userId: string, id: string) {
    await this.assertOwner(id, userId);
    return this.deliverWebhook(id, 'webhook.test', {
      message: 'This is a test event from AmerCloud',
      timestamp: new Date().toISOString(),
    });
  }

  /** Fire-and-forget: enqueue async delivery to every matching enabled webhook. */
  async triggerEvent(
    eventType: string,
    payload: unknown,
    userId?: string,
  ): Promise<void> {
    try {
      const where: {
        enabled: boolean;
        userId?: string;
        events: { has: string };
      } = {
        enabled: true,
        events: { has: eventType },
      };
      if (userId) where.userId = userId;
      const hooks = await this.prisma.webhookEndpoint.findMany({ where });
      for (const h of hooks) {
        // Don't await — schedule but don't block caller
        void this.deliverWithRetry(h.id, eventType, payload).catch((err) => {
          this.logger.error(
            `Webhook ${h.id} dispatch failed: ${err?.message ?? err}`,
          );
        });
      }
    } catch (err) {
      this.logger.error(
        `triggerEvent(${eventType}) failed: ${(err as Error).message}`,
      );
    }
  }

  private sign(secret: string, body: string, timestamp: number): string {
    const mac = createHmac('sha256', secret)
      .update(`${timestamp}.${body}`)
      .digest('hex');
    return `t=${timestamp},v1=${mac}`;
  }

  async deliverWebhook(
    webhookId: string,
    eventType: string,
    payload: unknown,
    attempt = 1,
  ) {
    const hook = await this.prisma.webhookEndpoint.findUnique({
      where: { id: webhookId },
    });
    if (!hook) throw new NotFoundException('Webhook not found');

    const body = JSON.stringify({
      event: eventType,
      data: payload,
      deliveredAt: new Date().toISOString(),
    });
    const ts = Math.floor(Date.now() / 1000);
    const signature = hook.secret ? this.sign(hook.secret, body, ts) : '';

    let status: number | null = null;
    let responseBody = '';
    let success = false;
    let error: string | null = null;

    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 10_000);
      const res = await fetch(hook.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'AmerCloud-Webhooks/1.0',
          'X-AmerCloud-Event': eventType,
          'X-AmerCloud-Delivery': `${webhookId}-${ts}-${attempt}`,
          ...(signature ? { 'X-AmerCloud-Signature': signature } : {}),
        },
        body,
        signal: controller.signal,
      });
      clearTimeout(timer);
      status = res.status;
      responseBody = (await res.text()).slice(0, 2000);
      success = res.ok;
      if (!success) error = `HTTP ${res.status}`;
    } catch (e) {
      error = (e as Error).message?.slice(0, 500) ?? 'Network error';
    }

    return this.prisma.webhookDelivery.create({
      data: {
        webhookId,
        eventType,
        payload: payload as never,
        responseStatus: status ?? undefined,
        responseBody,
        attempt,
        success,
        error: error ?? undefined,
      },
    });
  }

  /** Retry with exponential backoff up to MAX_ATTEMPTS. */
  private async deliverWithRetry(
    webhookId: string,
    eventType: string,
    payload: unknown,
  ) {
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      const delivery = await this.deliverWebhook(
        webhookId,
        eventType,
        payload,
        attempt,
      );
      if (delivery.success) return delivery;
      if (attempt < MAX_ATTEMPTS) {
        await new Promise((r) =>
          setTimeout(r, BACKOFF_MS[attempt - 1] ?? 16_000),
        );
      }
    }
  }

  listEventTypes() {
    return WEBHOOK_EVENTS as readonly string[];
  }
}

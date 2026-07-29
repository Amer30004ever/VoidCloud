import {
  validateWebhookUrl,
  SsrfValidationError,
  isPrivateIp,
  type DnsLookup,
} from '../common/ssrf/url-validator';
import dns from 'node:dns/promises';
import { createHmac } from 'node:crypto';

const WEBHOOK_HTTP_TIMEOUT_MS = 5000;

/** Resolve a hostname and verify NONE of the resulting IPs are private.
 *  Used at delivery time to catch DNS rebinding (TOCTOU) between
 *  registration and the moment we actually connect. */
async function resolvePublicAddresses(
  hostname: string,
  lookup: DnsLookup,
): Promise<string[]> {
  const records = await lookup(hostname);
  if (!records.length) {
    throw new SsrfValidationError('DNS resolution failed');
  }
  const addresses = records.map((r) => r.address);
  for (const address of addresses) {
    if (isPrivateIp(address)) {
      throw new SsrfValidationError(
        'URL resolves to a private or internal IP address',
      );
    }
  }
  return addresses;
}

/** Resolve + validate, then connect by PINNING the TCP connection to the
 *  validated public IP (via the `host` option) while preserving the original
 *  hostname in the TLS SNI (`servername`) and the HTTP `Host` header. This
 *  closes the DNS-rebinding TOCTOU window: even if DNS changes the moment
 *  after we validated, we still dial the IP we approved. */
async function deliverToUrl(
  rawUrl: string,
  secret: string | null,
  body: string,
  lookup: DnsLookup = (h) => dns.lookup(h, { all: true, verbatim: true }),
): Promise<{ status: number; response: string }> {
  const url = new URL(rawUrl);
  const hostname = url.hostname;
  const isHttps = url.protocol === 'https:';
  const httpModule = isHttps ? await import('node:https') : await import('node:http');
  const port = url.port
    ? Number(url.port)
    : isHttps
      ? 443
      : 80;

  const addresses = await resolvePublicAddresses(hostname, lookup);
  const pinnedIp = addresses[0];

  const signature = secret
    ? createHmac('sha256', secret).update(body).digest('hex')
    : null;

  const headers: Record<string, string> = {
    'content-type': 'application/json',
    'content-length': String(Buffer.byteLength(body)),
    'x-voidcloud-event': 'delivery-test',
    'user-agent': 'VoidCloud-Webhooks/1.0',
    host: hostname,
  };
  if (signature) headers['x-voidcloud-signature'] = `sha256=${signature}`;

  return new Promise((resolve, reject) => {
    const req = httpModule.request(
      {
        method: 'POST',
        host: pinnedIp,
        port,
        path: url.pathname + url.search,
        headers,
        servername: hostname,
        timeout: WEBHOOK_HTTP_TIMEOUT_MS,
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () =>
          resolve({ status: res.statusCode ?? 0, response: data.slice(0, 2000) }),
        );
      },
    );
    req.on('timeout', () => {
      req.destroy(new SsrfValidationError('Delivery request timed out'));
    });
    req.on('error', (err) => reject(err));
    req.write(body);
    req.end();
  });
}

export interface WebhookDeliveryResult {
  status: number;
  response: string;
}

export class WebhooksService {
  constructor(private readonly prisma: any) {}

  async list(userId: string) {
    return this.prisma.webhookEndpoint.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: { deliveries: { take: 5, orderBy: { createdAt: 'desc' } } },
    });
  }

  async events() {
    return [
      'lead.created',
      'vps.status_changed',
      'invoice.paid',
      'subscription.created',
      'subscription.cancelled',
    ];
  }

  async create(
    userId: string,
    dto: { name: string; url: string; events: string[]; enabled?: boolean },
    lookup?: DnsLookup,
  ) {
    await validateWebhookUrl(dto.url, lookup ? { lookup } : undefined);
    const secret = createHmac('sha256', String(Date.now())).digest('hex').slice(0, 32);
    return this.prisma.webhookEndpoint.create({
      data: {
        userId,
        name: dto.name,
        url: dto.url,
        events: dto.events,
        enabled: dto.enabled ?? true,
        secret,
      },
    });
  }

  async update(
    userId: string,
    id: string,
    dto: Partial<{
      name: string;
      url: string;
      events: string[];
      enabled: boolean;
      regenerateSecret: boolean;
    }>,
    lookup?: DnsLookup,
  ) {
    const existing = await this.assertOwned(userId, id);
    if (dto.url !== undefined) {
      await validateWebhookUrl(dto.url, lookup ? { lookup } : undefined);
    }
    const data: any = { ...dto };
    if (dto.regenerateSecret) {
      data.secret = createHmac('sha256', String(Date.now())).digest('hex').slice(0, 32);
    }
    delete data.regenerateSecret;
    return this.prisma.webhookEndpoint.update({ where: { id }, data });
  }

  async remove(userId: string, id: string) {
    await this.assertOwned(userId, id);
    return this.prisma.webhookEndpoint.delete({ where: { id } });
  }

  async deliveries(userId: string, id: string, limit = 50) {
    await this.assertOwned(userId, id);
    return this.prisma.webhookDelivery.findMany({
      where: { webhookId: id },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  /** Deliver an event to one endpoint. Re-validates DNS immediately before
   *  connecting (so a DNS-rebind between registration and delivery cannot push
   *  traffic to an internal address) and pins the connection to the approved
   *  public IP. */
  async deliver(
    webhook: { id: string; url: string; secret: string | null },
    eventType: string,
    payload: unknown,
    opts?: { lookup?: DnsLookup },
  ): Promise<WebhookDeliveryResult> {
    const body = JSON.stringify({ event: eventType, payload });
    const result = await deliverToUrl(
      webhook.url,
      webhook.secret,
      body,
      opts?.lookup,
    );

    await this.prisma.webhookDelivery.create({
      data: {
        webhookId: webhook.id,
        eventType,
        payload,
        responseStatus: result.status,
        responseBody: result.response,
        success: result.status >= 200 && result.status < 300,
      },
    });

    return result;
  }

  async resend(
    userId: string,
    webhookId: string,
    deliveryId: string,
  ): Promise<WebhookDeliveryResult> {
    const webhook = await this.assertOwned(userId, webhookId);
    const delivery = await this.prisma.webhookDelivery.findUnique({
      where: { id: deliveryId },
    });
    if (!delivery || delivery.webhookId !== webhookId) {
      throw new Error('Delivery not found');
    }

    const body = JSON.stringify({ event: delivery.eventType, payload: delivery.payload });
    const result = await deliverToUrl(webhook.url, webhook.secret, body);

    await this.prisma.webhookDelivery.create({
      data: {
        webhookId: webhook.id,
        eventType: delivery.eventType,
        payload: delivery.payload,
        responseStatus: result.status,
        responseBody: result.response,
        success: result.status >= 200 && result.status < 300,
      },
    });

    return result;
  }

  async test(userId: string, id: string, lookup?: DnsLookup) {
    const webhook = await this.assertOwned(userId, id);
    return this.deliver(
      webhook,
      'delivery.test',
      { message: 'This is a test delivery from VoidCloud.' },
      lookup ? { lookup } : undefined,
    );
  }

  private async assertOwned(userId: string, id: string) {
    const existing = await this.prisma.webhookEndpoint.findUnique({ where: { id } });
    if (!existing || existing.userId !== userId) {
      throw new SsrfValidationError('Webhook not found');
    }
    return existing;
  }
}

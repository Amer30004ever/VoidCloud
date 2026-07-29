import { createHmac, createHash, timingSafeEqual } from 'node:crypto';
import {
  CheckoutRequest,
  CheckoutResult,
  GatewayWebhookEvent,
  PaymentGateway,
  PaymentMethod,
} from './gateway';

export interface PaypalConfig {
  clientId: string;
  clientSecret: string;
  webhookId: string;
  webhookSecret: string;
  baseUrl?: string;
}

/** Minimal HTTP interface so tests can inject a fake (no network). */
export interface PaypalHttpClient {
  post<T = any>(url: string, body: any, headers?: Record<string, string>): Promise<T>;
  get<T = any>(url: string, headers?: Record<string, string>): Promise<T>;
}

const DEFAULT_BASE = 'https://api.paypal.com';

/**
 * PayPal adapter (Prompt 0.16a). Implements the VoidCloud
 * PaymentGateway contract for customers who prefer/trust PayPal over
 * entering card details directly.
 *
 * Flow: create an order → return a redirect to PayPal's
 * approval flow. The invoice stays PENDING until PayPal's webhook
 * confirms the capture. Webhook authenticity is verified with
 * PayPal's transmission-signature scheme (HMAC-SHA256 over
 * `<transmissionId>|<time>|<webhookId>|<sha256(body)>`, keyed by
 * the webhook secret) — no unauthenticated payload is ever trusted.
 */
export class PaypalGateway implements PaymentGateway {
  readonly name = 'paypal';
  private readonly base: string;
  private readonly webhookId: string;
  private readonly webhookSecret: string;
  private readonly clientId: string;
  private readonly clientSecret: string;

  constructor(
    private readonly config: PaypalConfig,
    private readonly http: PaypalHttpClient,
  ) {
    this.base = config.baseUrl ?? DEFAULT_BASE;
    this.webhookId = config.webhookId;
    this.webhookSecret = config.webhookSecret;
    this.clientId = config.clientId;
    this.clientSecret = config.clientSecret;
  }

  async createCheckout(req: CheckoutRequest): Promise<CheckoutResult> {
    const gatewayRef = `ord_${Date.now()}_${Math.abs(hashStr(req.invoiceId))}`;
    const accessToken = await this.getAccessToken();
    const order = await this.http.post<{ id: string; links?: { rel: string; href: string }[] }>(
      `${this.base}/v2/checkout/orders`,
      {
        intent: 'CAPTURE',
        purchase_units: [
          {
            reference_id: req.invoiceId,
            amount: {
              currency_code: req.currency.toUpperCase(),
              value: req.amount.toFixed(2),
            },
          },
        ],
        application_context: {
          return_url: req.returnUrl ?? 'https://voidcloud.cc.cd/dashboard/billing?status=success',
          cancel_url: req.returnUrl ?? 'https://voidcloud.cc.cd/dashboard/billing?status=cancel',
        },
      },
      {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    );

    const approve = order.links?.find((l) => l.rel === 'approve');
    return {
      gatewayRef: order.id ?? gatewayRef,
      redirect: {
        url: approve?.href ?? req.returnUrl ?? 'https://voidcloud.cc.cd/dashboard/billing',
        method: 'GET',
      },
      pending: true,
    };
  }

  /** Verify PayPal's transmission signature; parse to a normalized event. Null = reject. */
  verifyAndParse(rawBody: string | Buffer, signature: string | undefined): GatewayWebhookEvent | null {
    if (!signature || !this.webhookSecret) return null;

    const headers: Record<string, string> = {};
    for (const part of signature.split(',')) {
      const idx = part.indexOf('=');
      if (idx < 0) continue;
      headers[part.slice(0, idx).trim()] = part.slice(idx + 1).trim();
    }

    const transmissionId = headers['PAYPAL-TRANSMISSION-ID'];
    const time = headers['PAYPAL-TRANSMISSION-TIME'];
    const suppliedSig = headers['PAYPAL-TRANSMISSION-SIG'];
    if (!transmissionId || !time || !suppliedSig) return null;

    const body = typeof rawBody === 'string' ? rawBody : rawBody.toString('utf8');
    const bodyHash = createHash('sha256').update(body).digest('hex');
    const signedContent = `${transmissionId}|${time}|${this.webhookId}|${bodyHash}`;
    const expected = createHmac('sha256', this.webhookSecret)
      .update(signedContent)
      .digest('base64');

    if (!safeEqualB64(expected, suppliedSig)) return null;

    let payload: any;
    try {
      payload = JSON.parse(body);
    } catch {
      return null;
    }

    const eventType = payload.event_type ?? payload.type;
    const resource = payload.resource ?? {};
    const success =
      eventType === 'PAYMENT.CAPTURE.COMPLETED' ||
      resource?.status === 'COMPLETED' ||
      resource?.status === 'APPROVED';
    const invoiceId =
      resource?.supplementary_data?.related_ids?.order_id ??
      resource?.invoice_id ??
      payload?.resource?.reference_id ??
      undefined;

    return {
      gatewayRef: String(resource?.id ?? payload?.id ?? ''),
      invoiceId,
      success,
      amount: resource?.amount?.value ? Number(resource.amount.value) : undefined,
      currency: resource?.amount?.currency_code,
      raw: payload,
    };
  }

  private async getAccessToken(): Promise<string> {
    const res = await this.http.post<{ access_token: string }>(
      `${this.base}/v1/oauth2/token`,
      'grant_type=client_credentials',
      {
        Authorization: `Basic ${Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64')}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    );
    return res.access_token;
  }
}

function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i += 1) h = (h * 31 + s.charCodeAt(i)) | 0;
  return h;
}

function safeEqualB64(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

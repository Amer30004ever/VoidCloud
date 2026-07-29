import { createHmac, timingSafeEqual } from 'node:crypto';
import {
  CheckoutRequest,
  CheckoutResult,
  GatewayWebhookEvent,
  PaymentGateway,
  PaymentMethod,
} from './gateway';

export interface StripeConfig {
  secretKey: string;
  webhookSecret: string;
  baseUrl?: string;
}

/** Minimal HTTP interface so tests can inject a fake (no network). */
export interface StripeHttpClient {
  post<T = any>(url: string, body: any, headers?: Record<string, string>): Promise<T>;
}

const DEFAULT_BASE = 'https://api.stripe.com/v1';

/**
 * Stripe adapter (Prompt 0.16a). Implements the VoidCloud
 * PaymentGateway contract for genuinely global card payments.
 *
 * Flow (card): create a Checkout Session → return a redirect URL the
 * customer completes on Stripe. The invoice stays PENDING until
 * Stripe's webhook (signed with the webhook secret via the
 * Stripe-Signature header) confirms payment. No unauthenticated
 * webhook payload is ever trusted — verifyAndParse returns null on a
 * bad signature (the caller must treat null as "reject").
 */
export class StripeGateway implements PaymentGateway {
  readonly name = 'stripe';
  private readonly base: string;
  private readonly secretKey: string;
  private readonly webhookSecret: string;

  constructor(
    private readonly config: StripeConfig,
    private readonly http: StripeHttpClient,
  ) {
    this.base = config.baseUrl ?? DEFAULT_BASE;
    this.secretKey = config.secretKey;
    this.webhookSecret = config.webhookSecret;
  }

  async createCheckout(req: CheckoutRequest): Promise<CheckoutResult> {
    const gatewayRef = `cs_${Date.now()}_${Math.abs(hashStr(req.invoiceId))}`;

    const session = await this.http.post<{ id: string; url?: string }>(
      `${this.base}/checkout/sessions`,
      {
        mode: 'payment',
        'line_items': [
          {
            price_data: {
              currency: req.currency.toLowerCase(),
              product_data: { name: `VoidCloud invoice ${req.invoiceId}` },
              unit_amount: Math.round(req.amount * 100),
            },
            quantity: 1,
          },
        ],
        'payment_method_types': ['card'],
        'customer_email': req.customerEmail,
        'success_url': req.returnUrl ?? 'https://voidcloud.cc.cd/dashboard/billing?status=success',
        'cancel_url': req.returnUrl ?? 'https://voidcloud.cc.cd/dashboard/billing?status=cancel',
        'metadata[invoice_id]': req.invoiceId,
      },
      {
        Authorization: `Bearer ${this.secretKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    );

    return {
      gatewayRef: session.id ?? gatewayRef,
      redirect: {
        url: session.url ?? req.returnUrl ?? 'https://voidcloud.cc.cd/dashboard/billing',
        method: 'GET',
      },
      pending: true,
    };
  }

  /**
   * Verify the Stripe-Signature HMAC-SHA256 over the RAW body, then
   * parse to a normalized event. Returns null on any verification
   * failure — never throws on a bad signature.
   */
  verifyAndParse(rawBody: string | Buffer, signature: string | undefined): GatewayWebhookEvent | null {
    if (!signature || !this.webhookSecret) return null;

    let elements: Record<string, string> = {};
    try {
      for (const part of signature.split(',')) {
        const [k, v] = part.split('=');
        if (k && v !== undefined) elements[k.trim()] = v;
      }
    } catch {
      return null;
    }

    const ts = elements['t'];
    if (!ts) return null;

    const body = typeof rawBody === 'string' ? rawBody : rawBody.toString('utf8');
    const signedContent = `${ts}.${body}`;
    const expected = createHmac('sha256', this.webhookSecret)
      .update(signedContent)
      .digest('hex');

    const supplied = (elements['v0'] ?? '').replace(/^v0=/, '');
    if (!supplied || !safeEqualHex(expected, supplied)) return null;

    let payload: any;
    try {
      payload = JSON.parse(body);
    } catch {
      return null;
    }

    const obj = payload.data?.object ?? payload;
    const type = payload.type ?? obj?.object;
    const success =
      type === 'checkout.session.completed' ||
      (type === 'payment_intent.succeeded' && obj?.status === 'succeeded') ||
      obj?.payment_status === 'paid';
    const invoiceId =
      obj?.metadata?.invoice_id ?? obj?.metadata?.invoiceId ?? payload?.data?.object?.metadata?.invoice_id ?? undefined;
    const failureTypes = new Set([
      'checkout.session.async_payment_failed',
      'payment_intent.payment_failed',
      'invoice.payment_failed',
    ]);
    const failed = failureTypes.has(type);
    const normalizedSuccess = failed ? false : success;

    return {
      gatewayRef: String(obj?.id ?? ''),
      invoiceId,
      success: normalizedSuccess,
      amount: obj?.amount_total ? obj.amount_total / 100 : undefined,
      currency: (obj?.currency ?? payload?.data?.object?.currency)?.toUpperCase(),
      raw: payload,
    };
  }
}

function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i += 1) h = (h * 31 + s.charCodeAt(i)) | 0;
  return h;
}

function safeEqualHex(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  const ab = Buffer.from(a, 'hex');
  const bb = Buffer.from(b, 'hex');
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}

import { createHmac } from 'node:crypto';
import {
  CheckoutRequest,
  CheckoutResult,
  GatewayWebhookEvent,
  PaymentGateway,
  PaymentMethod,
  isCashLike,
} from './gateway';
import { generateReferenceCode } from './gateway';

export interface PaymobConfig {
  apiKey: string;
  integrationId: number;
  hmacSecret: string;
  iframeId?: string;
  baseUrl?: string;
}

/** Minimal HTTP post interface so tests can inject a fake (no network). */
export interface HttpClient {
  post<T = any>(url: string, body: any, headers?: Record<string, string>): Promise<T>;
}

const DEFAULT_BASE = 'https://accept.paymob.com/api';

/**
 * Paymob adapter. Implements the VoidCloud PaymentGateway contract.
 *
 * Real flow (card): authenticate → create order → get payment key → return an
 * iframe/redirect URL. Real flow (cash-like): we generate an out-of-band
 * reference code the customer pays at a Fawry/Vodafone/InstaPay point; the
 * invoice stays PENDING until Paymob's webhook confirms it.
 *
 * The HTTP layer is injectable so the unit tests exercise the full lifecycle
 * without hitting the live Paymob API.
 */
export class PaymobGateway implements PaymentGateway {
  readonly name = 'paymob';
  private readonly base: string;
  private readonly integrationId: number;
  private readonly hmacSecret: string;

  constructor(
    private readonly config: PaymobConfig,
    private readonly http: HttpClient,
  ) {
    this.base = config.baseUrl ?? DEFAULT_BASE;
    this.integrationId = config.integrationId;
    this.hmacSecret = config.hmacSecret;
  }

  async createCheckout(req: CheckoutRequest): Promise<CheckoutResult> {
    const gatewayRef = `ord_${Date.now()}_${Math.abs(hashStr(req.invoiceId))}`;

    if (isCashLike(req.method)) {
      const referenceCode = generateReferenceCode(req.method, req.invoiceId);
      return {
        gatewayRef,
        referenceCode,
        instructions: cashInstructions(req.method, referenceCode),
        pending: true,
      };
    }

    // CREDIT_CARD — hosted checkout redirect (Paymob iframe / key).
    const auth = await this.http.post<{ token: string }>(
      `${this.base}/auth/tokens`,
      { api_key: this.config.apiKey },
    );
    const order = await this.http.post<{ id: number }>(
      `${this.base}/ecommerce/orders`,
      {
        auth_token: auth.token,
        delivery_needed: false,
        amount_cents: Math.round(req.amount * 100),
        currency: req.currency,
        merchant_order_id: gatewayRef,
        items: [],
      },
    );
    const key = await this.http.post<{ token: string }>(
      `${this.base}/acceptance/payment_keys`,
      {
        auth_token: auth.token,
        amount_cents: Math.round(req.amount * 100),
        expiration: 3600,
        currency: req.currency,
        order_id: order.id,
        integration_id: this.integrationId,
        billing_data: req.billingData ?? defaultBilling(req),
        lock_order_when_paid: true,
      },
    );
    const url =
      req.method === 'CREDIT_CARD' && this.config.iframeId
        ? `https://accept.paymob.com/api/acceptance/iframes/${this.config.iframeId}?payment_token=${key.token}`
        : req.returnUrl ?? `https://accept.paymob.com/#/${key.token}`;
    return {
      gatewayRef,
      redirect: { url, method: 'GET' },
      pending: false,
    };
  }

  /** Verify HMAC over raw body; parse to a normalized event. Null = reject. */
  verifyAndParse(rawBody: string | Buffer, signature: string | undefined): GatewayWebhookEvent | null {
    if (!signature) return null;
    const body = typeof rawBody === 'string' ? rawBody : rawBody.toString('utf8');
    const expected = createHmac('sha256', this.hmacSecret).update(body).digest('hex');
    // Constant-time compare.
    if (!safeEqual(expected, signature)) return null;

    let payload: any;
    try {
      payload = JSON.parse(body);
    } catch {
      return null;
    }
    const obj = payload.obj ?? payload;
    const success =
      obj.success === true ||
      obj.type === 'TRANSACTION_SUCCESSFUL' ||
      String(obj.txn_response_code ?? '').toUpperCase() === 'APPROVED';
    return {
      gatewayRef: String(obj.merchant_order_id ?? obj.order.id ?? ''),
      invoiceId: undefined,
      success,
      amount: obj.amount_cents ? obj.amount_cents / 100 : undefined,
      currency: obj.currency,
      raw: payload,
    };
  }
}

function cashInstructions(method: PaymentMethod, code: string): string {
  switch (method) {
    case 'FAWRY':
      return `Pay at any Fawry outlet or Fawry app using reference: ${code}`;
    case 'VODAFONE_CASH':
      return `Open Vodafone Cash app and pay the generated bill using reference: ${code}`;
    case 'INSTAPAY':
      return `Open InstaPay and complete the payment using reference: ${code}`;
    default:
      return `Use reference ${code} to complete your cash payment.`;
  }
}

function defaultBilling(req: CheckoutRequest) {
  return {
    email: req.customerEmail ?? 'customer@voidcloud.cc.cd',
    phone_number: req.customerPhone ?? '0000000000',
    first_name: 'Void',
    last_name: 'Cloud',
    city: 'Cairo',
    country: 'EG',
    building: '0',
    floor: '0',
    apartment: '0',
    street: 'n/a',
    postal_code: '11511',
  };
}

function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i += 1) h = (h * 31 + s.charCodeAt(i)) | 0;
  return h;
}

function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

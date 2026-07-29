/**
 * Payment gateway abstraction for VoidCloud local (Egypt/MENA) rails.
 *
 * Gateway choice (Prompt 0.16): PAYMOB.
 *   - Single integration covers all required rails: CREDIT_CARD (MIGS/Visa/
 *     Mastercard hosted checkout), FAWRY, VODAFONE_CASH, INSTAPAY.
 *   - Asynchronous, signature-verified webhooks (HMAC-SHA256 over the raw
 *     body using the Integration/Server HMAC secret) — satisfies the
 *     "do not trust unauthenticated webhooks" requirement.
 *   - Settlement: T+1 to T+2 for cards; cash refs paid at physical points /
 *     mobile wallets, confirmed via webhook (hence the PENDING state).
 *   Fawaterak offers a similar rail set but Paymob's webhook HMAC + broader
 *   coverage is the simpler single integration; the adapter sits behind
 *   PaymentGateway so it can be swapped without touching the service layer.
 */

import { randomBytes, createHmac } from 'node:crypto';

export type PaymentMethod =
  | 'CREDIT_CARD'
  | 'FAWRY'
  | 'VODAFONE_CASH'
  | 'INSTAPAY'
  | 'CASH'
  | 'STRIPE_CARD'
  | 'PAYPAL';

/** Rails that are paid OUT of band and must stay PENDING until webhook. */
export const CASH_LIKE_METHODS: PaymentMethod[] = ['FAWRY', 'VODAFONE_CASH', 'INSTAPAY', 'CASH'];

export function isCashLike(method: PaymentMethod): boolean {
  return CASH_LIKE_METHODS.includes(method);
}

export interface CheckoutRequest {
  invoiceId: string;
  amount: number; // in the invoice currency minor? we pass major units (EGP/USD)
  currency: string; // 'EGP' | 'USD'
  method: PaymentMethod;
  customerEmail?: string;
  customerPhone?: string;
  billingData?: Record<string, unknown>;
  returnUrl?: string;
}

export interface CheckoutResult {
  /** True when payment is completed synchronously / redirectable now. */
  redirect?: { url: string; method: 'GET' | 'POST'; fields?: Record<string, string> };
  /** Present for cash-like rails: the out-of-band reference the customer pays. */
  referenceCode?: string;
  instructions?: string;
  /** Gateway-side transaction/order id used to correlate the webhook. */
  gatewayRef: string;
  /** Whether the invoice should be left PENDING (cash) or marked paid now. */
  pending: boolean;
}

export interface GatewayWebhookEvent {
  gatewayRef: string;
  invoiceId?: string;
  success: boolean;
  amount?: number;
  currency?: string;
  raw: any;
}

export interface PaymentGateway {
  readonly name: string;
  createCheckout(req: CheckoutRequest): Promise<CheckoutResult>;
  /**
   * Verify + parse a webhook. Returns null if the signature is invalid
   * (caller MUST treat null as "reject"). Never throws on bad signature.
   */
  verifyAndParse(rawBody: string | Buffer, signature: string | undefined): GatewayWebhookEvent | null;
}

export function generateReferenceCode(method: PaymentMethod, invoiceId: string): string {
  // Deterministic, human-readable, payment-method-prefixed reference.
  const prefix =
    method === 'FAWRY'
      ? 'FW'
      : method === 'VODAFONE_CASH'
        ? 'VC'
        : method === 'INSTAPAY'
          ? 'IP'
          : 'CS';
  const short = invoiceId.replace(/[^a-zA-Z0-9]/g, '').slice(-8).toUpperCase();
  const buf = randomBytes(6);
  let rand = '';
  for (let i = 0; i < 6; i += 1) rand += String(buf[i] % 10);
  return `${prefix}-${short}-${rand}`;
}

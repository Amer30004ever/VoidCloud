import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  CheckoutRequest,
  CheckoutResult,
  GatewayWebhookEvent,
  PaymentGateway,
  PaymentMethod,
  isCashLike,
} from './gateway';
import { PaymobGateway, HttpClient } from './paymob.gateway';
import { StripeGateway, StripeHttpClient } from './stripe.gateway';
import { PaypalGateway, PaypalHttpClient } from './paypal.gateway';

export interface CheckoutInput {
  userId: string;
  invoiceId: string;
  method: PaymentMethod;
  customerPhone?: string;
  returnUrl?: string;
}

@Injectable()
export class PaymentService {
  private readonly logger = new Logger(PaymentService.name);
  private readonly gateway: PaymentGateway;

  constructor(private readonly prisma: PrismaService) {
    this.gateway = buildGateway();
  }

  /** Exposed for tests: inject a fake gateway + http client. */
  static forTest(prisma: PrismaService, gateway: PaymentGateway): PaymentService {
    const s = new PaymentService(prisma);
    (s as any).gateway = gateway;
    return s;
  }

  /** Create a payment for an invoice using the chosen method. */
  async checkout(input: CheckoutInput): Promise<CheckoutResult & { invoiceId: string; provider: string; amount: number; currency: string; invoice: { id: string; number: string; status: string } }> {
    const invoice = await this.prisma.cloudInvoice.findUnique({ where: { id: input.invoiceId } });
    if (!invoice) throw new NotFoundException('Invoice not found');
    if (invoice.userId !== input.userId) throw new NotFoundException('Invoice not found');
    if (invoice.status === 'PAID') throw new BadRequestException('Invoice already paid');

    const amount = invoice.currency === 'EGP' ? invoice.amountEGP ?? 0 : invoice.amountUSD ?? 0;
    const req: CheckoutRequest = {
      invoiceId: invoice.id,
      amount,
      currency: invoice.currency,
      method: normalizeMethod(input.method),
      customerPhone: input.customerPhone,
      returnUrl: input.returnUrl,
      billingData: { invoice_number: invoice.number },
    };

    const result = await this.gateway.createCheckout(req);

    await this.prisma.cloudInvoice.update({
      where: { id: invoice.id },
      data: {
        provider: this.gateway.name,
        providerRef: result.gatewayRef,
        metadata: {
          ...((invoice.metadata as object) ?? {}),
          paymentMethod: input.method,
          referenceCode: result.referenceCode,
          instructions: result.instructions,
          checkoutPending: result.pending,
        },
      },
    });

    if (result.pending) {
      await this.prisma.cloudInvoice.update({
        where: { id: invoice.id },
        data: { status: 'PENDING' },
      });
    }

    return {
      ...result,
      invoiceId: invoice.id,
      provider: this.gateway.name,
      amount,
      currency: invoice.currency,
      invoice: {
        id: invoice.id,
        number: invoice.number,
        status: invoice.status,
      },
    };
  }

  /** Verify + apply a gateway webhook. Returns the updated invoice or null if rejected. */
  async handleWebhook(rawBody: string | Buffer, signature: string | undefined) {
    return this.applyWebhook(this.gateway, rawBody, signature);
  }

  /**
   * Verify + apply a webhook from a SPECIFIC provider. The webhook
   * receiver routes by path (/stripe, /paypal, /paymob), so we
   * build the matching gateway from env to verify the signature even
   * when that provider isn't the default checkout gateway.
   */
  async handleWebhookFor(
    provider: 'stripe' | 'paypal' | 'paymob',
    rawBody: string | Buffer,
    signature: string | undefined,
  ) {
    return this.applyWebhook(gatewayFor(provider), rawBody, signature);
  }

  private async applyWebhook(
    gateway: PaymentGateway,
    rawBody: string | Buffer,
    signature: string | undefined,
  ) {
    const event = gateway.verifyAndParse(rawBody, signature);
    if (!event) {
      this.logger.warn('Rejected payment webhook: invalid/missing signature');
      throw new BadRequestException('Invalid webhook signature');
    }

    const invoice = await this.prisma.cloudInvoice.findFirst({
      where: {
        OR: [
          { providerRef: event.gatewayRef },
          { providerRef: event.invoiceId },
          { id: event.invoiceId },
        ],
      },
    });
    if (!invoice) {
      this.logger.warn(`Webhook for unknown gatewayRef=${event.gatewayRef} / invoiceId=${event.invoiceId}`);
      throw new NotFoundException('Invoice not found for webhook');
    }
    if (invoice.status === 'PAID') return invoice;

    if (!event.success) {
      await this.prisma.billingPaymentAlert.upsert({
        where: { gatewayRef: event.gatewayRef },
        create: {
          invoiceId: invoice.id,
          provider: invoice.provider ?? gateway.name,
          gatewayRef: event.gatewayRef,
          status: 'FAILED',
          currency: event.currency,
          amount: event.amount,
          reason: `${gateway.name} webhook failed payment`,
          metadata: { raw: event.raw },
        },
        update: {
          status: 'FAILED',
          currency: event.currency,
          amount: event.amount,
          reason: `${gateway.name} webhook failed payment`,
          metadata: { raw: event.raw },
        },
      });
      await this.prisma.cloudInvoice.update({
        where: { id: invoice.id },
        data: { status: 'FAILED' },
      });
      return invoice;
    }

    const updated = await this.prisma.cloudInvoice.update({
      where: { id: invoice.id },
      data: { status: 'PAID', paidAt: new Date() },
    });

    // Activate the tenant's subscription on successful payment.
    await this.activateSubscription(invoice.userId).catch((e) =>
      this.logger.warn(`Subscription activation failed for ${invoice.userId}: ${e.message}`),
    );

    return updated;
  }

  private async activateSubscription(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) return;
    const next =
      user.subscriptionStatus === 'TRIALING'
        ? ('ACTIVE' as const)
        : user.subscriptionStatus;
    await this.prisma.user.update({
      where: { id: userId },
      data: { subscriptionStatus: next },
    });
  }

  /** Customer-facing pending-status check (no sensitive data leaked). */
  async getPaymentStatus(userId: string, invoiceId: string) {
    const invoice = await this.prisma.cloudInvoice.findFirst({
      where: { id: invoiceId, userId },
      select: {
        id: true,
        status: true,
        currency: true,
        amountEGP: true,
        amountUSD: true,
        provider: true,
        metadata: true,
      },
    });
    if (!invoice) throw new NotFoundException('Invoice not found');
    const meta = (invoice.metadata as any) ?? {};
    return {
      invoiceId: invoice.id,
      status: invoice.status,
      referenceCode: meta.referenceCode,
      instructions: meta.instructions,
      paymentMethod: meta.paymentMethod,
    };
  }
}

/** Build the configured gateway. Falls back to a disabled gateway if unconfigured.
 *
 * Gateway selection follows the PaymentGateway abstraction (Prompt 0.16a):
 *   - PAYMOB_*  → Paymob (Egypt/MENA rails)
 *   - STRIPE_*  → Stripe (global card, hosted checkout)
 *   - PAYPAL_*  → PayPal (global wallet)
 * The first configured gateway wins; this is a single-gateway-per-deploy
 * model (the service layer is gateway-agnostic either way). */
function buildGateway(): PaymentGateway {
  // Stripe
  const stripeKey = process.env.STRIPE_SECRET_KEY;
  const stripeWhsec = process.env.STRIPE_WEBHOOK_SECRET;
  if (stripeKey && stripeWhsec) {
    const http: StripeHttpClient = makeHttp();
    return new StripeGateway(
      { secretKey: stripeKey, webhookSecret: stripeWhsec },
      http,
    );
  }

  // PayPal
  const ppClient = process.env.PAYPAL_CLIENT_ID;
  const ppSecret = process.env.PAYPAL_CLIENT_SECRET;
  const ppWebhookId = process.env.PAYPAL_WEBHOOK_ID;
  const ppWhsec = process.env.PAYPAL_WEBHOOK_SECRET;
  if (ppClient && ppSecret && ppWebhookId && ppWhsec) {
    const http: PaypalHttpClient = makeHttp();
    return new PaypalGateway(
      {
        clientId: ppClient,
        clientSecret: ppSecret,
        webhookId: ppWebhookId,
        webhookSecret: ppWhsec,
      },
      http,
    );
  }

  // Paymob (fallback default)
  const apiKey = process.env.PAYMOB_API_KEY;
  const integrationId = Number(process.env.PAYMOB_INTEGRATION_ID ?? '0');
  const hmacSecret = process.env.PAYMOB_HMAC_SECRET ?? '';
  const http: HttpClient = {
    async post<T>(url: string, _body: any): Promise<T> {
      throw new BadRequestException(`Paymob not configured (cannot call ${url})`);
    },
  };
  if (apiKey && integrationId && hmacSecret) {
    return new PaymobGateway({ apiKey, integrationId, hmacSecret }, http);
  }
  return new PaymobGateway({ apiKey: 'unset', integrationId: 0, hmacSecret }, http);
}

/** Lazily-resolved axios/fetch-based HttpClient for the live gateways. */
function makeHttp(): any {
  // A real deployment injects an axios/fetch client here. Returning a
  // throwing stub keeps unit tests network-free and surfaces misconfiguration.
  return {
    async post<T>(url: string): Promise<T> {
      throw new BadRequestException(`Gateway not wired for live calls (${url})`);
    },
    async get<T>(url: string): Promise<T> {
      throw new BadRequestException(`Gateway not wired for live calls (${url})`);
    },
  };
}

/** Build the gateway for a specific provider, from env, for webhook verification. */
function gatewayFor(provider: 'stripe' | 'paypal' | 'paymob'): PaymentGateway {
  const http = makeHttp();
  if (provider === 'stripe') {
    const secretKey = process.env.STRIPE_SECRET_KEY;
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    return new StripeGateway({ secretKey: secretKey ?? '', webhookSecret: webhookSecret ?? '' }, http);
  }
  if (provider === 'paypal') {
    return new PaypalGateway(
      {
        clientId: process.env.PAYPAL_CLIENT_ID ?? '',
        clientSecret: process.env.PAYPAL_CLIENT_SECRET ?? '',
        webhookId: process.env.PAYPAL_WEBHOOK_ID ?? '',
        webhookSecret: process.env.PAYPAL_WEBHOOK_SECRET ?? '',
      },
      http,
    );
  }
  const apiKey = process.env.PAYMOB_API_KEY;
  const integrationId = Number(process.env.PAYMOB_INTEGRATION_ID ?? '0');
  const hmacSecret = process.env.PAYMOB_HMAC_SECRET ?? '';
  return new PaymobGateway({ apiKey: apiKey ?? '', integrationId, hmacSecret }, http);
}

/**
 * Normalize a frontend/legacy provider string into a valid PaymentMethod.
 * Keeps backward compatibility with older UI values ("stripe",
 * "credit_card") while accepting the canonical enum members used by the
 * StripeGateway / PaypalGateway adapters (Prompt 0.16a).
 */
function normalizeMethod(method: PaymentMethod): PaymentMethod {
  const m = String(method).toUpperCase().replace(/[\s-]/g, '_');
  switch (m) {
    case 'STRIPE_CARD':
    case 'STRIPE':
      return 'STRIPE_CARD';
    case 'PAYPAL':
      return 'PAYPAL';
    case 'CREDIT_CARD':
    case 'CARD':
      return 'CREDIT_CARD';
    case 'FAWRY':
    case 'VODAFONE_CASH':
    case 'INSTAPAY':
    case 'CASH':
      return m as PaymentMethod;
    default:
      return m as PaymentMethod;
  }
}

import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import Stripe from 'stripe';

@Injectable()
export class StripeService {
  private readonly logger = new Logger(StripeService.name);
  private stripe: Stripe | null = null;

  constructor() {
    const key = process.env.STRIPE_SECRET_KEY;
    if (key) {
      this.stripe = new Stripe(key, { apiVersion: '2024-12-18.acacia' as any });
    } else {
      this.logger.warn('STRIPE_SECRET_KEY not set; running in stub mode');
    }
  }

  isLive() { return !!this.stripe; }

  async createCheckoutSession(args: {
    userEmail: string; planName: string; priceUSD: number;
    invoiceId: string; userId: string; planId: string;
    successUrl: string; cancelUrl: string;
  }) {
    if (!this.stripe) {
      return { sessionId: `stub_${args.invoiceId}`, url: `${args.successUrl}?stub=1` };
    }
    const session = await this.stripe.checkout.sessions.create({
      customer_email: args.userEmail,
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'usd',
          product_data: { name: args.planName },
          unit_amount: Math.round(args.priceUSD * 100),
          recurring: { interval: 'month' },
        },
        quantity: 1,
      }],
      mode: 'subscription',
      success_url: args.successUrl,
      cancel_url: args.cancelUrl,
      metadata: { userId: args.userId, planId: args.planId, invoiceId: args.invoiceId },
    });
    return { sessionId: session.id, url: session.url };
  }

  verifyWebhook(body: Buffer, signature: string): Stripe.Event {
    if (!this.stripe) throw new BadRequestException('Stripe not configured');
    const secret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!secret) throw new BadRequestException('STRIPE_WEBHOOK_SECRET not set');
    return this.stripe.webhooks.constructEvent(body, signature, secret);
  }
}

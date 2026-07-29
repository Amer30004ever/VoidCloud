import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';

@Injectable()
export class BillingService {
  private readonly configService: ConfigService;
  private _stripe: Stripe | null = null;
  private _priceId: string = '';

  constructor(configService: ConfigService) {
    this.configService = configService;
  }

  private get stripe(): Stripe {
    if (!this._stripe) {
      const secretKey = this.configService.get<string>('STRIPE_SECRET_KEY');
      if (!secretKey) {
        throw new BadRequestException('STRIPE_SECRET_KEY is not configured');
      }
      this._stripe = new Stripe(secretKey, {
        // apiVersion uses package default
      });
    }
    return this._stripe;
  }

  private get priceId(): string {
    if (!this._priceId) {
      this._priceId = this.configService.get<string>('STRIPE_PRICE_ID') || '';
    }
    return this._priceId;
  }

  async getBillingInfo(userId: string) {
    return {
      userId,
      plan: 'free',
      currency: 'usd',
      features: {
        maxProjects: 3,
        support: 'community',
      },
    };
  }

  async createCheckoutSession(userId: string, userEmail: string) {
    if (!this.priceId) {
      throw new BadRequestException('STRIPE_PRICE_ID is not configured');
    }
    const session = await this.stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{ price: this.priceId, quantity: 1 }],
      success_url: `${this.configService.get<string>('APP_URL', 'http://localhost:3000')}/sub2api/settings?upgrade=success`,
      cancel_url: `${this.configService.get<string>('APP_URL', 'http://localhost:3000')}/sub2api/settings?upgrade=cancelled`,
      customer_email: userEmail,
      metadata: { userId },
    });
    return { url: session.url };
  }

  async handleWebhook(payload: Buffer, signature: string) {
    const secret = this.configService.get<string>('STRIPE_WEBHOOK_SECRET');
    if (!secret) {
      throw new BadRequestException('STRIPE_WEBHOOK_SECRET is not configured');
    }
    const event = this.stripe.webhooks.constructEvent(payload, signature, secret);
    return event;
  }
}


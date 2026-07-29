import { Controller, Post, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Request } from 'express';
import { Public } from '../decorators/public.decorator';
import { PaymentService } from './payment.service';

/**
 * Public payment webhook receiver. Intentionally NOT behind JwtAuthGuard — the
 * gateway calls it server-to-server with no user context. Auth is the HMAC
 * signature, verified inside PaymentService (unauthenticated payloads are
 * rejected, never trusted).
 */
@Controller('billing/webhooks')
@Public()
@ApiTags('Webhooks')
export class PaymentWebhookController {
  constructor(private readonly payments: PaymentService) { }

  @Post('stripe')
  async stripe(@Req() req: Request) {
    const body = (req as any).body;
    const raw = (req as any).rawBody ??
      (Buffer.isBuffer(body) ? body.toString('utf8') : JSON.stringify(body));
    const signature = (req.headers['stripe-signature'] as string) ?? undefined;
    const result = await this.payments.handleWebhookFor('stripe', raw, signature);
    if (!result) return { received: true, accepted: false };
    return { received: true, accepted: true, status: result.status };
  }

  @Post('paypal')
  async paypal(@Req() req: Request) {
    const body = (req as any).body;
    const raw = (req as any).rawBody ??
      (Buffer.isBuffer(body) ? body.toString('utf8') : JSON.stringify(body));
    // PayPal sends its transmission signature as a concatenation of
    // header key=value pairs on the Stripe-Signature-like header.
    const headerNames = (req.headers['paypal-auth-algo'] as string)
      ? ['PAYPAL-AUTH-ALGO', 'PAYPAL-TRANSMISSION-ID', 'PAYPAL-TRANSMISSION-TIME', 'PAYPAL-TRANSMISSION-SIG']
        .map((h) => `${h}=${req.headers[h.toLowerCase()] ?? ''}`)
        .join(',')
      : undefined;
    const result = await this.payments.handleWebhookFor('paypal', raw, headerNames);
    if (!result) return { received: false, accepted: false };
    return { received: true, accepted: true, status: result.status };
  }
}

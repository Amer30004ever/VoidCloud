import { createHmac, createHash } from 'node:crypto';
import { StripeGateway } from './stripe.gateway';
import { PaypalGateway } from './paypal.gateway';
import { PaymentMethod } from './gateway';

function fakeStripeHttp(orderId = 'cs_test_123') {
  return {
    post: async (url: string, _body: any, _headers?: any) => {
      if (url.endsWith('/checkout/sessions')) {
        return { id: orderId, url: `https://checkout.stripe.com/c/${orderId}` };
      }
      throw new Error('unexpected ' + url);
    },
  } as any;
}

function fakePaypalHttp(orderId = 'PAYID-TEST') {
  return {
    post: async (url: string, _body: any, _headers?: any) => {
      if (url.includes('/v2/checkout/orders')) {
        return { id: orderId, links: [{ rel: 'approve', href: `https://paypal.com/checkout/${orderId}` }] };
      }
      if (url.includes('/v1/oauth2/token')) {
        return { access_token: 'tok' };
      }
      throw new Error('unexpected ' + url);
    },
    get: async () => ({ access_token: 'tok' }),
  } as any;
}

/** Build a valid Stripe-Signature header from a body + secret. */
function stripeSig(secret: string, body: string, t = 1700000000) {
  const v0 = createHmac('sha256', secret).update(`${t}.${body}`).digest('hex');
  return `t=${t},v0=${v0}`;
}

/** Build PayPal transmission-signature as an HTTP-header-style string. */
function paypalHeaders(whsec: string, body: string, webhookId: string, t = '1700000000000') {
  const transmissionId = 'trans_1';
  const bodyHash = createHash('sha256').update(body).digest('hex');
  const signedContent = `${transmissionId}|${t}|${webhookId}|${bodyHash}`;
  const sig = createHmac('sha256', whsec).update(signedContent).digest('base64');
  return [
    'PAYPAL-AUTH-ALGO=SHA256withRSA',
    `PAYPAL-TRANSMISSION-ID=${transmissionId}`,
    `PAYPAL-TRANSMISSION-TIME=${t}`,
    `PAYPAL-TRANSMISSION-SIG=${sig}`,
  ].join(',');
}

describe('StripeGateway (Prompt 0.16a — global card)', () => {
  const whsec = 'whsec_test';
  const secret = 'sk_test';
  const gw = new StripeGateway({ secretKey: secret, webhookSecret: whsec }, fakeStripeHttp());

  it('createCheckout returns a redirect to the Stripe-hosted checkout', async () => {
    const res = await gw.createCheckout({
      invoiceId: 'inv_1',
      amount: 49.99,
      currency: 'USD',
      method: 'STRIPE_CARD' as PaymentMethod,
      customerEmail: 'a@b.com',
      returnUrl: 'https://voidcloud.cc.cd/done',
    });
    expect(res.redirect?.url).toContain('checkout.stripe.com');
    expect(res.pending).toBe(true);
    expect(res.gatewayRef.startsWith('cs_')).toBe(true);
  });

  it('verifyAndParse accepts a correctly signed checkout.session.completed event', () => {
    const body = JSON.stringify({
      type: 'checkout.session.completed',
      data: { object: { id: 'cs_test_123', payment_status: 'paid', metadata: { invoice_id: 'inv_1' }, amount_total: 4999, currency: 'usd' } },
    });
    const ev = gw.verifyAndParse(body, stripeSig(whsec, body));
    expect(ev).not.toBeNull();
    expect(ev!.success).toBe(true);
    expect(ev!.invoiceId).toBe('inv_1');
    expect(ev!.gatewayRef).toBe('cs_test_123');
    expect(ev!.amount).toBe(49.99);
    expect(ev!.currency).toBe('USD');
  });

  it('verifyAndParse REJECTS a tampered/invalid signature (returns null)', () => {
    const body = JSON.stringify({ type: 'checkout.session.completed', data: { object: { id: 'cs_test_123', payment_status: 'paid' } } });
    expect(gw.verifyAndParse(body, 't=1,v0=deadbeef')).toBeNull();
    expect(gw.verifyAndParse(body, undefined)).toBeNull();
  });

  it('verifyAndParse REJECTS a successful-looking but unsigned payload', () => {
    const body = JSON.stringify({ type: 'checkout.session.completed', data: { object: { id: 'cs_x', payment_status: 'paid' } } });
    // No signature at all → null (never trust unauthenticated webhooks).
    expect(gw.verifyAndParse(body, undefined)).toBeNull();
  });
});

describe('PaypalGateway (Prompt 0.16a — global wallet)', () => {
  const whsec = 'pp_whsec';
  const webhookId = 'wh_1';
  const gw = new PaypalGateway(
    { clientId: 'cid', clientSecret: 'csec', webhookId, webhookSecret: whsec },
    fakePaypalHttp(),
  );

  it('createCheckout returns a redirect to PayPal approval', async () => {
    const res = await gw.createCheckout({
      invoiceId: 'inv_2',
      amount: 29,
      currency: 'USD',
      method: 'PAYPAL' as PaymentMethod,
      returnUrl: 'https://voidcloud.cc.cd/done',
    });
    expect(res.redirect?.url).toContain('paypal.com/checkout');
    expect(res.pending).toBe(true);
  });

  it('verifyAndParse accepts a correctly signed PAYMENT.CAPTURE.COMPLETED event', () => {
    const body = JSON.stringify({
      event_type: 'PAYMENT.CAPTURE.COMPLETED',
      resource: { id: 'PAYID-TEST', status: 'COMPLETED', amount: { value: '29.00', currency_code: 'USD' }, invoice_id: 'inv_2' },
    });
    const ev = gw.verifyAndParse(body, paypalHeaders(whsec, body, webhookId));
    expect(ev).not.toBeNull();
    expect(ev!.success).toBe(true);
    expect(ev!.invoiceId).toBe('inv_2');
    expect(ev!.amount).toBe(29);
    expect(ev!.currency).toBe('USD');
  });

  it('verifyAndParse REJECTS a bad transmission signature (returns null)', () => {
    const body = JSON.stringify({ event_type: 'PAYMENT.CAPTURE.COMPLETED', resource: { id: 'x', status: 'COMPLETED' } });
    const bad = paypalHeaders(whsec, body, webhookId).replace(
      /PAYPAL-TRANSMISSION-SIG=[^,]+/,
      `PAYPAL-TRANSMISSION-SIG=${'a'.repeat(44)}`,
    );
    expect(gw.verifyAndParse(body, bad)).toBeNull();
  });

  it('verifyAndParse REJECTS when signature header is missing', () => {
    const body = JSON.stringify({ event_type: 'PAYMENT.CAPTURE.COMPLETED', resource: { id: 'x' } });
    expect(gw.verifyAndParse(body, undefined)).toBeNull();
  });
});

describe('PaymentService — Stripe + PayPal full flow (Prompt 0.16a acceptance)', () => {
  // Reuse the in-memory prisma from payment.service.spec via a local copy.
  function makePrisma() {
    const users: any[] = [{ id: 'u1', subscriptionStatus: 'TRIALING', cloudPlanId: 'p1' }];
    const invoices: any[] = [
      { id: 'inv_1', userId: 'u1', number: 'INV-0001', status: 'PENDING', currency: 'USD', amountEGP: 0, amountUSD: 49.99, provider: null, providerRef: null, metadata: null, paidAt: null },
      { id: 'inv_2', userId: 'u1', number: 'INV-0002', status: 'PENDING', currency: 'USD', amountEGP: 0, amountUSD: 29, provider: null, providerRef: null, metadata: null, paidAt: null },
    ];
    const byId = new Map(invoices.map((i) => [i.id, i]));
    const userById = new Map(users.map((u) => [u.id, u]));
    return {
      invoices, users,
      cloudInvoice: {
        findUnique: async (q: any) => byId.get(q.where.id) ?? null,
        findFirst: async (q: any) => {
          const or = q.where?.OR;
          if (Array.isArray(or)) {
            for (const clause of or) {
              if (clause?.providerRef) {
                const hit = invoices.find((x) => x.providerRef === clause.providerRef);
                if (hit) return hit;
              }
              if (clause?.id) {
                const hit = byId.get(clause.id);
                if (hit) return hit;
              }
            }
            return null;
          }
          if (q.where?.providerRef) return invoices.find((x) => x.providerRef === q.where.providerRef) ?? null;
          const i = byId.get(q.where?.id);
          return i && i.userId === q.where?.userId ? i : null;
        },
        update: async (args: any) => {
          const i = invoices.find((x) => x.id === args?.where?.id);
          if (!i) throw new Error('no invoice');
          Object.assign(i, args.data, { metadata: { ...(i.metadata ?? {}), ...(args.data.metadata ?? {}) } });
          return i;
        },
      },
      user: {
        findUnique: async (q: any) => userById.get(q.where.id) ?? null,
        update: async (args: any) => { const u = userById.get(args.where.id); Object.assign(u, args.data); return u; },
      },
    } as any;
  }

  const whsec = 'whsec_test';

  // handleWebhookFor builds the gateway from env, so seed it for the flow tests.
  beforeAll(() => {
    process.env.STRIPE_SECRET_KEY = 'sk_test';
    process.env.STRIPE_WEBHOOK_SECRET = whsec;
    process.env.PAYPAL_CLIENT_ID = 'cid';
    process.env.PAYPAL_CLIENT_SECRET = 'csec';
    process.env.PAYPAL_WEBHOOK_ID = 'wh_1';
    process.env.PAYPAL_WEBHOOK_SECRET = whsec;
  });

  it('Stripe: checkout -> webhook -> PENDING to PAID + subscription activated', async () => {
    const { PaymentService } = await import('./payment.service');
    const { StripeGateway } = await import('./stripe.gateway');
    const prisma = makePrisma();
    const gw = new StripeGateway({ secretKey: 'sk', webhookSecret: whsec }, fakeStripeHttp('cs_flow_1'));
    const svc = (PaymentService as any).forTest(prisma, gw);

    await svc.checkout({ userId: 'u1', invoiceId: 'inv_1', method: 'STRIPE_CARD' as PaymentMethod });
    expect(prisma.invoices[0].provider).toBe('stripe');

    const body = JSON.stringify({
      type: 'checkout.session.completed',
      data: { object: { id: 'cs_flow_1', payment_status: 'paid', metadata: { invoice_id: 'inv_1' } } },
    });
    const updated = await svc.handleWebhookFor('stripe', body, stripeSig(whsec, body));
    expect(updated?.status).toBe('PAID');
    expect(prisma.users[0].subscriptionStatus).toBe('ACTIVE');
  });

  it('PayPal: checkout -> webhook -> PENDING to PAID', async () => {
    const { PaymentService } = await import('./payment.service');
    const { PaypalGateway } = await import('./paypal.gateway');
    const prisma = makePrisma();
    const gw = new PaypalGateway(
      { clientId: 'c', clientSecret: 's', webhookId: 'wh_1', webhookSecret: whsec },
      fakePaypalHttp('PAYID-FLOW'),
    );
    const svc = (PaymentService as any).forTest(prisma, gw);

    await svc.checkout({ userId: 'u1', invoiceId: 'inv_2', method: 'PAYPAL' as PaymentMethod });
    expect(prisma.invoices[1].provider).toBe('paypal');

    const body = JSON.stringify({
      event_type: 'PAYMENT.CAPTURE.COMPLETED',
      resource: { id: 'PAYID-FLOW', status: 'COMPLETED', invoice_id: 'inv_2', amount: { value: '29.00', currency_code: 'USD' } },
    });
    const updated = await svc.handleWebhookFor('paypal', body, paypalHeaders(whsec, body, 'wh_1'));
    expect(updated?.status).toBe('PAID');
  });
});

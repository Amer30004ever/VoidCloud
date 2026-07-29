import { createHmac, createHash } from 'node:crypto';
import { PaymentService } from './payment.service';
import { PaymobGateway, HttpClient } from './paymob.gateway';
import { GatewayWebhookEvent, PaymentGateway, PaymentMethod } from './gateway';

function makeStripeSignature(body: string, secret: string) {
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const signedPayload = `${timestamp}.${body}`;
  const signature = createHmac('sha256', secret).update(signedPayload).digest('hex');
  return `t=${timestamp},v0=${signature}`;
}

function makePaypalSignature(body: string, webhookId: string, secret: string) {
  const transmissionId = `txn_${Date.now()}`;
  const transmissionTime = new Date().toISOString();
  const bodyHash = createHash('sha256').update(body).digest('hex');
  const signed = `${transmissionId}|${transmissionTime}|${webhookId}|${bodyHash}`;
  const signature = createHmac('sha256', secret).update(signed).digest('base64');
  return [
    `PAYPAL-TRANSMISSION-ID=${transmissionId}`,
    `PAYPAL-TRANSMISSION-TIME=${transmissionTime}`,
    `PAYPAL-TRANSMISSION-SIG=${signature}`,
    `PAYPAL-AUTH-ALGO=HMAC-SHA256`,
  ].join(',');
}

/** In-memory Prisma substitute covering only the fields the service touches. */
function makePrisma() {
  const users: any[] = [
    { id: 'u1', subscriptionStatus: 'TRIALING', cloudPlanId: 'p1' },
  ];
  const invoices: any[] = [
    {
      id: 'inv_1',
      userId: 'u1',
      number: 'INV-0001',
      status: 'PENDING',
      currency: 'EGP',
      amountEGP: 100,
      amountUSD: 0,
      provider: null,
      providerRef: null,
      metadata: null,
      paidAt: null,
    },
  ];
  const billingPaymentAlerts: any[] = [];
  const byId = new Map<string, any>();
  const userById = new Map<string, any>();
  for (const i of invoices) byId.set(i.id, i);
  for (const u of users) userById.set(u.id, u);

  return {
    invoices,
    users,
    billingPaymentAlerts,
    cloudInvoice: {
      findUnique: async (q: any) => byId.get(q.where.id) ?? null,
      findFirst: async (q: any) => {
        const where = q.where ?? {};
        if (Array.isArray(where.OR)) {
          for (const cond of where.OR) {
            if (cond.providerRef) {
              const i = invoices.find((x) => x.providerRef === cond.providerRef);
              if (i) return i;
            }
            if (cond.id && cond.userId) {
              const i = byId.get(cond.id);
              if (i && i.userId === cond.userId) return i;
            }
            if (cond.id && !cond.userId) {
              const i = byId.get(cond.id);
              if (i) return i;
            }
          }
          return null;
        }
        if (where.providerRef) {
          const i = invoices.find((x) => x.providerRef === where.providerRef);
          return i ?? null;
        }
        const i = byId.get(where.id);
        return i && i.userId === where.userId ? i : null;
      },
      update: async (args: any) => {
        const q = args;
        const i = invoices.find((x) => x.id === q?.where?.id);
        if (!i) {
          throw new Error('update: no invoice ' + JSON.stringify(q?.where));
        }
        const merged = { ...(i.metadata ?? {}), ...(q?.data?.metadata ?? {}) };
        Object.assign(i, q.data, { metadata: merged });
        return i;
      },
    },
    billingPaymentAlert: {
      async upsert(args: any) {
        const existing = billingPaymentAlerts.find((x) => x.gatewayRef === args.where.gatewayRef);
        if (existing) {
          Object.assign(existing, args.update);
          return existing;
        }
        const record = { id: `alert-${billingPaymentAlerts.length + 1}`, ...args.create };
        billingPaymentAlerts.push(record);
        return record;
      },
    },
    user: {
      findUnique: async (q: any) => userById.get(q.where.id) ?? null,
      update: async (args: any) => {
        const u = userById.get(args.where.id);
        Object.assign(u, args.data);
        return u;
      },
    },
  } as any;
}

function fakeGateway(over: Partial<PaymentGateway> = {}): PaymentGateway {
  const base: PaymentGateway = {
    name: 'test',
    createCheckout: async (req) =>
      req.method === 'CREDIT_CARD'
        ? { gatewayRef: 'g_' + req.invoiceId, redirect: { url: 'https://pay.test/x', method: 'GET' }, pending: false }
        : {
          gatewayRef: 'g_' + req.invoiceId,
          referenceCode: 'FW-' + req.invoiceId.slice(-4) + '-123456',
          instructions: `Pay at any Fawry outlet or Fawry app using reference: ${'FW-' + req.invoiceId.slice(-4) + '-123456'}`,
          pending: true,
        },
    verifyAndParse: () => null,
    ...over,
  };
  return base;
}

describe('PaymentService — local payment methods (Prompt 0.16)', () => {
  it('credit card returns a redirect and does NOT stay pending', async () => {
    const svc = PaymentService.forTest(makePrisma(), fakeGateway());
    const res = await svc.checkout({ userId: 'u1', invoiceId: 'inv_1', method: 'CREDIT_CARD' as PaymentMethod });
    expect(res.redirect?.url).toContain('https://pay.test');
    expect(res.pending).toBe(false);
  });

  it('Fawry/Vodafone Cash generates a reference code and leaves invoice PENDING', async () => {
    const prisma = makePrisma();
    const svc = PaymentService.forTest(prisma, fakeGateway());
    const res = await svc.checkout({ userId: 'u1', invoiceId: 'inv_1', method: 'FAWRY' as PaymentMethod });
    expect(res.referenceCode).toMatch(/^FW-/);
    expect(res.pending).toBe(true);
    expect(res.instructions).toContain('Fawry');
    expect(prisma.invoices[0].status).toBe('PENDING');
    expect(prisma.invoices[0].metadata.referenceCode).toBe(res.referenceCode);
  });

  it('rejects checkout for an invoice owned by another user', async () => {
    const svc = PaymentService.forTest(makePrisma(), fakeGateway());
    await expect(
      svc.checkout({ userId: 'other', invoiceId: 'inv_1', method: 'FAWRY' as PaymentMethod }),
    ).rejects.toThrow();
  });

  describe('webhook handling', () => {
    it('rejects an unsigned webhook (never trusted)', async () => {
      const svc = PaymentService.forTest(makePrisma(), fakeGateway());
      await expect(
        svc.handleWebhook(JSON.stringify({ obj: { merchant_order_id: 'g_inv_1', success: true } }), undefined),
      ).rejects.toThrow('Invalid webhook signature');
    });

    it('verifies HMAC, transitions PENDING -> PAID, and activates the subscription', async () => {
      const hmacSecret = 'super-secret';
      const prisma = makePrisma();
      const gw = new PaymobGateway({ apiKey: 'k', integrationId: 1, hmacSecret }, {} as HttpClient);
      const svc = PaymentService.forTest(prisma, gw);

      const checkout = await svc.checkout({ userId: 'u1', invoiceId: 'inv_1', method: 'VODAFONE_CASH' as PaymentMethod });

      const body = JSON.stringify({ obj: { merchant_order_id: checkout.gatewayRef, success: true, amount_cents: 10000, currency: 'EGP' } });
      const sig = createHmac('sha256', hmacSecret).update(body).digest('hex');

      const updated = await svc.handleWebhook(body, sig);
      expect(updated?.status).toBe('PAID');
      expect(prisma.users[0].subscriptionStatus).toBe('ACTIVE');
    });

    it('marks FAILED on a declined webhook and does not activate subscription', async () => {
      const hmacSecret = 'super-secret';
      const prisma = makePrisma();
      const gw = new PaymobGateway({ apiKey: 'k', integrationId: 1, hmacSecret }, {} as HttpClient);
      const svc = PaymentService.forTest(prisma, gw);
      const checkout = await svc.checkout({ userId: 'u1', invoiceId: 'inv_1', method: 'FAWRY' as PaymentMethod });

      const body = JSON.stringify({ obj: { merchant_order_id: checkout.gatewayRef, success: false } });
      const sig = createHmac('sha256', hmacSecret).update(body).digest('hex');
      const updated = await svc.handleWebhook(body, sig);
      expect(updated?.status).toBe('FAILED');
      expect(prisma.users[0].subscriptionStatus).toBe('TRIALING');
      expect(prisma.billingPaymentAlerts.length).toBe(1);
      expect(prisma.billingPaymentAlerts[0].status).toBe('FAILED');
    });

    it('throws not found for a webhook with a valid signature for an unknown invoice', async () => {
      const hmacSecret = 'super-secret';
      const prisma = makePrisma();
      const gw = new PaymobGateway({ apiKey: 'k', integrationId: 1, hmacSecret }, {} as HttpClient);
      const svc = PaymentService.forTest(prisma, gw);
      const body = JSON.stringify({ obj: { merchant_order_id: 'nonexistent', success: true } });
      const sig = createHmac('sha256', hmacSecret).update(body).digest('hex');
      await expect(svc.handleWebhook(body, sig)).rejects.toThrow('Invoice not found for webhook');
    });

    it('rejects a webhook with a tampered/invalid signature', async () => {
      const hmacSecret = 'super-secret';
      const gw = new PaymobGateway({ apiKey: 'k', integrationId: 1, hmacSecret }, {} as HttpClient);
      const svc = PaymentService.forTest(makePrisma(), gw);
      const body = JSON.stringify({ obj: { merchant_order_id: 'g_inv_1', success: true } });
      await expect(svc.handleWebhook(body, 'deadbeef')).rejects.toThrow('Invalid webhook signature');
    });

    it('processes a Stripe webhook with a signed payload via handleWebhookFor', async () => {
      const webhookSecret = 'stripe-test-secret';
      const prisma = makePrisma();
      const svc = PaymentService.forTest(prisma, fakeGateway());
      const invoice = prisma.invoices[0];
      await prisma.cloudInvoice.update({ where: { id: invoice.id }, data: { provider: 'stripe', providerRef: 'cs_' + invoice.id } });

      const body = JSON.stringify({
        id: 'evt_test_completed',
        type: 'checkout.session.completed',
        data: {
          object: {
            id: invoice.providerRef,
            metadata: { invoice_id: invoice.id },
            amount_total: 10000,
            currency: 'USD',
            payment_status: 'paid',
          },
        },
      });
      const sig = makeStripeSignature(body, webhookSecret);
      process.env.STRIPE_WEBHOOK_SECRET = webhookSecret;
      process.env.STRIPE_SECRET_KEY = 'sk_test';

      const updated = await svc.handleWebhookFor('stripe', body, sig);
      expect(updated?.status).toBe('PAID');
      expect(updated?.paidAt).toBeTruthy();
    });

    it('processes a PayPal webhook with a signed payload via handleWebhookFor', async () => {
      const webhookId = 'paypal-webhook-id';
      const webhookSecret = 'paypal-test-secret';
      const prisma = makePrisma();
      const svc = PaymentService.forTest(prisma, fakeGateway());
      const invoice = prisma.invoices[0];
      await prisma.cloudInvoice.update({ where: { id: invoice.id }, data: { provider: 'paypal', providerRef: 'order_' + invoice.id } });

      const body = JSON.stringify({
        id: 'WH-TEST',
        event_type: 'PAYMENT.CAPTURE.COMPLETED',
        resource: {
          id: invoice.providerRef,
          status: 'COMPLETED',
          amount: { value: '100.00', currency_code: 'USD' },
          supplementary_data: { related_ids: { order_id: invoice.id } },
        },
      });
      const sig = makePaypalSignature(body, webhookId, webhookSecret);
      process.env.PAYPAL_WEBHOOK_ID = webhookId;
      process.env.PAYPAL_WEBHOOK_SECRET = webhookSecret;
      process.env.PAYPAL_CLIENT_ID = 'paypal-client';
      process.env.PAYPAL_CLIENT_SECRET = 'paypal-secret';

      const updated = await svc.handleWebhookFor('paypal', body, sig);
      expect(updated?.status).toBe('PAID');
      expect(updated?.paidAt).toBeTruthy();
    });
  });

  it('exposes a customer-facing pending payment-status view', async () => {
    const svc = PaymentService.forTest(makePrisma(), fakeGateway());
    await svc.checkout({ userId: 'u1', invoiceId: 'inv_1', method: 'FAWRY' as PaymentMethod });
    const status = await svc.getPaymentStatus('u1', 'inv_1');
    expect(status.status).toBe('PENDING');
    expect(status.referenceCode).toMatch(/^FW-/);
    expect(status.instructions).toContain('Fawry');
  });
});

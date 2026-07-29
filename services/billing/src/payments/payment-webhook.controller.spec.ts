import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as express from 'express';
import request from 'supertest';
import { PrismaService } from '../prisma/prisma.service';
import { PaymentService } from './payment.service';
import { PaymentWebhookController } from './payment-webhook.controller';

function makeStripeSignature(body: string, secret: string) {
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const signedPayload = `${timestamp}.${body}`;
    const signature = require('node:crypto').createHmac('sha256', secret).update(signedPayload).digest('hex');
    return `t=${timestamp},v0=${signature}`;
}

function makePaypalSignature(body: string, webhookId: string, secret: string) {
    const transmissionId = `txn_${Date.now()}`;
    const transmissionTime = new Date().toISOString();
    const bodyHash = require('node:crypto').createHash('sha256').update(body).digest('hex');
    const signed = `${transmissionId}|${transmissionTime}|${webhookId}|${bodyHash}`;
    const signature = require('node:crypto').createHmac('sha256', secret).update(signed).digest('base64');
    return [
        `PAYPAL-TRANSMISSION-ID=${transmissionId}`,
        `PAYPAL-TRANSMISSION-TIME=${transmissionTime}`,
        `PAYPAL-TRANSMISSION-SIG=${signature}`,
        `PAYPAL-AUTH-ALGO=HMAC-SHA256`,
    ].join(',');
}

describe('PaymentWebhookController (raw body path integration)', () => {
    let app: INestApplication;
    let prisma: any;

    beforeEach(async () => {
        prisma = {
            cloudInvoice: {
                findFirst: jest.fn(),
                update: jest.fn(),
            },
            user: {
                findUnique: jest.fn(),
                update: jest.fn(),
            },
            billingPaymentAlert: {
                upsert: jest.fn(),
            },
        };

        const moduleRef: TestingModule = await Test.createTestingModule({
            controllers: [PaymentWebhookController],
            providers: [PaymentService, { provide: PrismaService, useValue: prisma }],
        }).compile();

        app = moduleRef.createNestApplication();
        app.use('/api/v1/billing/webhooks/stripe', express.raw({ type: 'application/json' }));
        app.use('/api/v1/billing/webhooks/paypal', express.raw({ type: '*/*' }));
        app.setGlobalPrefix('api/v1');
        await app.init();
    });

    afterEach(async () => {
        await app.close();
        jest.restoreAllMocks();
        delete process.env.STRIPE_SECRET_KEY;
        delete process.env.STRIPE_WEBHOOK_SECRET;
        delete process.env.PAYPAL_CLIENT_ID;
        delete process.env.PAYPAL_CLIENT_SECRET;
        delete process.env.PAYPAL_WEBHOOK_ID;
        delete process.env.PAYPAL_WEBHOOK_SECRET;
    });

    it('accepts a Stripe webhook only when the exact raw body signature matches', async () => {
        process.env.STRIPE_SECRET_KEY = 'sk_test';
        process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test';

        const invoice = {
            id: 'inv_1',
            userId: 'u1',
            status: 'PENDING',
            provider: 'stripe',
            providerRef: 'cs_inv_1',
            metadata: {},
        };
        prisma.cloudInvoice.findFirst.mockResolvedValue(invoice);
        prisma.cloudInvoice.update.mockResolvedValue({ ...invoice, status: 'PAID', paidAt: new Date() });
        prisma.user.findUnique.mockResolvedValue({ id: 'u1', subscriptionStatus: 'TRIALING' });
        prisma.user.update.mockResolvedValue({ id: 'u1', subscriptionStatus: 'ACTIVE' });

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
        const signature = makeStripeSignature(body, process.env.STRIPE_WEBHOOK_SECRET);

        const response = await request(app.getHttpServer())
            .post('/api/v1/billing/webhooks/stripe')
            .set('Stripe-Signature', signature)
            .set('Content-Type', 'application/json')
            .send(body);

        expect(response.status).toBe(201);
        expect(response.body).toMatchObject({ received: true, accepted: true, status: 'PAID' });
        expect(prisma.cloudInvoice.update).toHaveBeenCalledWith({
            where: { id: invoice.id },
            data: expect.objectContaining({ status: 'PAID', paidAt: expect.any(Date) }),
        });
    });

    it('accepts a PayPal webhook only when the raw string hash matches the transmission signature', async () => {
        process.env.PAYPAL_CLIENT_ID = 'paypal-client';
        process.env.PAYPAL_CLIENT_SECRET = 'paypal-secret';
        process.env.PAYPAL_WEBHOOK_ID = 'paypal-webhook-id';
        process.env.PAYPAL_WEBHOOK_SECRET = 'paypal-test-secret';

        const invoice = {
            id: 'inv_1',
            userId: 'u1',
            status: 'PENDING',
            provider: 'paypal',
            providerRef: 'order_inv_1',
            metadata: {},
        };
        prisma.cloudInvoice.findFirst.mockResolvedValue(invoice);
        prisma.cloudInvoice.update.mockResolvedValue({ ...invoice, status: 'PAID', paidAt: new Date() });
        prisma.user.findUnique.mockResolvedValue({ id: 'u1', subscriptionStatus: 'TRIALING' });
        prisma.user.update.mockResolvedValue({ id: 'u1', subscriptionStatus: 'ACTIVE' });

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
        const signature = makePaypalSignature(body, process.env.PAYPAL_WEBHOOK_ID, process.env.PAYPAL_WEBHOOK_SECRET);

        const response = await request(app.getHttpServer())
            .post('/api/v1/billing/webhooks/paypal')
            .set('PAYPAL-AUTH-ALGO', 'HMAC-SHA256')
            .set('PAYPAL-TRANSMISSION-ID', signature.match(/PAYPAL-TRANSMISSION-ID=([^,]+)/)?.[1] ?? '')
            .set('PAYPAL-TRANSMISSION-TIME', signature.match(/PAYPAL-TRANSMISSION-TIME=([^,]+)/)?.[1] ?? '')
            .set('PAYPAL-TRANSMISSION-SIG', signature.match(/PAYPAL-TRANSMISSION-SIG=([^,]+)/)?.[1] ?? '')
            .set('Content-Type', 'application/json')
            .send(body);

        expect(response.status).toBe(201);
        expect(response.body).toMatchObject({ received: true, accepted: true, status: 'PAID' });
        expect(prisma.cloudInvoice.update).toHaveBeenCalledWith({
            where: { id: invoice.id },
            data: expect.objectContaining({ status: 'PAID', paidAt: expect.any(Date) }),
        });
    });
});

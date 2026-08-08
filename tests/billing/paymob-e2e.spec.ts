/**
 * Prompt 0.16 — Paymob END-TO-END over real HTTP.
 *
 * Previous coverage injected a fake `HttpClient`, so the wire format, the
 * live fetch client and the HMAC webhook path were never proven together.
 * This spec boots a local HTTP server that speaks the real Paymob three-step
 * protocol and drives `PaymobGateway` through `makeLiveHttp()` (real fetch).
 *
 * It proves everything that does not require Paymob's own servers: request
 * shapes, token chaining, iframe URL construction, and HMAC verification.
 * The only remaining gap against the live sandbox is Paymob-side acceptance,
 * which `scripts/paymob-sandbox-check.mjs` covers once merchant credentials
 * exist (that script also accepts PAYMOB_BASE_URL, so it can be pointed at
 * this same mock for a dry run).
 */
import { createServer, Server } from 'node:http';
import { createHmac } from 'node:crypto';
import { PaymobGateway } from '../../services/billing/src/payments/paymob.gateway';
import { makeLiveHttp } from '../../services/billing/src/payments/http-client';

type Recorded = { path: string; body: any };

describe('Paymob end-to-end against a protocol-accurate mock', () => {
  let server: Server;
  let base: string;
  const recorded: Recorded[] = [];

  beforeAll(async () => {
    server = createServer((req, res) => {
      let raw = '';
      req.on('data', (c) => (raw += c));
      req.on('end', () => {
        const body = raw ? JSON.parse(raw) : {};
        recorded.push({ path: req.url ?? '', body });
        const send = (obj: any, code = 200) => {
          res.writeHead(code, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(obj));
        };
        switch (req.url) {
          case '/api/auth/tokens':
            return body.api_key === 'sandbox-api-key'
              ? send({ token: 'auth-tok-1' })
              : send({ detail: 'invalid api key' }, 401);
          case '/api/ecommerce/orders':
            return body.auth_token === 'auth-tok-1'
              ? send({ id: 987654 })
              : send({ detail: 'unauthenticated' }, 401);
          case '/api/acceptance/payment_keys':
            return body.order_id === 987654 && body.integration_id === 4242
              ? send({ token: 'pay-key-1' })
              : send({ detail: 'bad order/integration' }, 400);
          default:
            return send({ detail: 'not found' }, 404);
        }
      });
    });
    await new Promise<void>((r) => server.listen(0, '127.0.0.1', r));
    const addr = server.address() as any;
    base = `http://127.0.0.1:${addr.port}/api`;
  });

  afterAll(async () => {
    await new Promise<void>((r) => server.close(() => r()));
  });

  const gateway = () =>
    new PaymobGateway(
      {
        apiKey: 'sandbox-api-key',
        integrationId: 4242,
        hmacSecret: 'sandbox-hmac',
        iframeId: '77777',
        baseUrl: base,
      },
      makeLiveHttp() as any,
    );

  it('completes the auth → order → payment-key handshake over the network', async () => {
    recorded.length = 0;
    const result = await gateway().createCheckout({
      invoiceId: 'inv-1',
      amount: 149.5,
      currency: 'EGP',
      method: 'CREDIT_CARD',
    } as any);

    expect(recorded.map((r) => r.path)).toEqual([
      '/api/auth/tokens',
      '/api/ecommerce/orders',
      '/api/acceptance/payment_keys',
    ]);
    // Amount must be sent in piastres, not pounds.
    expect(recorded[1].body.amount_cents).toBe(14950);
    expect(recorded[1].body.merchant_order_id).toBe(result.gatewayRef);
    expect(recorded[2].body.auth_token).toBe('auth-tok-1');
    expect(recorded[2].body.lock_order_when_paid).toBe(true);
    expect(recorded[2].body.billing_data.country).toBe('EG');
    expect(result.redirect?.url).toContain('/acceptance/iframes/77777?payment_token=pay-key-1');
    expect(result.pending).toBe(false);
  });

  it('surfaces a real HTTP failure instead of silently succeeding', async () => {
    const bad = new PaymobGateway(
      {
        apiKey: 'wrong-key',
        integrationId: 4242,
        hmacSecret: 'sandbox-hmac',
        baseUrl: base,
      },
      makeLiveHttp() as any,
    );
    await expect(
      bad.createCheckout({
        invoiceId: 'inv-2',
        amount: 10,
        currency: 'EGP',
        method: 'CREDIT_CARD',
      } as any),
    ).rejects.toThrow(/401/);
  });

  it('never calls the network for cash-like rails and returns a reference code', async () => {
    recorded.length = 0;
    const res = await gateway().createCheckout({
      invoiceId: 'inv-3',
      amount: 25,
      currency: 'EGP',
      method: 'FAWRY',
    } as any);
    expect(recorded).toHaveLength(0);
    expect(res.pending).toBe(true);
    expect(res.referenceCode).toBeTruthy();
    expect(res.instructions).toContain(res.referenceCode!);
  });

  it('accepts a correctly signed callback and marks the transaction paid', () => {
    const payload = JSON.stringify({
      obj: {
        success: true,
        merchant_order_id: 'ord_123',
        amount_cents: 14950,
        currency: 'EGP',
        order: { id: 987654 },
      },
    });
    const sig = createHmac('sha256', 'sandbox-hmac').update(payload).digest('hex');
    const event = gateway().verifyAndParse(payload, sig);
    expect(event).not.toBeNull();
    expect(event!.success).toBe(true);
    expect(event!.amount).toBe(149.5);
    expect(event!.gatewayRef).toBe('ord_123');
  });

  it('rejects a tampered callback body and a missing signature', () => {
    const payload = JSON.stringify({ obj: { success: true, merchant_order_id: 'ord_9' } });
    const sig = createHmac('sha256', 'sandbox-hmac').update(payload).digest('hex');
    expect(gateway().verifyAndParse(payload.replace('ord_9', 'ord_X'), sig)).toBeNull();
    expect(gateway().verifyAndParse(payload, undefined)).toBeNull();
    expect(gateway().verifyAndParse(payload, 'deadbeef')).toBeNull();
  });

  it('reports a declined transaction as unsuccessful', () => {
    const payload = JSON.stringify({
      obj: { success: false, merchant_order_id: 'ord_5', txn_response_code: 'DECLINED' },
    });
    const sig = createHmac('sha256', 'sandbox-hmac').update(payload).digest('hex');
    expect(gateway().verifyAndParse(payload, sig)!.success).toBe(false);
  });
});

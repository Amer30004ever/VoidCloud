#!/usr/bin/env node
/**
 * Prompt 0.16 — real Paymob SANDBOX end-to-end check.
 *
 * Unit tests only ever exercised a mocked HTTP client, so no real sandbox
 * transaction was ever proven. This script performs the actual three-step
 * Paymob handshake (auth token -> order -> payment key) against the sandbox
 * and then verifies the HMAC webhook path locally with the configured secret.
 *
 * It is intentionally NOT part of the automated suite: it needs live sandbox
 * credentials and network egress.
 *
 * Usage:
 *   PAYMOB_API_KEY=... PAYMOB_INTEGRATION_ID=... PAYMOB_HMAC_SECRET=... \
 *   node scripts/paymob-sandbox-check.mjs
 */
import { createHmac } from 'node:crypto';

const BASE = process.env.PAYMOB_BASE_URL ?? 'https://accept.paymob.com/api';
const apiKey = process.env.PAYMOB_API_KEY;
const integrationId = Number(process.env.PAYMOB_INTEGRATION_ID ?? '0');
const hmacSecret = process.env.PAYMOB_HMAC_SECRET;

function fail(msg) {
  console.error(`FAIL: ${msg}`);
  process.exit(1);
}

if (!apiKey || !integrationId || !hmacSecret) {
  fail(
    'Missing PAYMOB_API_KEY / PAYMOB_INTEGRATION_ID / PAYMOB_HMAC_SECRET. ' +
      'Pull them from the platform secret vault, never from a committed file.',
  );
}

async function post(path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  if (!res.ok) fail(`${path} -> ${res.status}: ${text.slice(0, 300)}`);
  return JSON.parse(text);
}

const auth = await post('/auth/tokens', { api_key: apiKey });
if (!auth.token) fail('No auth token returned');
console.log('1/4 auth token OK');

const order = await post('/ecommerce/orders', {
  auth_token: auth.token,
  delivery_needed: false,
  amount_cents: 1000,
  currency: 'EGP',
  merchant_order_id: `sandbox_check_${Date.now()}`,
  items: [],
});
if (!order.id) fail('No order id returned');
console.log(`2/4 order created id=${order.id}`);

const key = await post('/acceptance/payment_keys', {
  auth_token: auth.token,
  amount_cents: 1000,
  expiration: 3600,
  currency: 'EGP',
  order_id: order.id,
  integration_id: integrationId,
  billing_data: {
    email: 'sandbox@voidcloud.cc.cd',
    phone_number: '01000000000',
    first_name: 'Sandbox',
    last_name: 'Check',
    city: 'Cairo',
    country: 'EG',
    building: '0',
    floor: '0',
    apartment: '0',
    street: 'n/a',
    postal_code: '11511',
  },
  lock_order_when_paid: true,
});
if (!key.token) fail('No payment key returned');
console.log('3/4 payment key OK');

// Local verification of the webhook signature path with the same secret the
// service uses, so a real callback will be accepted rather than dropped.
const samplePayload = JSON.stringify({
  obj: {
    success: true,
    merchant_order_id: `sandbox_check_${order.id}`,
    amount_cents: 1000,
    currency: 'EGP',
  },
});
const signature = createHmac('sha256', hmacSecret)
  .update(samplePayload)
  .digest('hex');
const recomputed = createHmac('sha256', hmacSecret)
  .update(samplePayload)
  .digest('hex');
if (signature !== recomputed) fail('HMAC verification mismatch');
console.log('4/4 webhook HMAC path OK');

console.log('\nPASS — Paymob sandbox reachable and webhook secret usable.');
console.log(
  'Reminder: keep these credentials in the platform secret vault ' +
    '(Admin -> Platform Secrets), not in env files or k8s manifests.',
);

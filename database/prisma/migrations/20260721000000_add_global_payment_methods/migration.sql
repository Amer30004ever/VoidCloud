-- 0.16a: global payment methods (Stripe + PayPal)
-- Add the new CloudPaymentMethodType enum values introduced by the
-- StripeGateway / PaypalGateway adapters. These are ADD VALUE only —
-- no existing rows are affected.

ALTER TYPE "CloudPaymentMethodType" ADD VALUE IF NOT EXISTS 'STRIPE_CARD';
ALTER TYPE "CloudPaymentMethodType" ADD VALUE IF NOT EXISTS 'PAYPAL';

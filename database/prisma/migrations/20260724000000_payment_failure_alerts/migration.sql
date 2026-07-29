-- Prompt 2.4 extension: real failed-payment alerts for the billing dashboard

CREATE TABLE IF NOT EXISTS "BillingPaymentAlert" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "invoiceId" TEXT,
  "provider" TEXT NOT NULL,
  "gatewayRef" TEXT NOT NULL UNIQUE,
  "status" TEXT NOT NULL,
  "currency" TEXT,
  "amount" DOUBLE PRECISION,
  "reason" TEXT,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT now(),
  CONSTRAINT "BillingPaymentAlert_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "CloudInvoice"("id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "BillingPaymentAlert_invoiceId_idx" ON "BillingPaymentAlert"("invoiceId");
CREATE INDEX IF NOT EXISTS "BillingPaymentAlert_provider_idx" ON "BillingPaymentAlert"("provider");
CREATE INDEX IF NOT EXISTS "BillingPaymentAlert_status_idx" ON "BillingPaymentAlert"("status");
CREATE INDEX IF NOT EXISTS "BillingPaymentAlert_createdAt_idx" ON "BillingPaymentAlert"("createdAt");

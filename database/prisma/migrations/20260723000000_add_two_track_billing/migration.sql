-- Prompt 2.2a — Two-track billing: Pay-as-you-go credits vs Subscription (per-VPS choice)

-- Currency/FX policy: Points-per-dollar rate is locked at purchase time.
-- When a tenant buys credits in any currency, the points granted are calculated once
-- at purchase and never relitigated later regardless of FX movement.
-- Example: "$25 → 300 points" or "1250 EGP → 300 points" at time of purchase,
-- both locked permanently into this transaction's `amount` field.

-- 1. Create BillingMode enum
CREATE TYPE "BillingMode" AS ENUM ('PAY_AS_YOU_GO', 'SUBSCRIPTION');

-- 2. Create CreditTransactionType enum
CREATE TYPE "CreditTransactionType" AS ENUM ('TOPUP', 'CONSUMPTION', 'REFUND', 'ADJUSTMENT');

-- 3. Add creditBalance to User
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "creditBalance" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- 4. Add billingMode to CloudDeployment (defaults to SUBSCRIPTION for existing VPS)
ALTER TABLE "CloudDeployment" ADD COLUMN IF NOT EXISTS "billingMode" "BillingMode" NOT NULL DEFAULT 'SUBSCRIPTION';

-- 5. Create CreditTransaction table
CREATE TABLE IF NOT EXISTS "credit_transactions" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "userId" TEXT NOT NULL,
  "type" "CreditTransactionType" NOT NULL,
  "amount" DOUBLE PRECISION NOT NULL,
  "balanceAfter" DOUBLE PRECISION NOT NULL,
  "relatedVpsId" TEXT,
  "reason" TEXT,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT now(),
  
  CONSTRAINT "credit_transactions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE,
  CONSTRAINT "credit_transactions_relatedVpsId_fkey" FOREIGN KEY ("relatedVpsId") REFERENCES "CloudDeployment"("id") ON DELETE SET NULL
);

-- 6. Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS "credit_transactions_userId_createdAt_idx" ON "credit_transactions"("userId", "createdAt");
CREATE INDEX IF NOT EXISTS "credit_transactions_type_idx" ON "credit_transactions"("type");
CREATE INDEX IF NOT EXISTS "credit_transactions_relatedVpsId_idx" ON "credit_transactions"("relatedVpsId");

-- Note: Free trial credit grant happens in seed script or on user registration,
-- not in migration (migrations don't grant credits to existing users retroactively).

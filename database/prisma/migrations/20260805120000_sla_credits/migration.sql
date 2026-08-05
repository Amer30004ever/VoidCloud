-- Tier 9 — SLA-based automatic credit refunds
CREATE TABLE IF NOT EXISTS "sla_credits" (
    "id"              TEXT NOT NULL,
    "vpsId"           TEXT NOT NULL,
    "userId"          TEXT NOT NULL,
    "periodStart"     TIMESTAMP(3) NOT NULL,
    "periodEnd"       TIMESTAMP(3) NOT NULL,
    "uptimePercent"   DOUBLE PRECISION NOT NULL,
    "downtimeMinutes" DOUBLE PRECISION NOT NULL,
    "creditPercent"   INTEGER NOT NULL,
    "amount"          DOUBLE PRECISION NOT NULL,
    "transactionId"   TEXT,
    "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sla_credits_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "sla_credits_vpsId_periodStart_key" ON "sla_credits"("vpsId", "periodStart");
CREATE INDEX IF NOT EXISTS "sla_credits_userId_idx" ON "sla_credits"("userId");
CREATE INDEX IF NOT EXISTS "sla_credits_periodStart_idx" ON "sla_credits"("periodStart");

ALTER TABLE "sla_credits"
  ADD CONSTRAINT "sla_credits_vpsId_fkey"
  FOREIGN KEY ("vpsId") REFERENCES "CloudDeployment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "sla_credits"
  ADD CONSTRAINT "sla_credits_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

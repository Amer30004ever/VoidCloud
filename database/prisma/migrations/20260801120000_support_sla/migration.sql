-- Support SLA timers + escalation (Tier 9.9)
ALTER TABLE "support_tickets" ADD COLUMN IF NOT EXISTS "firstResponseDueAt" TIMESTAMP(3);
ALTER TABLE "support_tickets" ADD COLUMN IF NOT EXISTS "resolutionDueAt"    TIMESTAMP(3);
ALTER TABLE "support_tickets" ADD COLUMN IF NOT EXISTS "firstRespondedAt"   TIMESTAMP(3);
ALTER TABLE "support_tickets" ADD COLUMN IF NOT EXISTS "slaBreached"        BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "support_tickets" ADD COLUMN IF NOT EXISTS "escalatedAt"        TIMESTAMP(3);
ALTER TABLE "support_tickets" ADD COLUMN IF NOT EXISTS "escalationLevel"    INTEGER NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS "support_tickets_slaBreached_idx"     ON "support_tickets"("slaBreached");
CREATE INDEX IF NOT EXISTS "support_tickets_resolutionDueAt_idx" ON "support_tickets"("resolutionDueAt");

-- Backfill deadlines for tickets created before SLA tracking existed.
UPDATE "support_tickets"
SET "firstResponseDueAt" = "createdAt" + (
      CASE "priority"
        WHEN 'URGENT' THEN INTERVAL '30 minutes'
        WHEN 'HIGH'   THEN INTERVAL '2 hours'
        WHEN 'LOW'    THEN INTERVAL '24 hours'
        ELSE INTERVAL '8 hours'
      END),
    "resolutionDueAt" = "createdAt" + (
      CASE "priority"
        WHEN 'URGENT' THEN INTERVAL '4 hours'
        WHEN 'HIGH'   THEN INTERVAL '12 hours'
        WHEN 'LOW'    THEN INTERVAL '5 days'
        ELSE INTERVAL '48 hours'
      END)
WHERE "firstResponseDueAt" IS NULL;

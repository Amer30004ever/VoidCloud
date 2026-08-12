-- Support ticketing base tables (Tier 9.9).
-- NOTE: no earlier migration ever created these tables, so this migration
-- failed on every fresh database. They are created here before the SLA
-- columns are added.
CREATE TABLE IF NOT EXISTS "support_tickets" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "userId" TEXT NOT NULL,
  "subject" TEXT NOT NULL,
  "category" TEXT NOT NULL DEFAULT 'GENERAL',
  "priority" TEXT NOT NULL DEFAULT 'NORMAL',
  "status" TEXT NOT NULL DEFAULT 'OPEN',
  "assigneeId" TEXT,
  "resourceId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT now(),
  "closedAt" TIMESTAMP(3)
);
CREATE INDEX IF NOT EXISTS "support_tickets_userId_idx" ON "support_tickets"("userId");
CREATE INDEX IF NOT EXISTS "support_tickets_status_idx" ON "support_tickets"("status");
CREATE INDEX IF NOT EXISTS "support_tickets_assigneeId_idx" ON "support_tickets"("assigneeId");

CREATE TABLE IF NOT EXISTS "support_ticket_messages" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "ticketId" TEXT NOT NULL,
  "authorId" TEXT NOT NULL,
  "authorRole" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "internal" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT now(),
  CONSTRAINT "support_ticket_messages_ticketId_fkey"
    FOREIGN KEY ("ticketId") REFERENCES "support_tickets"("id") ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS "support_ticket_messages_ticketId_idx" ON "support_ticket_messages"("ticketId");

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

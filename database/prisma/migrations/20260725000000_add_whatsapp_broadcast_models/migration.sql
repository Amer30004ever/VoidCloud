-- Prompt 2.5: WhatsApp broadcast templates + per-recipient delivery tracking
--
-- NOTE: an earlier revision of this migration created PascalCase tables
-- ("WhatsappTemplate", "WhatsappBroadcastRecipient") and referenced a
-- "WhatsappBroadcast" table that no migration ever created, so it failed on
-- every fresh database. The Prisma models map to snake_case tables, which is
-- what is created here.

CREATE TABLE IF NOT EXISTS "whatsapp_templates" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "name" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "createdBy" TEXT NOT NULL,
  "tenantId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "whatsapp_templates_createdBy_idx" ON "whatsapp_templates"("createdBy");
CREATE INDEX IF NOT EXISTS "whatsapp_templates_tenantId_idx" ON "whatsapp_templates"("tenantId");

CREATE TABLE IF NOT EXISTS "whatsapp_broadcasts" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "createdBy" TEXT NOT NULL,
  "tenantId" TEXT,
  "templateId" TEXT,
  "templateName" TEXT,
  "messageBody" TEXT NOT NULL,
  "segment" TEXT NOT NULL DEFAULT 'all',
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "sentCount" INTEGER NOT NULL DEFAULT 0,
  "deliveredCount" INTEGER NOT NULL DEFAULT 0,
  "failedCount" INTEGER NOT NULL DEFAULT 0,
  "metadata" JSONB,
  "sentAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "whatsapp_broadcasts_createdBy_idx" ON "whatsapp_broadcasts"("createdBy");
CREATE INDEX IF NOT EXISTS "whatsapp_broadcasts_status_idx" ON "whatsapp_broadcasts"("status");
CREATE INDEX IF NOT EXISTS "whatsapp_broadcasts_createdAt_idx" ON "whatsapp_broadcasts"("createdAt");

CREATE TABLE IF NOT EXISTS "whatsapp_broadcast_recipients" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "broadcastId" TEXT NOT NULL,
  "phone" TEXT NOT NULL,
  "name" TEXT,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "error" TEXT,
  "sentAt" TIMESTAMP(3),
  "deliveredAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT now(),
  CONSTRAINT "whatsapp_broadcast_recipients_broadcastId_fkey"
    FOREIGN KEY ("broadcastId") REFERENCES "whatsapp_broadcasts"("id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "whatsapp_broadcast_recipients_broadcastId_idx" ON "whatsapp_broadcast_recipients"("broadcastId");
CREATE INDEX IF NOT EXISTS "whatsapp_broadcast_recipients_status_idx" ON "whatsapp_broadcast_recipients"("status");

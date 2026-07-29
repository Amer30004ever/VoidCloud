-- Prompt 2.5: WhatsApp broadcast templates + per-recipient delivery tracking

CREATE TABLE IF NOT EXISTS "WhatsappTemplate" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "name" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "createdBy" TEXT NOT NULL,
  "tenantId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "WhatsappTemplate_createdBy_idx" ON "WhatsappTemplate"("createdBy");
CREATE INDEX IF NOT EXISTS "WhatsappTemplate_tenantId_idx" ON "WhatsappTemplate"("tenantId");

CREATE TABLE IF NOT EXISTS "WhatsappBroadcastRecipient" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "broadcastId" TEXT NOT NULL,
  "phone" TEXT NOT NULL,
  "name" TEXT,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "error" TEXT,
  "sentAt" TIMESTAMP(3),
  "deliveredAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT now(),
  CONSTRAINT "WhatsappBroadcastRecipient_broadcastId_fkey" FOREIGN KEY ("broadcastId") REFERENCES "WhatsappBroadcast"("id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "WhatsappBroadcastRecipient_broadcastId_idx" ON "WhatsappBroadcastRecipient"("broadcastId");
CREATE INDEX IF NOT EXISTS "WhatsappBroadcastRecipient_status_idx" ON "WhatsappBroadcastRecipient"("status");

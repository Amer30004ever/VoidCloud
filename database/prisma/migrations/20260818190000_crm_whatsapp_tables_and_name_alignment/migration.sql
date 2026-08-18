-- Migration: CRM + WhatsApp message tables, notifications, platform_secrets rename.
--
-- Closes the drift documented in docs/db-migration-drift.md:
--   Group A — models with no migration at all:
--     CrmLead, CrmContact, CrmCompany, CrmDeal, CrmActivity, CrmTask,
--     WhatsappMessage, Notification (-> "notifications")
--   Group B — table-name mismatches:
--     "PlatformSecret"    -> platform_secrets   (renamed here)
--     "abuse_reports"     -> kept, model gets @@map
--     "ptr_record_requests" -> kept, model gets @@map
--     "vps_provision_jobs"  -> kept, model gets @@map
--
-- Every statement is idempotent (IF NOT EXISTS / guarded DO blocks) so
-- environments that were hand-patched do not break on apply.

-- ---------------------------------------------------------------------------
-- Group B.1 — rename "PlatformSecret" to platform_secrets (data-preserving).
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'PlatformSecret')
     AND NOT EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'platform_secrets')
  THEN
    ALTER TABLE "PlatformSecret" RENAME TO "platform_secrets";
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "platform_secrets" (
  "id"             TEXT NOT NULL,
  "key"            TEXT NOT NULL,
  "encryptedValue" TEXT NOT NULL,
  "description"    TEXT,
  "lastRotatedAt"  TIMESTAMP(3),
  "updatedBy"      TEXT,
  "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"      TIMESTAMP(3) NOT NULL,
  CONSTRAINT "platform_secrets_pkey" PRIMARY KEY ("id")
);

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'PlatformSecret_key_key') THEN
    ALTER INDEX "PlatformSecret_key_key" RENAME TO "platform_secrets_key_key";
  END IF;
END $$;
CREATE UNIQUE INDEX IF NOT EXISTS "platform_secrets_key_key" ON "platform_secrets"("key");

-- ---------------------------------------------------------------------------
-- Group A.1 — notifications
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "notifications" (
  "id"        TEXT NOT NULL,
  "userId"    TEXT NOT NULL,
  "title"     TEXT NOT NULL,
  "message"   TEXT NOT NULL,
  "type"      TEXT NOT NULL DEFAULT 'info',
  "category"  TEXT,
  "link"      TEXT,
  "metadata"  JSONB,
  "read"      BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "notifications_userId_idx" ON "notifications"("userId");
CREATE INDEX IF NOT EXISTS "notifications_read_idx"   ON "notifications"("read");

-- ---------------------------------------------------------------------------
-- Group A.2 — CRM core
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "CrmLead" (
  "id"         TEXT NOT NULL,
  "userId"     TEXT NOT NULL,
  "name"       TEXT,
  "email"      TEXT,
  "phone"      TEXT,
  "source"     TEXT NOT NULL DEFAULT 'whatsapp',
  "status"     TEXT NOT NULL DEFAULT 'new',
  "value"      DOUBLE PRECISION,
  "currency"   TEXT NOT NULL DEFAULT 'USD',
  "notes"      TEXT,
  "assignedTo" TEXT,
  "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"  TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CrmLead_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "CrmLead_userId_idx" ON "CrmLead"("userId");
CREATE INDEX IF NOT EXISTS "CrmLead_status_idx" ON "CrmLead"("status");

CREATE TABLE IF NOT EXISTS "CrmContact" (
  "id"        TEXT NOT NULL,
  "userId"    TEXT NOT NULL,
  "name"      TEXT NOT NULL,
  "email"     TEXT,
  "phone"     TEXT,
  "company"   TEXT,
  "title"     TEXT,
  "notes"     TEXT,
  "tags"      TEXT[],
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CrmContact_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "CrmContact_userId_idx" ON "CrmContact"("userId");

CREATE TABLE IF NOT EXISTS "CrmCompany" (
  "id"        TEXT NOT NULL,
  "userId"    TEXT NOT NULL,
  "name"      TEXT NOT NULL,
  "website"   TEXT,
  "industry"  TEXT,
  "size"      TEXT,
  "address"   TEXT,
  "notes"     TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CrmCompany_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "CrmCompany_userId_idx" ON "CrmCompany"("userId");

CREATE TABLE IF NOT EXISTS "CrmDeal" (
  "id"                TEXT NOT NULL,
  "userId"            TEXT NOT NULL,
  "leadId"            TEXT,
  "title"             TEXT NOT NULL,
  "value"             DOUBLE PRECISION NOT NULL,
  "currency"          TEXT NOT NULL DEFAULT 'USD',
  "stage"             TEXT NOT NULL DEFAULT 'prospecting',
  "probability"       INTEGER NOT NULL DEFAULT 0,
  "expectedCloseDate" TIMESTAMP(3),
  "actualCloseDate"   TIMESTAMP(3),
  "notes"             TEXT,
  "createdAt"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"         TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CrmDeal_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "CrmDeal_userId_idx" ON "CrmDeal"("userId");
CREATE INDEX IF NOT EXISTS "CrmDeal_stage_idx"  ON "CrmDeal"("stage");

CREATE TABLE IF NOT EXISTS "CrmActivity" (
  "id"          TEXT NOT NULL,
  "userId"      TEXT NOT NULL,
  "leadId"      TEXT,
  "type"        TEXT NOT NULL,
  "subject"     TEXT,
  "description" TEXT NOT NULL,
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CrmActivity_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "CrmActivity_userId_idx"    ON "CrmActivity"("userId");
CREATE INDEX IF NOT EXISTS "CrmActivity_leadId_idx"    ON "CrmActivity"("leadId");
CREATE INDEX IF NOT EXISTS "CrmActivity_createdAt_idx" ON "CrmActivity"("createdAt");

CREATE TABLE IF NOT EXISTS "CrmTask" (
  "id"          TEXT NOT NULL,
  "userId"      TEXT NOT NULL,
  "title"       TEXT NOT NULL,
  "description" TEXT,
  "dueDate"     TIMESTAMP(3),
  "priority"    TEXT NOT NULL DEFAULT 'medium',
  "status"      TEXT NOT NULL DEFAULT 'todo',
  "relatedTo"   TEXT,
  "relatedId"   TEXT,
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"   TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CrmTask_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "CrmTask_userId_idx"  ON "CrmTask"("userId");
CREATE INDEX IF NOT EXISTS "CrmTask_status_idx"  ON "CrmTask"("status");
CREATE INDEX IF NOT EXISTS "CrmTask_dueDate_idx" ON "CrmTask"("dueDate");

-- ---------------------------------------------------------------------------
-- Group A.3 — WhatsappMessage
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "WhatsappMessage" (
  "id"          TEXT NOT NULL,
  "contactId"   TEXT NOT NULL,
  "waMessageId" TEXT NOT NULL,
  "direction"   TEXT NOT NULL,
  "content"     TEXT NOT NULL,
  "type"        TEXT NOT NULL DEFAULT 'text',
  "mediaUrl"    TEXT,
  "status"      TEXT NOT NULL DEFAULT 'sent',
  "timestamp"   TIMESTAMP(3) NOT NULL,
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "WhatsappMessage_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "WhatsappMessage_waMessageId_key" ON "WhatsappMessage"("waMessageId");
CREATE INDEX IF NOT EXISTS "WhatsappMessage_contactId_idx" ON "WhatsappMessage"("contactId");
CREATE INDEX IF NOT EXISTS "WhatsappMessage_direction_idx" ON "WhatsappMessage"("direction");
CREATE INDEX IF NOT EXISTS "WhatsappMessage_timestamp_idx" ON "WhatsappMessage"("timestamp");

-- ---------------------------------------------------------------------------
-- Foreign keys (added separately so re-runs are safe)
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'notifications_userId_fkey') THEN
    ALTER TABLE "notifications" ADD CONSTRAINT "notifications_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'CrmLead_userId_fkey') THEN
    ALTER TABLE "CrmLead" ADD CONSTRAINT "CrmLead_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'CrmContact_userId_fkey') THEN
    ALTER TABLE "CrmContact" ADD CONSTRAINT "CrmContact_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'CrmCompany_userId_fkey') THEN
    ALTER TABLE "CrmCompany" ADD CONSTRAINT "CrmCompany_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'CrmDeal_userId_fkey') THEN
    ALTER TABLE "CrmDeal" ADD CONSTRAINT "CrmDeal_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'CrmDeal_leadId_fkey') THEN
    ALTER TABLE "CrmDeal" ADD CONSTRAINT "CrmDeal_leadId_fkey"
      FOREIGN KEY ("leadId") REFERENCES "CrmLead"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'CrmActivity_userId_fkey') THEN
    ALTER TABLE "CrmActivity" ADD CONSTRAINT "CrmActivity_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'CrmActivity_leadId_fkey') THEN
    ALTER TABLE "CrmActivity" ADD CONSTRAINT "CrmActivity_leadId_fkey"
      FOREIGN KEY ("leadId") REFERENCES "CrmLead"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'CrmTask_userId_fkey') THEN
    ALTER TABLE "CrmTask" ADD CONSTRAINT "CrmTask_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'WhatsappMessage_contactId_fkey') THEN
    ALTER TABLE "WhatsappMessage" ADD CONSTRAINT "WhatsappMessage_contactId_fkey"
      FOREIGN KEY ("contactId") REFERENCES "WhatsappContact"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

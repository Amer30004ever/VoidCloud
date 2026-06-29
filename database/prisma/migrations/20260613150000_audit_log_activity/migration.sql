-- Extend AuditLog for full user/admin activity tracking
ALTER TABLE "AuditLog" ADD COLUMN IF NOT EXISTS "adminId"   TEXT;
ALTER TABLE "AuditLog" ADD COLUMN IF NOT EXISTS "userAgent" TEXT;
ALTER TABLE "AuditLog" ADD COLUMN IF NOT EXISTS "status"    TEXT NOT NULL DEFAULT 'SUCCESS';

DO $$ BEGIN
  ALTER TABLE "AuditLog"
    ADD CONSTRAINT "AuditLog_adminId_fkey"
    FOREIGN KEY ("adminId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS "AuditLog_userId_idx"    ON "AuditLog"("userId");
CREATE INDEX IF NOT EXISTS "AuditLog_action_idx"    ON "AuditLog"("action");
CREATE INDEX IF NOT EXISTS "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");
CREATE INDEX IF NOT EXISTS "AuditLog_adminId_idx"   ON "AuditLog"("adminId");

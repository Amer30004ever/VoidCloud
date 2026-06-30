-- AmerCloud Phase 2

ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "twoFactorEnabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "recoveryCodes" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "webhookUrl" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "githubId" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "googleId" TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS "User_githubId_key" ON "User"("githubId");
CREATE UNIQUE INDEX IF NOT EXISTS "User_googleId_key" ON "User"("googleId");

ALTER TABLE "CloudDeployment" ADD COLUMN IF NOT EXISTS "webhookUrl" TEXT;

CREATE TABLE IF NOT EXISTS "CloudBackup" (
  "id" TEXT PRIMARY KEY,
  "deploymentId" TEXT NOT NULL REFERENCES "CloudDeployment"("id") ON DELETE CASCADE,
  "storagePath" TEXT NOT NULL,
  "sizeBytes" BIGINT,
  "status" TEXT NOT NULL DEFAULT 'pending',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "CloudBackup_deploymentId_idx" ON "CloudBackup"("deploymentId");
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    GRANT SELECT, INSERT, UPDATE, DELETE ON "CloudBackup" TO authenticated;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
    GRANT ALL ON "CloudBackup" TO service_role;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "CloudAuditLog" (
  "id" TEXT PRIMARY KEY,
  "adminId" TEXT NOT NULL,
  "targetId" TEXT,
  "action" TEXT NOT NULL,
  "oldValue" JSONB,
  "newValue" JSONB,
  "ipAddress" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "CloudAuditLog_adminId_idx" ON "CloudAuditLog"("adminId");
CREATE INDEX IF NOT EXISTS "CloudAuditLog_targetId_idx" ON "CloudAuditLog"("targetId");
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    GRANT SELECT, INSERT, UPDATE, DELETE ON "CloudAuditLog" TO authenticated;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
    GRANT ALL ON "CloudAuditLog" TO service_role;
  END IF;
END $$;

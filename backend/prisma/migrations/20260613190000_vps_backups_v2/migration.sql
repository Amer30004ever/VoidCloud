-- VPS backup management: extend CloudBackup with metadata + BackupSchedule per VPS

DO $$ BEGIN
  CREATE TYPE "BackupType" AS ENUM ('MANUAL','SCHEDULED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "CloudBackup" ADD COLUMN IF NOT EXISTS "userId" TEXT;
ALTER TABLE "CloudBackup" ADD COLUMN IF NOT EXISTS "name" TEXT;
ALTER TABLE "CloudBackup" ADD COLUMN IF NOT EXISTS "type" "BackupType" NOT NULL DEFAULT 'MANUAL';
ALTER TABLE "CloudBackup" ADD COLUMN IF NOT EXISTS "sizeMB" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "CloudBackup" ADD COLUMN IF NOT EXISTS "completedAt" TIMESTAMP(3);

CREATE INDEX IF NOT EXISTS "CloudBackup_userId_idx" ON "CloudBackup"("userId");

CREATE TABLE IF NOT EXISTS "BackupSchedule" (
  "id"         TEXT PRIMARY KEY,
  "vpsId"      TEXT NOT NULL UNIQUE,
  "enabled"    BOOLEAN NOT NULL DEFAULT true,
  "frequency"  TEXT NOT NULL DEFAULT 'DAILY',
  "retention"  INTEGER NOT NULL DEFAULT 7,
  "hour"       INTEGER,
  "dayOfWeek"  INTEGER,
  "dayOfMonth" INTEGER,
  "lastRunAt"  TIMESTAMP(3),
  "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "BackupSchedule_vpsId_fkey" FOREIGN KEY ("vpsId") REFERENCES "CloudDeployment"("id") ON DELETE CASCADE
);

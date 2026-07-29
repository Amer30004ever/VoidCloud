-- Prompt 2.1 — Async VPS provisioning job queue

CREATE TYPE "VpsProvisionJobStatus" AS ENUM ('QUEUED','PROCESSING','SUCCEEDED','FAILED');

CREATE TABLE IF NOT EXISTS "vps_provision_jobs" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "idempotencyKey" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "status" "VpsProvisionJobStatus" NOT NULL DEFAULT 'QUEUED',
  "payload" JSONB NOT NULL,
  "result" JSONB,
  "errorMessage" TEXT,
  "vpsId" TEXT,
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT now(),
  CONSTRAINT "vps_provision_jobs_vpsId_fkey" FOREIGN KEY ("vpsId") REFERENCES "CloudDeployment"("id") ON DELETE SET NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "vps_provision_jobs_idempotencyKey_key" ON "vps_provision_jobs"("idempotencyKey");
CREATE INDEX IF NOT EXISTS "vps_provision_jobs_userId_idx" ON "vps_provision_jobs"("userId");
CREATE INDEX IF NOT EXISTS "vps_provision_jobs_status_idx" ON "vps_provision_jobs"("status");

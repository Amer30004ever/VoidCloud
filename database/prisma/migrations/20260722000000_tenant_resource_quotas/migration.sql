-- Prompt 2.2 — Tenant resource quotas

ALTER TABLE "CloudDeployment" ADD COLUMN IF NOT EXISTS "tenantId" TEXT;

-- Backfill existing rows: users without an explicit tenant get their own userId as tenantId
UPDATE "CloudDeployment" SET "tenantId" = "userId" WHERE "tenantId" IS NULL;

CREATE TABLE IF NOT EXISTS "tenant_quotas" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenantId" TEXT NOT NULL UNIQUE,
  "maxCpu" REAL NOT NULL DEFAULT 4,
  "maxRamMb" INTEGER NOT NULL DEFAULT 8192,
  "maxDiskGb" INTEGER NOT NULL DEFAULT 80,
  "maxVpsCount" INTEGER NOT NULL DEFAULT 5,
  "currentCpu" REAL NOT NULL DEFAULT 0,
  "currentRamMb" INTEGER NOT NULL DEFAULT 0,
  "currentDiskGb" INTEGER NOT NULL DEFAULT 0,
  "currentVpsCount" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "tenant_quotas_tenantId_idx" ON "tenant_quotas"("tenantId");
CREATE INDEX IF NOT EXISTS "cloud_deployments_tenantId_status_idx" ON "CloudDeployment"("tenantId", "status");

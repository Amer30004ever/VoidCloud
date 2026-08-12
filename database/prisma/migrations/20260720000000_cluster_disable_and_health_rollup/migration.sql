-- Cluster: track referencing deployments + failure classification
-- NOTE: the deployment table is "CloudDeployment" (Prisma default mapping);
-- an earlier revision of this migration targeted a non-existent
-- "cloud_deployments" table and therefore failed on any fresh database.
ALTER TABLE "CloudDeployment"
  ADD COLUMN IF NOT EXISTS "proxmoxClusterId" TEXT;
DO $$
BEGIN
  ALTER TABLE "CloudDeployment"
    ADD CONSTRAINT "cloud_deployments_proxmoxClusterId_fkey"
    FOREIGN KEY ("proxmoxClusterId") REFERENCES "proxmox_clusters"("id") ON DELETE SET NULL;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
CREATE INDEX IF NOT EXISTS "cloud_deployments_proxmoxClusterId_idx"
  ON "CloudDeployment"("proxmoxClusterId");

ALTER TABLE "proxmox_clusters"
  ADD COLUMN IF NOT EXISTS "lastErrorType" TEXT,
  ADD COLUMN IF NOT EXISTS "lastErrorMessage" TEXT;

-- ServiceHealthLog: failure classification
ALTER TABLE "service_health_logs"
  ADD COLUMN IF NOT EXISTS "failureType" TEXT;

-- ServiceHealthHourlyRollup: retention rollup table
CREATE TABLE IF NOT EXISTS "service_health_hourly_rollups" (
  "id" TEXT PRIMARY KEY,
  "serviceName" TEXT NOT NULL,
  "hourStart" TIMESTAMP(3) NOT NULL,
  "sampleCount" INTEGER NOT NULL,
  "upCount" INTEGER NOT NULL,
  "degradedCount" INTEGER NOT NULL,
  "downCount" INTEGER NOT NULL,
  "avgResponseMs" INTEGER,
  "uptimePercent" DOUBLE PRECISION NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS "service_health_hourly_rollups_service_hour_uk"
  ON "service_health_hourly_rollups"("serviceName", "hourStart");
CREATE INDEX IF NOT EXISTS "service_health_hourly_rollups_hourStart_idx"
  ON "service_health_hourly_rollups"("hourStart");

-- Cluster: track referencing deployments + failure classification
ALTER TABLE "cloud_deployments"
  ADD COLUMN IF NOT EXISTS "proxmoxClusterId" TEXT;
ALTER TABLE "cloud_deployments"
  ADD CONSTRAINT "cloud_deployments_proxmoxClusterId_fkey"
  FOREIGN KEY ("proxmoxClusterId") REFERENCES "proxmox_clusters"("id") ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS "cloud_deployments_proxmoxClusterId_idx"
  ON "cloud_deployments"("proxmoxClusterId");

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

-- Usage metrics for analytics
CREATE TABLE IF NOT EXISTS "UsageMetric" (
  "id"         TEXT PRIMARY KEY,
  "userId"     TEXT NOT NULL,
  "vpsId"      TEXT NOT NULL,
  "metricType" TEXT NOT NULL,
  "value"      DOUBLE PRECISION NOT NULL,
  "unit"       TEXT NOT NULL,
  "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "UsageMetric_vpsId_fkey" FOREIGN KEY ("vpsId") REFERENCES "CloudDeployment"("id") ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS "UsageMetric_userId_idx" ON "UsageMetric"("userId");
CREATE INDEX IF NOT EXISTS "UsageMetric_vpsId_idx" ON "UsageMetric"("vpsId");
CREATE INDEX IF NOT EXISTS "UsageMetric_recordedAt_idx" ON "UsageMetric"("recordedAt");

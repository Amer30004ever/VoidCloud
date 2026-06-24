-- Add offsite storage fields to BackupSchedule
ALTER TABLE "BackupSchedule"
  ADD COLUMN IF NOT EXISTS "offsiteProvider" TEXT,
  ADD COLUMN IF NOT EXISTS "offsiteBucket"   TEXT,
  ADD COLUMN IF NOT EXISTS "offsiteAccessKey" TEXT,
  ADD COLUMN IF NOT EXISTS "offsiteSecretKey" TEXT;

-- VPS security settings (WAF / DDoS / File Integrity Monitoring)
CREATE TABLE IF NOT EXISTS "VpsSecuritySettings" (
  "id"             TEXT PRIMARY KEY,
  "vpsId"          TEXT NOT NULL UNIQUE,
  "wafEnabled"     BOOLEAN NOT NULL DEFAULT false,
  "wafPreset"      TEXT NOT NULL DEFAULT 'OWASP',
  "wafCustomRules" JSONB,
  "ddosTier"       TEXT NOT NULL DEFAULT 'BASIC',
  "fimEnabled"     BOOLEAN NOT NULL DEFAULT false,
  "fimPaths"       TEXT[] NOT NULL DEFAULT ARRAY['/etc','/var/www','/usr/bin']::TEXT[],
  "updatedAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "VpsSecuritySettings_vps_fkey"
    FOREIGN KEY ("vpsId") REFERENCES "CloudDeployment"("id") ON DELETE CASCADE
);

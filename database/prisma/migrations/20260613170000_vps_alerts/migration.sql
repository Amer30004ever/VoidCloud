-- VPS resource alerts: user-defined rules + triggered notifications

DO $$ BEGIN
  CREATE TYPE "VpsAlertType" AS ENUM ('CPU','RAM','DISK','BANDWIDTH','UPTIME');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "VpsAlertOperator" AS ENUM ('GREATER_THAN','LESS_THAN','EQUALS');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "VpsAlertRule" (
  "id"              TEXT PRIMARY KEY,
  "userId"          TEXT NOT NULL,
  "vpsId"           TEXT,
  "name"            TEXT NOT NULL,
  "type"            "VpsAlertType" NOT NULL,
  "operator"        "VpsAlertOperator" NOT NULL,
  "threshold"       DOUBLE PRECISION NOT NULL,
  "duration"        INTEGER,
  "cooldown"        INTEGER NOT NULL DEFAULT 30,
  "enabled"         BOOLEAN NOT NULL DEFAULT true,
  "lastTriggeredAt" TIMESTAMP(3),
  "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "VpsAlertRule_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE,
  CONSTRAINT "VpsAlertRule_vpsId_fkey"  FOREIGN KEY ("vpsId") REFERENCES "CloudDeployment"("id") ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS "VpsAlertRule_userId_idx"  ON "VpsAlertRule"("userId");
CREATE INDEX IF NOT EXISTS "VpsAlertRule_vpsId_idx"   ON "VpsAlertRule"("vpsId");
CREATE INDEX IF NOT EXISTS "VpsAlertRule_enabled_idx" ON "VpsAlertRule"("enabled");

CREATE TABLE IF NOT EXISTS "VpsAlertNotification" (
  "id"          TEXT PRIMARY KEY,
  "alertRuleId" TEXT NOT NULL,
  "vpsId"       TEXT NOT NULL,
  "status"      TEXT NOT NULL DEFAULT 'TRIGGERED',
  "message"     TEXT NOT NULL,
  "value"       DOUBLE PRECISION NOT NULL,
  "triggeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "resolvedAt"  TIMESTAMP(3),
  CONSTRAINT "VpsAlertNotification_alertRuleId_fkey" FOREIGN KEY ("alertRuleId") REFERENCES "VpsAlertRule"("id") ON DELETE CASCADE,
  CONSTRAINT "VpsAlertNotification_vpsId_fkey"       FOREIGN KEY ("vpsId") REFERENCES "CloudDeployment"("id") ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS "VpsAlertNotification_alertRuleId_idx" ON "VpsAlertNotification"("alertRuleId");
CREATE INDEX IF NOT EXISTS "VpsAlertNotification_vpsId_idx"       ON "VpsAlertNotification"("vpsId");
CREATE INDEX IF NOT EXISTS "VpsAlertNotification_triggeredAt_idx" ON "VpsAlertNotification"("triggeredAt");

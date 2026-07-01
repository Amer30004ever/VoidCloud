-- Firewall rules for VPS instances
CREATE TABLE IF NOT EXISTS "FirewallRule" (
  "id"          TEXT PRIMARY KEY,
  "vpsId"       TEXT NOT NULL,
  "userId"      TEXT NOT NULL,
  "name"        TEXT NOT NULL,
  "priority"    INTEGER NOT NULL DEFAULT 100,
  "action"      TEXT NOT NULL,
  "protocol"    TEXT NOT NULL,
  "port"        TEXT,
  "sourceIP"    TEXT,
  "description" TEXT,
  "enabled"     BOOLEAN NOT NULL DEFAULT true,
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "FirewallRule_vpsId_fkey" FOREIGN KEY ("vpsId") REFERENCES "CloudDeployment"("id") ON DELETE CASCADE,
  CONSTRAINT "FirewallRule_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS "FirewallRule_vpsId_idx" ON "FirewallRule"("vpsId");
CREATE INDEX IF NOT EXISTS "FirewallRule_priority_idx" ON "FirewallRule"("priority");

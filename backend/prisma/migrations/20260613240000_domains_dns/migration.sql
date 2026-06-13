-- Domain and DNS management
CREATE TABLE IF NOT EXISTS "Domain" (
  "id"           TEXT PRIMARY KEY,
  "vpsId"        TEXT NOT NULL,
  "userId"       TEXT NOT NULL,
  "domain"       TEXT NOT NULL UNIQUE,
  "autoSSL"      BOOLEAN NOT NULL DEFAULT false,
  "sslIssuedAt"  TIMESTAMP(3),
  "sslExpiresAt" TIMESTAMP(3),
  "verifiedAt"   TIMESTAMP(3),
  "verifyToken"  TEXT NOT NULL,
  "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Domain_vpsId_fkey" FOREIGN KEY ("vpsId") REFERENCES "CloudDeployment"("id") ON DELETE CASCADE,
  CONSTRAINT "Domain_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS "Domain_vpsId_idx" ON "Domain"("vpsId");
CREATE INDEX IF NOT EXISTS "Domain_domain_idx" ON "Domain"("domain");

CREATE TABLE IF NOT EXISTS "DNSRecord" (
  "id"        TEXT PRIMARY KEY,
  "domainId"  TEXT NOT NULL,
  "type"      TEXT NOT NULL,
  "name"      TEXT NOT NULL,
  "value"     TEXT NOT NULL,
  "ttl"       INTEGER NOT NULL DEFAULT 3600,
  "priority"  INTEGER,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DNSRecord_domainId_fkey" FOREIGN KEY ("domainId") REFERENCES "Domain"("id") ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS "DNSRecord_domainId_idx" ON "DNSRecord"("domainId");

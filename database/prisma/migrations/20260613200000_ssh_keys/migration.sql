-- SSH key management for VPS instances

CREATE TABLE IF NOT EXISTS "SSHKey" (
  "id"          TEXT PRIMARY KEY,
  "userId"      TEXT NOT NULL,
  "name"        TEXT NOT NULL,
  "publicKey"   TEXT NOT NULL UNIQUE,
  "fingerprint" TEXT NOT NULL,
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lastUsedAt"  TIMESTAMP(3),
  CONSTRAINT "SSHKey_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS "SSHKey_userId_idx" ON "SSHKey"("userId");

-- Implicit M2M join table for SSHKey <-> CloudDeployment ("VPSKeys")
CREATE TABLE IF NOT EXISTS "_VPSKeys" (
  "A" TEXT NOT NULL,
  "B" TEXT NOT NULL,
  CONSTRAINT "_VPSKeys_A_fkey" FOREIGN KEY ("A") REFERENCES "CloudDeployment"("id") ON DELETE CASCADE,
  CONSTRAINT "_VPSKeys_B_fkey" FOREIGN KEY ("B") REFERENCES "SSHKey"("id") ON DELETE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "_VPSKeys_AB_unique" ON "_VPSKeys"("A","B");
CREATE INDEX IF NOT EXISTS "_VPSKeys_B_index" ON "_VPSKeys"("B");

-- Add apps & installedApps columns to CloudDeployment
ALTER TABLE "CloudDeployment" ADD COLUMN IF NOT EXISTS "apps" TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "CloudDeployment" ADD COLUMN IF NOT EXISTS "installedApps" JSONB;

-- VPSSnapshot table
CREATE TABLE IF NOT EXISTS "VPSSnapshot" (
  "id" TEXT NOT NULL,
  "vpsId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "sizeBytes" BIGINT NOT NULL DEFAULT 0,
  "status" TEXT NOT NULL DEFAULT 'CREATING',
  "proxmoxSnapshotName" TEXT,
  "errorMessage" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completedAt" TIMESTAMP(3),
  CONSTRAINT "VPSSnapshot_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "VPSSnapshot_vpsId_idx" ON "VPSSnapshot"("vpsId");
CREATE INDEX IF NOT EXISTS "VPSSnapshot_userId_idx" ON "VPSSnapshot"("userId");

ALTER TABLE "VPSSnapshot"
  ADD CONSTRAINT "VPSSnapshot_vpsId_fkey" FOREIGN KEY ("vpsId") REFERENCES "CloudDeployment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "VPSSnapshot"
  ADD CONSTRAINT "VPSSnapshot_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

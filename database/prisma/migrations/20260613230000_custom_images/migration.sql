-- Custom images & snapshots
CREATE TABLE IF NOT EXISTS "CustomImage" (
  "id"          TEXT PRIMARY KEY,
  "userId"      TEXT NOT NULL,
  "name"        TEXT NOT NULL,
  "description" TEXT,
  "type"        TEXT NOT NULL DEFAULT 'CUSTOM',
  "sourceVpsId" TEXT,
  "sizeMB"      INTEGER NOT NULL DEFAULT 0,
  "isPublic"    BOOLEAN NOT NULL DEFAULT false,
  "storageUrl"  TEXT,
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CustomImage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE,
  CONSTRAINT "CustomImage_sourceVpsId_fkey" FOREIGN KEY ("sourceVpsId") REFERENCES "CloudDeployment"("id") ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS "CustomImage_userId_idx" ON "CustomImage"("userId");
CREATE INDEX IF NOT EXISTS "CustomImage_isPublic_idx" ON "CustomImage"("isPublic");

CREATE TABLE IF NOT EXISTS "CustomImageShare" (
  "imageId"    TEXT NOT NULL,
  "userId"     TEXT NOT NULL,
  "sharedAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY ("imageId", "userId"),
  CONSTRAINT "CustomImageShare_imageId_fkey" FOREIGN KEY ("imageId") REFERENCES "CustomImage"("id") ON DELETE CASCADE,
  CONSTRAINT "CustomImageShare_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS "CustomImageShare_userId_idx" ON "CustomImageShare"("userId");

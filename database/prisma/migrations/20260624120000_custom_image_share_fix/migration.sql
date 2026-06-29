-- Align CustomImageShare with Prisma schema (id, sharedWithEmail, sharedBy)
DROP TABLE IF EXISTS "CustomImageShare";

CREATE TABLE "CustomImageShare" (
  "id"              TEXT NOT NULL,
  "imageId"         TEXT NOT NULL,
  "sharedWithEmail" TEXT NOT NULL,
  "sharedBy"        TEXT NOT NULL,
  "sharedAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CustomImageShare_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "CustomImageShare_imageId_fkey" FOREIGN KEY ("imageId") REFERENCES "CustomImage"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "CustomImageShare_sharedBy_fkey" FOREIGN KEY ("sharedBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "CustomImageShare_imageId_sharedWithEmail_key" ON "CustomImageShare"("imageId", "sharedWithEmail");

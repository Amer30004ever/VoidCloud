-- CreateTable
CREATE TABLE "PlatformSecret" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "encryptedValue" TEXT NOT NULL,
    "description" TEXT,
    "lastRotatedAt" TIMESTAMP(3),
    "updatedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlatformSecret_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PlatformSecret_key_key" ON "PlatformSecret"("key");

-- CreateIndex
CREATE INDEX "PlatformSecret_createdAt_idx" ON "PlatformSecret"("createdAt");

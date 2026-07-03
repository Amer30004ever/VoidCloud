-- CreateTable
CREATE TABLE "APIRateLimit" (
    "id" TEXT NOT NULL,
    "apiKeyId" TEXT,
    "userId" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "method" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "limit" INTEGER NOT NULL,
    "remaining" INTEGER NOT NULL,
    "resetAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "APIRateLimit_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "APIRateLimit_apiKeyId_idx" ON "APIRateLimit"("apiKeyId");
CREATE INDEX "APIRateLimit_userId_idx" ON "APIRateLimit"("userId");
CREATE INDEX "APIRateLimit_createdAt_idx" ON "APIRateLimit"("createdAt");

ALTER TABLE "APIRateLimit" ADD CONSTRAINT "APIRateLimit_apiKeyId_fkey" FOREIGN KEY ("apiKeyId") REFERENCES "ApiKey"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "APIRateLimit" ADD CONSTRAINT "APIRateLimit_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

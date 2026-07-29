-- CreateTable
CREATE TABLE "VpsRecommendation" (
    "id" TEXT NOT NULL,
    "vpsId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "severity" TEXT NOT NULL DEFAULT 'info',
    "currentValue" DOUBLE PRECISION,
    "suggestedValue" DOUBLE PRECISION,
    "unit" TEXT,
    "acknowledged" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VpsRecommendation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "VpsRecommendation_vpsId_idx" ON "VpsRecommendation"("vpsId");

-- CreateIndex
CREATE INDEX "VpsRecommendation_acknowledged_idx" ON "VpsRecommendation"("acknowledged");

-- AddForeignKey
ALTER TABLE "VpsRecommendation" ADD CONSTRAINT "VpsRecommendation_vpsId_fkey" FOREIGN KEY ("vpsId") REFERENCES "CloudDeployment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE "ApiUsageLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tenantId" TEXT,
    "vpsId" TEXT,
    "endpoint" TEXT NOT NULL,
    "method" TEXT NOT NULL,
    "statusCode" INTEGER NOT NULL,
    "responseMs" INTEGER NOT NULL,
    "userAgent" TEXT,
    "ipAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ApiUsageLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ApiUsageLog_userId_createdAt_idx" ON "ApiUsageLog"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "ApiUsageLog_tenantId_createdAt_idx" ON "ApiUsageLog"("tenantId", "createdAt");

-- CreateIndex
CREATE INDEX "ApiUsageLog_endpoint_idx" ON "ApiUsageLog"("endpoint");

-- AddForeignKey
ALTER TABLE "ApiUsageLog" ADD CONSTRAINT "ApiUsageLog_vpsId_fkey" FOREIGN KEY ("vpsId") REFERENCES "CloudDeployment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

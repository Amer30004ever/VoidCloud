-- AlterTable
ALTER TABLE "ApiKey" ADD COLUMN     "tenantId" TEXT,
ADD COLUMN     "scopes" JSONB DEFAULT '[]';

-- CreateIndex
CREATE INDEX "ApiKey_tenantId_idx" ON "ApiKey"("tenantId");

-- AddForeignKey
ALTER TABLE "ApiKey" ADD CONSTRAINT "ApiKey_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

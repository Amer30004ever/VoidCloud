-- AlterTable
-- NOTE: the Tenant model maps to the "tenants" table; an earlier revision
-- referenced "Tenant" and failed on every fresh database.
ALTER TABLE "ApiKey" ADD COLUMN     "tenantId" TEXT,
ADD COLUMN     "scopes" JSONB DEFAULT '[]';

-- CreateIndex
CREATE INDEX "ApiKey_tenantId_idx" ON "ApiKey"("tenantId");

-- AddForeignKey
ALTER TABLE "ApiKey" ADD CONSTRAINT "ApiKey_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

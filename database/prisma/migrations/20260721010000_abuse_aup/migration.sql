-- Prompt 0.17 — Abuse intake / AUP / outbound-abuse detection

-- New enum types
CREATE TYPE "AbuseCategory" AS ENUM ('SPAM','MALWARE','PHISHING','DDOS','CRYPTO_MINING','COPYRIGHT','OTHER');
CREATE TYPE "AbuseReportStatus" AS ENUM ('RECEIVED','INVESTIGATING','ACTION_TAKEN','RESOLVED','DISMISSED');
CREATE TYPE "PtrRequestStatus" AS ENUM ('REQUESTED','FULFILLED','REJECTED');

-- AbuseReport table
CREATE TABLE IF NOT EXISTS "abuse_reports" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "reporterName" TEXT,
  "reporterEmail" TEXT,
  "reporterIp" TEXT,
  "targetIp" TEXT,
  "targetDomain" TEXT,
  "targetVpsId" TEXT,
  "category" "AbuseCategory" NOT NULL DEFAULT 'OTHER',
  "reason" TEXT NOT NULL,
  "evidence" TEXT,
  "status" "AbuseReportStatus" NOT NULL DEFAULT 'RECEIVED',
  "source" TEXT NOT NULL DEFAULT 'external',
  "detectedSignature" TEXT,
  "details" JSONB,
  "resolvedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT now(),
  CONSTRAINT "abuse_reports_targetVpsId_fkey" FOREIGN KEY ("targetVpsId") REFERENCES "CloudDeployment"("id") ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS "abuse_reports_status_idx" ON "abuse_reports"("status");
CREATE INDEX IF NOT EXISTS "abuse_reports_targetVpsId_idx" ON "abuse_reports"("targetVpsId");
CREATE INDEX IF NOT EXISTS "abuse_reports_category_idx" ON "abuse_reports"("category");
CREATE INDEX IF NOT EXISTS "abuse_reports_createdAt_idx" ON "abuse_reports"("createdAt");

-- PtrRecordRequest table
CREATE TABLE IF NOT EXISTS "ptr_record_requests" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "userId" TEXT NOT NULL,
  "vpsId" TEXT NOT NULL,
  "ipAddress" TEXT,
  "hostname" TEXT NOT NULL,
  "status" "PtrRequestStatus" NOT NULL DEFAULT 'REQUESTED',
  "adminNote" TEXT,
  "fulfilledAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT now(),
  CONSTRAINT "ptr_record_requests_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE,
  CONSTRAINT "ptr_record_requests_vpsId_fkey" FOREIGN KEY ("vpsId") REFERENCES "CloudDeployment"("id") ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS "ptr_record_requests_userId_idx" ON "ptr_record_requests"("userId");
CREATE INDEX IF NOT EXISTS "ptr_record_requests_status_idx" ON "ptr_record_requests"("status");
CREATE INDEX IF NOT EXISTS "ptr_record_requests_vpsId_idx" ON "ptr_record_requests"("vpsId");

-- CloudDeployment: abuse / networking-suspension fields
ALTER TABLE "CloudDeployment"
  ADD COLUMN IF NOT EXISTS "networkSuspendedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "abuseStatus" TEXT,
  ADD COLUMN IF NOT EXISTS "abuseFlags" JSONB;

-- Create vps_health_logs table
CREATE TABLE "vps_health_logs" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "vpsId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "failureType" TEXT,
    "responseTimeMs" INTEGER,
    "errorMessage" TEXT,
    "checkedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "vps_health_logs_pkey" PRIMARY KEY ("id")
);

-- Create indexes
CREATE INDEX "vps_health_logs_vpsId_idx" ON "vps_health_logs"("vpsId");
CREATE INDEX "vps_health_logs_checkedAt_idx" ON "vps_health_logs"("checkedAt");

-- Add foreign key constraint
ALTER TABLE "vps_health_logs" ADD CONSTRAINT "vps_health_logs_vpsId_fkey" FOREIGN KEY ("vpsId") REFERENCES "CloudDeployment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

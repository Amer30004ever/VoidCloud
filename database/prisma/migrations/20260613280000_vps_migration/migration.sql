-- CreateTable
CREATE TABLE "VPSMigration" (
    "id" TEXT NOT NULL,
    "vpsId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "sourceNode" TEXT NOT NULL,
    "targetNode" TEXT NOT NULL,
    "sourceStorage" TEXT,
    "targetStorage" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "progress" INTEGER NOT NULL DEFAULT 0,
    "estimatedDowntimeSec" INTEGER NOT NULL DEFAULT 0,
    "scheduledFor" TIMESTAMP(3),
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "proxmoxTaskId" TEXT,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VPSMigration_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "VPSMigration_vpsId_idx" ON "VPSMigration"("vpsId");
CREATE INDEX "VPSMigration_userId_idx" ON "VPSMigration"("userId");
CREATE INDEX "VPSMigration_status_idx" ON "VPSMigration"("status");

ALTER TABLE "VPSMigration" ADD CONSTRAINT "VPSMigration_vpsId_fkey" FOREIGN KEY ("vpsId") REFERENCES "CloudDeployment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

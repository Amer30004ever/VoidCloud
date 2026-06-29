-- VPS pivot: additive schema changes
-- 1) Extend CloudDeploymentStatus enum
ALTER TYPE "CloudDeploymentStatus" ADD VALUE IF NOT EXISTS 'PROVISIONING';
ALTER TYPE "CloudDeploymentStatus" ADD VALUE IF NOT EXISTS 'SUSPENDED';
ALTER TYPE "CloudDeploymentStatus" ADD VALUE IF NOT EXISTS 'TERMINATED';

-- 2) Plan: vpsLimit
ALTER TABLE "CloudPlan" ADD COLUMN IF NOT EXISTS "vpsLimit" INTEGER NOT NULL DEFAULT 1;

-- 3) CloudDeployment: VPS fields
ALTER TABLE "CloudDeployment" ADD COLUMN IF NOT EXISTS "statusMessage" TEXT;
ALTER TABLE "CloudDeployment" ADD COLUMN IF NOT EXISTS "hostname" TEXT;
ALTER TABLE "CloudDeployment" ADD COLUMN IF NOT EXISTS "ipv4Address" TEXT;
ALTER TABLE "CloudDeployment" ADD COLUMN IF NOT EXISTS "rootPasswordHash" TEXT;
ALTER TABLE "CloudDeployment" ADD COLUMN IF NOT EXISTS "proxmoxVMID" INTEGER;
ALTER TABLE "CloudDeployment" ADD COLUMN IF NOT EXISTS "proxmoxNode" TEXT;
ALTER TABLE "CloudDeployment" ADD COLUMN IF NOT EXISTS "provisionedAt" TIMESTAMP(3);
ALTER TABLE "CloudDeployment" ADD COLUMN IF NOT EXISTS "suspendedAt" TIMESTAMP(3);
ALTER TABLE "CloudDeployment" ADD COLUMN IF NOT EXISTS "terminatedAt" TIMESTAMP(3);

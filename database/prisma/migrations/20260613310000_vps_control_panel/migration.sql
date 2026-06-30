-- Add control panel fields to CloudDeployment
ALTER TABLE "CloudDeployment"
  ADD COLUMN IF NOT EXISTS "controlPanel" TEXT,
  ADD COLUMN IF NOT EXISTS "controlPanelStatus" TEXT,
  ADD COLUMN IF NOT EXISTS "controlPanelUrl" TEXT,
  ADD COLUMN IF NOT EXISTS "controlPanelUser" TEXT,
  ADD COLUMN IF NOT EXISTS "controlPanelPassword" TEXT,
  ADD COLUMN IF NOT EXISTS "controlPanelInstalledAt" TIMESTAMP(3);

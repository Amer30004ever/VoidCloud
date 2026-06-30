-- Payment-gated VPS provisioning
ALTER TYPE "CloudSubscriptionStatus" ADD VALUE IF NOT EXISTS 'PENDING_PAYMENT';
ALTER TYPE "CloudDeploymentStatus" ADD VALUE IF NOT EXISTS 'PENDING_PAYMENT';

-- Allow admins to record a rejection reason on invoices via metadata (no new column needed)

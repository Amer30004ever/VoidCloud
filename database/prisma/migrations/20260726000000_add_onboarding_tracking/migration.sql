-- Prompt 2.9: Onboarding tracking for new ADMIN tenants

ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "onboardingCompleted" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "onboardingSkipped" BOOLEAN NOT NULL DEFAULT false;

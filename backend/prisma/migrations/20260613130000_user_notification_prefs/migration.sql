-- Per-user notification preferences (JSON blob)
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "notificationPrefs" JSONB;

-- Idempotent provisioning bookkeeping for managed databases.
--
-- provision_locked_at is the worker lease used by
-- ManagedDatabaseProvisionerService.provision(): a claim is taken with a
-- conditional UPDATE, so concurrent calls for the same instance can never both
-- create an LXC. provisioned_at records that a container exists, which turns a
-- retry into a reconcile instead of a duplicate create.
ALTER TABLE "managed_databases"
  ADD COLUMN IF NOT EXISTS "provisionLockedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "provisionAttempts" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "provisionedAt" TIMESTAMP(3);

CREATE INDEX IF NOT EXISTS "managed_databases_status_provisionLockedAt_idx"
  ON "managed_databases" ("status", "provisionLockedAt");

-- Append-only provisioning timeline surfaced in the tenant UI.
CREATE TABLE IF NOT EXISTS "managed_database_events" (
  "id" TEXT NOT NULL,
  "databaseId" TEXT NOT NULL,
  "status" "ManagedServiceStatus" NOT NULL,
  "step" TEXT NOT NULL,
  "message" TEXT,
  "detail" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "managed_database_events_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "managed_database_events_databaseId_createdAt_idx"
  ON "managed_database_events" ("databaseId", "createdAt");

DO $$
BEGIN
  ALTER TABLE "managed_database_events"
    ADD CONSTRAINT "managed_database_events_databaseId_fkey"
    FOREIGN KEY ("databaseId") REFERENCES "managed_databases"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

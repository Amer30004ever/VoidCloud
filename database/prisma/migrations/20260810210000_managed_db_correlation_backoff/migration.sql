-- Correlation/trace id + bounded exponential-backoff retry bookkeeping for
-- managed database provisioning.
--
-- correlationId is generated once per provisioning attempt and stamped on both
-- the parent row and every timeline event, and is echoed in every structured
-- `proxmox.api` log line emitted during that attempt, so a FAILED event in the
-- UI links to the exact HTTP call in the logs.
--
-- nextRetryAt is the earliest moment a retry may re-claim the row. The
-- provisioner sets it to now() + backoff(attempt) on failure and refuses to
-- claim before it, so a flapping Proxmox cluster cannot be thrashed.
ALTER TABLE "managed_databases"
  ADD COLUMN IF NOT EXISTS "nextRetryAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "correlationId" TEXT;

ALTER TABLE "managed_database_events"
  ADD COLUMN IF NOT EXISTS "correlationId" TEXT;

CREATE INDEX IF NOT EXISTS "managed_database_events_correlationId_idx"
  ON "managed_database_events" ("correlationId");

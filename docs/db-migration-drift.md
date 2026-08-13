# Migration history vs. schema drift — findings and remediation plan

Date: 2026-08-13

## How this was checked

The staging/production database (`postgresql://…@postgres:5432/void_portal`) is not
reachable from the build sandbox — there are no `PG*` env vars and the host is
cluster-internal, so `prisma migrate status` could not be run against it from here.
It must be run from inside the cluster (see "Run against the real DB" below).

What *was* run here, as the strongest available substitute:

1. A scratch PostgreSQL 15 instance was initialised from empty.
2. All **57** migrations in `database/prisma/migrations/` were applied in
   lexical order with `psql -v ON_ERROR_STOP=1`.
   Result: **0 failures** — the history replays cleanly from nothing.
3. The resulting table set (124 tables) was compared against the 130 models in
   `database/prisma/schema.prisma`.
   Result: **drift found** (below).

Prisma's own `migrate diff` could not run in the sandbox (`schema-engine` needs
`libssl.so.3`, absent from the image). It runs fine in CI — see
`.github/workflows/db-migration-gate.yaml`, step "Fail on schema drift".

## Drift found

### A. Models with no migration at all (7 tables)

These exist in `schema.prisma` but no migration ever creates them. Any Prisma
query against them fails on a fresh database:

- `CrmLead`
- `CrmContact`
- `CrmCompany`
- `CrmDeal`
- `CrmActivity`
- `CrmTask`
- `WhatsappMessage`

### B. Name mismatches between schema and migration SQL (5 tables)

The migration creates one name; the model expects another. Both sides exist,
so nothing errors at deploy time — it fails at query time.

| Model | Model expects | Migration created |
|---|---|---|
| `AbuseReport` | `AbuseReport` | `abuse_reports` |
| `PtrRecordRequest` | `PtrRecordRequest` | `ptr_record_requests` |
| `VpsProvisionJob` | `VpsProvisionJob` | `vps_provision_jobs` |
| `PlatformSecret` | `platform_secrets` | `PlatformSecret` |
| `Notification` | `notifications` | `Notification` |

`_DocumentToDocumentTag` and `_VPSKeys` are Prisma implicit many-to-many join
tables, not drift.

## Remediation plan

Ordered, each step independently deployable and reversible.

1. **Freeze schema edits** that are not part of this remediation until step 5
   lands, so the gap does not widen.
2. **Decide the canonical name per row of table B.** Recommendation: snake_case
   plural everywhere (matches the Tier 9 tables), i.e. keep the migration name
   and add `@@map("abuse_reports")` / `@@map("ptr_record_requests")` /
   `@@map("vps_provision_jobs")` to the models; and rename the two tables the
   other direction (`ALTER TABLE "PlatformSecret" RENAME TO platform_secrets`,
   `ALTER TABLE "Notification" RENAME TO notifications`) so the existing
   `@@map` on those models becomes correct. Renames preserve data; the
   `@@map` additions are schema-only, zero data risk.
3. **Write one migration for group A** creating the 6 CRM tables and
   `WhatsappMessage` with the columns, indexes and FKs the models declare.
   Use `CREATE TABLE IF NOT EXISTS` so environments that were hand-patched do
   not break.
4. **Run against the real DB, read-only first**, from a pod in the cluster:
   ```bash
   kubectl -n voidcloud exec deploy/vps-service -- \
     env DATABASE_URL="$DATABASE_URL" npx prisma@6.19.3 migrate status
   ```
   If it reports migrations applied that are not in the repo, or repo
   migrations recorded with a different checksum, stop and reconcile with
   `prisma migrate resolve` before applying anything new.
5. **Apply steps 2–3 to staging**, verify `migrate diff --exit-code` is clean,
   take a backup (`database/scripts/backup.sh`), then apply to production.
6. **Restore drill** — `database/scripts/restore-drill.sh` against the newly
   built schema, to confirm disaster recovery actually works end to end.

## Standing guard

`.github/workflows/db-migration-gate.yaml` now runs on every PR touching
`database/prisma/**`:

- replays all migrations from empty via `psql -v ON_ERROR_STOP=1`;
- rebuilds a second database through `prisma migrate deploy` so the
  `_prisma_migrations` bookkeeping is exercised;
- fails the build on any `prisma migrate diff --exit-code` output.

Once step 5 lands, this workflow going green is the contract that the drift
cannot come back.

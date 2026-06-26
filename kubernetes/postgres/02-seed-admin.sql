-- 02-seed-admin.sql
-- Placeholder rows only — the canonical seed lives in backend/prisma/seed.ts,
-- which runs on every backend deploy and upserts the real admin with a
-- securely generated password (printed once to the backend pod logs on first
-- deploy). Do NOT insert a hard-coded password hash here.
SELECT 1;

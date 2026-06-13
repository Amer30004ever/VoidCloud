-- Organizations / teams

DO $$ BEGIN
  CREATE TYPE "OrgRole" AS ENUM ('OWNER','ADMIN','MEMBER','VIEWER');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "Organization" (
  "id"        TEXT PRIMARY KEY,
  "name"      TEXT NOT NULL,
  "slug"      TEXT NOT NULL UNIQUE,
  "ownerId"   TEXT NOT NULL,
  "avatar"    TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Organization_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id")
);
CREATE INDEX IF NOT EXISTS "Organization_slug_idx" ON "Organization"("slug");

CREATE TABLE IF NOT EXISTS "OrganizationMember" (
  "organizationId" TEXT NOT NULL,
  "userId"         TEXT NOT NULL,
  "role"           "OrgRole" NOT NULL DEFAULT 'MEMBER',
  "joinedAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY ("organizationId","userId"),
  CONSTRAINT "OrganizationMember_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE,
  CONSTRAINT "OrganizationMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS "OrganizationMember_userId_idx" ON "OrganizationMember"("userId");

CREATE TABLE IF NOT EXISTS "OrganizationInvitation" (
  "id"             TEXT PRIMARY KEY,
  "organizationId" TEXT NOT NULL,
  "email"          TEXT NOT NULL,
  "role"           "OrgRole" NOT NULL DEFAULT 'MEMBER',
  "invitedBy"      TEXT NOT NULL,
  "invitedAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expiresAt"      TIMESTAMP(3) NOT NULL,
  "acceptedAt"    TIMESTAMP(3),
  CONSTRAINT "OrganizationInvitation_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "OrganizationInvitation_organizationId_email_key" ON "OrganizationInvitation"("organizationId","email");
CREATE INDEX IF NOT EXISTS "OrganizationInvitation_email_idx" ON "OrganizationInvitation"("email");

-- Link VPS (CloudDeployment) to an organization
ALTER TABLE "CloudDeployment" ADD COLUMN IF NOT EXISTS "organizationId" TEXT;
DO $$ BEGIN
  ALTER TABLE "CloudDeployment" ADD CONSTRAINT "CloudDeployment_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Adds missing RBAC + multi-tenant tables that exist in schema.prisma
-- but were never captured in a previous migration. Safe to run on
-- environments that already partially have these objects thanks to
-- IF NOT EXISTS guards.

-- ============ rbac_roles ============
CREATE TABLE IF NOT EXISTS "rbac_roles" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "rbac_roles_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "rbac_roles_name_key" ON "rbac_roles"("name");

-- ============ rbac_permissions ============
CREATE TABLE IF NOT EXISTS "rbac_permissions" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "resource" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "rbac_permissions_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "rbac_permissions_name_key" ON "rbac_permissions"("name");

-- ============ rbac_role_permissions ============
CREATE TABLE IF NOT EXISTS "rbac_role_permissions" (
    "roleId" TEXT NOT NULL,
    "permissionId" TEXT NOT NULL,
    CONSTRAINT "rbac_role_permissions_pkey" PRIMARY KEY ("roleId", "permissionId")
);

-- ============ tenants ============
CREATE TABLE IF NOT EXISTS "tenants" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "subdomain" TEXT NOT NULL,
    "settings" JSONB,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "tenants_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "tenants_subdomain_key" ON "tenants"("subdomain");

-- ============ user_tenants ============
CREATE TABLE IF NOT EXISTS "user_tenants" (
    "userId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "user_tenants_pkey" PRIMARY KEY ("userId", "tenantId")
);

-- ============ Conversation.tenantId ============
ALTER TABLE "Conversation" ADD COLUMN IF NOT EXISTS "tenantId" TEXT;

-- ============ Foreign keys (guarded) ============
DO $$ BEGIN
    ALTER TABLE "rbac_role_permissions"
        ADD CONSTRAINT "rbac_role_permissions_roleId_fkey"
        FOREIGN KEY ("roleId") REFERENCES "rbac_roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    ALTER TABLE "rbac_role_permissions"
        ADD CONSTRAINT "rbac_role_permissions_permissionId_fkey"
        FOREIGN KEY ("permissionId") REFERENCES "rbac_permissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    ALTER TABLE "user_tenants"
        ADD CONSTRAINT "user_tenants_userId_fkey"
        FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    ALTER TABLE "user_tenants"
        ADD CONSTRAINT "user_tenants_tenantId_fkey"
        FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    ALTER TABLE "user_tenants"
        ADD CONSTRAINT "user_tenants_roleId_fkey"
        FOREIGN KEY ("roleId") REFERENCES "rbac_roles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    ALTER TABLE "Conversation"
        ADD CONSTRAINT "Conversation_tenantId_fkey"
        FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

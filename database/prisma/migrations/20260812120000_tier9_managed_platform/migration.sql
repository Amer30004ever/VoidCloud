-- Tier 9 platform expansion: managed databases, object storage, managed k8s,
-- VM import, community catalog, reseller white-label, consolidated billing,
-- Egypt ETA e-invoicing, DDoS mitigation events, exportable snapshots.

DO $$ BEGIN
  CREATE TYPE "ManagedServiceStatus" AS ENUM ('PROVISIONING', 'RUNNING', 'STOPPED', 'FAILED', 'DELETED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "ManagedDatabaseEngine" AS ENUM ('POSTGRES', 'MYSQL', 'REDIS', 'MONGODB');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "VmImportStatus" AS ENUM ('PENDING', 'DOWNLOADING', 'CONVERTING', 'IMPORTING', 'COMPLETED', 'FAILED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "CatalogSubmissionStatus" AS ENUM ('DRAFT', 'PENDING_REVIEW', 'APPROVED', 'REJECTED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "EtaSubmissionStatus" AS ENUM ('PENDING', 'SUBMITTED', 'ACCEPTED', 'REJECTED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Exportable snapshots
ALTER TABLE "VPSSnapshot" ADD COLUMN IF NOT EXISTS "exportStatus" TEXT;
ALTER TABLE "VPSSnapshot" ADD COLUMN IF NOT EXISTS "exportFormat" TEXT;
ALTER TABLE "VPSSnapshot" ADD COLUMN IF NOT EXISTS "exportBucket" TEXT;
ALTER TABLE "VPSSnapshot" ADD COLUMN IF NOT EXISTS "exportObjectKey" TEXT;
ALTER TABLE "VPSSnapshot" ADD COLUMN IF NOT EXISTS "exportSizeBytes" BIGINT;
ALTER TABLE "VPSSnapshot" ADD COLUMN IF NOT EXISTS "exportUrl" TEXT;
ALTER TABLE "VPSSnapshot" ADD COLUMN IF NOT EXISTS "exportExpiresAt" TIMESTAMP(3);

-- Managed databases
CREATE TABLE IF NOT EXISTS "managed_databases" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "organizationId" TEXT,
  "name" TEXT NOT NULL,
  "engine" "ManagedDatabaseEngine" NOT NULL,
  "version" TEXT NOT NULL,
  "planCode" TEXT NOT NULL,
  "cpuCores" INTEGER NOT NULL DEFAULT 1,
  "memoryMb" INTEGER NOT NULL DEFAULT 1024,
  "storageGb" INTEGER NOT NULL DEFAULT 10,
  "status" "ManagedServiceStatus" NOT NULL DEFAULT 'PROVISIONING',
  "host" TEXT,
  "port" INTEGER,
  "databaseName" TEXT,
  "username" TEXT,
  "passwordCipher" TEXT,
  "nodeName" TEXT,
  "clusterId" TEXT,
  "backupsEnabled" BOOLEAN NOT NULL DEFAULT true,
  "errorMessage" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "deletedAt" TIMESTAMP(3),
  CONSTRAINT "managed_databases_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "managed_databases_userId_name_key" ON "managed_databases"("userId", "name");
CREATE INDEX IF NOT EXISTS "managed_databases_status_idx" ON "managed_databases"("status");
CREATE INDEX IF NOT EXISTS "managed_databases_organizationId_idx" ON "managed_databases"("organizationId");

CREATE TABLE IF NOT EXISTS "managed_database_backups" (
  "id" TEXT NOT NULL,
  "databaseId" TEXT NOT NULL,
  "sizeBytes" BIGINT NOT NULL DEFAULT 0,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "location" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completedAt" TIMESTAMP(3),
  CONSTRAINT "managed_database_backups_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "managed_database_backups_databaseId_idx" ON "managed_database_backups"("databaseId");
ALTER TABLE "managed_database_backups" DROP CONSTRAINT IF EXISTS "managed_database_backups_databaseId_fkey";
ALTER TABLE "managed_database_backups" ADD CONSTRAINT "managed_database_backups_databaseId_fkey"
  FOREIGN KEY ("databaseId") REFERENCES "managed_databases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Object storage
CREATE TABLE IF NOT EXISTS "object_storage_buckets" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "region" TEXT NOT NULL DEFAULT 'eu-central',
  "publicRead" BOOLEAN NOT NULL DEFAULT false,
  "versioning" BOOLEAN NOT NULL DEFAULT false,
  "quotaGb" INTEGER NOT NULL DEFAULT 50,
  "usedBytes" BIGINT NOT NULL DEFAULT 0,
  "objectCount" INTEGER NOT NULL DEFAULT 0,
  "endpoint" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "object_storage_buckets_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "object_storage_buckets_name_key" ON "object_storage_buckets"("name");
CREATE INDEX IF NOT EXISTS "object_storage_buckets_userId_idx" ON "object_storage_buckets"("userId");

CREATE TABLE IF NOT EXISTS "object_storage_keys" (
  "id" TEXT NOT NULL,
  "bucketId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  "accessKey" TEXT NOT NULL,
  "secretCipher" TEXT NOT NULL,
  "readOnly" BOOLEAN NOT NULL DEFAULT false,
  "lastUsedAt" TIMESTAMP(3),
  "revokedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "object_storage_keys_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "object_storage_keys_accessKey_key" ON "object_storage_keys"("accessKey");
CREATE INDEX IF NOT EXISTS "object_storage_keys_bucketId_idx" ON "object_storage_keys"("bucketId");
CREATE INDEX IF NOT EXISTS "object_storage_keys_userId_idx" ON "object_storage_keys"("userId");
ALTER TABLE "object_storage_keys" DROP CONSTRAINT IF EXISTS "object_storage_keys_bucketId_fkey";
ALTER TABLE "object_storage_keys" ADD CONSTRAINT "object_storage_keys_bucketId_fkey"
  FOREIGN KEY ("bucketId") REFERENCES "object_storage_buckets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Managed Kubernetes
CREATE TABLE IF NOT EXISTS "managed_k8s_clusters" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "organizationId" TEXT,
  "name" TEXT NOT NULL,
  "k8sVersion" TEXT NOT NULL DEFAULT '1.31',
  "region" TEXT NOT NULL DEFAULT 'eu-central',
  "status" "ManagedServiceStatus" NOT NULL DEFAULT 'PROVISIONING',
  "endpoint" TEXT,
  "kubeconfigCipher" TEXT,
  "errorMessage" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "deletedAt" TIMESTAMP(3),
  CONSTRAINT "managed_k8s_clusters_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "managed_k8s_clusters_userId_name_key" ON "managed_k8s_clusters"("userId", "name");
CREATE INDEX IF NOT EXISTS "managed_k8s_clusters_status_idx" ON "managed_k8s_clusters"("status");

CREATE TABLE IF NOT EXISTS "managed_k8s_node_pools" (
  "id" TEXT NOT NULL,
  "clusterId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "nodeCount" INTEGER NOT NULL DEFAULT 1,
  "cpuCores" INTEGER NOT NULL DEFAULT 2,
  "memoryMb" INTEGER NOT NULL DEFAULT 4096,
  "storageGb" INTEGER NOT NULL DEFAULT 40,
  "autoscale" BOOLEAN NOT NULL DEFAULT false,
  "minNodes" INTEGER NOT NULL DEFAULT 1,
  "maxNodes" INTEGER NOT NULL DEFAULT 3,
  "status" "ManagedServiceStatus" NOT NULL DEFAULT 'PROVISIONING',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "managed_k8s_node_pools_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "managed_k8s_node_pools_clusterId_name_key" ON "managed_k8s_node_pools"("clusterId", "name");
ALTER TABLE "managed_k8s_node_pools" DROP CONSTRAINT IF EXISTS "managed_k8s_node_pools_clusterId_fkey";
ALTER TABLE "managed_k8s_node_pools" ADD CONSTRAINT "managed_k8s_node_pools_clusterId_fkey"
  FOREIGN KEY ("clusterId") REFERENCES "managed_k8s_clusters"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- VM import (BYO VM)
CREATE TABLE IF NOT EXISTS "vm_import_jobs" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "sourceType" TEXT NOT NULL DEFAULT 'URL',
  "sourceUrl" TEXT,
  "sourceFormat" TEXT NOT NULL DEFAULT 'qcow2',
  "sizeBytes" BIGINT NOT NULL DEFAULT 0,
  "checksum" TEXT,
  "targetClusterId" TEXT,
  "targetNode" TEXT,
  "cpuCores" INTEGER NOT NULL DEFAULT 2,
  "memoryMb" INTEGER NOT NULL DEFAULT 2048,
  "diskGb" INTEGER NOT NULL DEFAULT 40,
  "status" "VmImportStatus" NOT NULL DEFAULT 'PENDING',
  "progress" INTEGER NOT NULL DEFAULT 0,
  "vpsId" TEXT,
  "errorMessage" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "vm_import_jobs_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "vm_import_jobs_userId_status_idx" ON "vm_import_jobs"("userId", "status");

-- Community app catalog
CREATE TABLE IF NOT EXISTS "catalog_apps" (
  "id" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "summary" TEXT NOT NULL,
  "description" TEXT,
  "category" TEXT NOT NULL DEFAULT 'other',
  "iconUrl" TEXT,
  "repoUrl" TEXT,
  "composeSpec" JSONB,
  "authorId" TEXT NOT NULL,
  "authorName" TEXT,
  "status" "CatalogSubmissionStatus" NOT NULL DEFAULT 'PENDING_REVIEW',
  "reviewerId" TEXT,
  "reviewNotes" TEXT,
  "installCount" INTEGER NOT NULL DEFAULT 0,
  "ratingSum" INTEGER NOT NULL DEFAULT 0,
  "ratingCount" INTEGER NOT NULL DEFAULT 0,
  "publishedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "catalog_apps_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "catalog_apps_slug_key" ON "catalog_apps"("slug");
CREATE INDEX IF NOT EXISTS "catalog_apps_status_category_idx" ON "catalog_apps"("status", "category");

CREATE TABLE IF NOT EXISTS "catalog_app_reviews" (
  "id" TEXT NOT NULL,
  "appId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "rating" INTEGER NOT NULL,
  "comment" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "catalog_app_reviews_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "catalog_app_reviews_appId_userId_key" ON "catalog_app_reviews"("appId", "userId");
ALTER TABLE "catalog_app_reviews" DROP CONSTRAINT IF EXISTS "catalog_app_reviews_appId_fkey";
ALTER TABLE "catalog_app_reviews" ADD CONSTRAINT "catalog_app_reviews_appId_fkey"
  FOREIGN KEY ("appId") REFERENCES "catalog_apps"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- White-label reseller brands
CREATE TABLE IF NOT EXISTS "reseller_brands" (
  "id" TEXT NOT NULL,
  "ownerId" TEXT NOT NULL,
  "organizationId" TEXT,
  "slug" TEXT NOT NULL,
  "companyName" TEXT NOT NULL,
  "domain" TEXT,
  "logoUrl" TEXT,
  "primaryColor" TEXT NOT NULL DEFAULT '#6366f1',
  "supportEmail" TEXT,
  "markupPercent" DOUBLE PRECISION NOT NULL DEFAULT 20,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "reseller_brands_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "reseller_brands_slug_key" ON "reseller_brands"("slug");
CREATE UNIQUE INDEX IF NOT EXISTS "reseller_brands_domain_key" ON "reseller_brands"("domain");
CREATE INDEX IF NOT EXISTS "reseller_brands_ownerId_idx" ON "reseller_brands"("ownerId");

-- Consolidated org invoices
CREATE TABLE IF NOT EXISTS "consolidated_invoices" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "periodStart" TIMESTAMP(3) NOT NULL,
  "periodEnd" TIMESTAMP(3) NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'USD',
  "subtotal" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "taxAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "total" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "memberCount" INTEGER NOT NULL DEFAULT 0,
  "invoiceIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "status" TEXT NOT NULL DEFAULT 'DRAFT',
  "issuedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "consolidated_invoices_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "consolidated_invoices_organizationId_periodStart_key" ON "consolidated_invoices"("organizationId", "periodStart");
CREATE INDEX IF NOT EXISTS "consolidated_invoices_organizationId_idx" ON "consolidated_invoices"("organizationId");

-- Egypt ETA e-invoicing
CREATE TABLE IF NOT EXISTS "eta_invoice_submissions" (
  "id" TEXT NOT NULL,
  "invoiceId" TEXT NOT NULL,
  "internalId" TEXT NOT NULL,
  "uuid" TEXT,
  "longId" TEXT,
  "submissionUid" TEXT,
  "totalEGP" DOUBLE PRECISION NOT NULL,
  "taxEGP" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "status" "EtaSubmissionStatus" NOT NULL DEFAULT 'PENDING',
  "documentJson" JSONB NOT NULL,
  "errorMessage" TEXT,
  "submittedAt" TIMESTAMP(3),
  "acceptedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "eta_invoice_submissions_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "eta_invoice_submissions_invoiceId_key" ON "eta_invoice_submissions"("invoiceId");
CREATE INDEX IF NOT EXISTS "eta_invoice_submissions_status_idx" ON "eta_invoice_submissions"("status");

-- DDoS mitigation events
CREATE TABLE IF NOT EXISTS "ddos_mitigation_events" (
  "id" TEXT NOT NULL,
  "vpsId" TEXT,
  "targetIp" TEXT NOT NULL,
  "tier" TEXT NOT NULL DEFAULT 'STANDARD',
  "attackType" TEXT NOT NULL DEFAULT 'VOLUMETRIC',
  "peakMbps" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "peakPps" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "blockedIps" INTEGER NOT NULL DEFAULT 0,
  "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "endedAt" TIMESTAMP(3),
  "mitigated" BOOLEAN NOT NULL DEFAULT true,
  CONSTRAINT "ddos_mitigation_events_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "ddos_mitigation_events_vpsId_idx" ON "ddos_mitigation_events"("vpsId");
CREATE INDEX IF NOT EXISTS "ddos_mitigation_events_startedAt_idx" ON "ddos_mitigation_events"("startedAt");

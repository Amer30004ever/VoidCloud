-- AmerCloud HaaS

-- Extend Role enum
ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'SUPER_ADMIN';
ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'BILLING_MANAGER';

-- New enums
CREATE TYPE "CloudSubscriptionStatus" AS ENUM ('ACTIVE','PAST_DUE','CANCELED','TRIALING','EXPIRED','SUSPENDED');
CREATE TYPE "CloudDeploymentStatus" AS ENUM ('PENDING','DEPLOYING','RUNNING','STOPPED','FAILED','DELETED');
CREATE TYPE "CloudDeploymentType" AS ENUM ('GITHUB','DOCKER_IMAGE','DOCKER_COMPOSE');
CREATE TYPE "CloudInvoiceStatus" AS ENUM ('PENDING','PAID','FAILED','REFUNDED');
CREATE TYPE "CloudPaymentMethodType" AS ENUM ('CREDIT_CARD','FAWRY','INSTAPAY','VODAFONE_CASH','CASH');

-- Extend User
ALTER TABLE "User"
  ADD COLUMN IF NOT EXISTS "avatar" TEXT,
  ADD COLUMN IF NOT EXISTS "emailVerified" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "twoFactorSecret" TEXT,
  ADD COLUMN IF NOT EXISTS "cloudPlanId" TEXT,
  ADD COLUMN IF NOT EXISTS "trialEndsAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "subscriptionStatus" "CloudSubscriptionStatus" NOT NULL DEFAULT 'TRIALING',
  ADD COLUMN IF NOT EXISTS "overrideLimits" JSONB,
  ADD COLUMN IF NOT EXISTS "suspendedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "suspendedReason" TEXT,
  ADD COLUMN IF NOT EXISTS "lastLoginAt" TIMESTAMP(3);

-- CloudPlan
CREATE TABLE "CloudPlan" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "description" TEXT,
  "priceUSD" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "priceEGP" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "interval" TEXT NOT NULL DEFAULT 'monthly',
  "cpuLimit" DOUBLE PRECISION NOT NULL DEFAULT 0.25,
  "memoryLimit" INTEGER NOT NULL DEFAULT 512,
  "storageLimit" INTEGER NOT NULL DEFAULT 1024,
  "deploymentLimit" INTEGER NOT NULL DEFAULT 1,
  "customDomainLimit" INTEGER NOT NULL DEFAULT 0,
  "apiRequestLimit" INTEGER NOT NULL DEFAULT 10000,
  "teamMemberLimit" INTEGER NOT NULL DEFAULT 1,
  "databaseSizeLimit" INTEGER NOT NULL DEFAULT 0,
  "redisLimit" INTEGER,
  "trialDays" INTEGER NOT NULL DEFAULT 0,
  "features" JSONB NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "isPopular" BOOLEAN NOT NULL DEFAULT false,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CloudPlan_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "CloudPlan_name_key" ON "CloudPlan"("name");
CREATE UNIQUE INDEX "CloudPlan_slug_key" ON "CloudPlan"("slug");

ALTER TABLE "User" ADD CONSTRAINT "User_cloudPlanId_fkey" FOREIGN KEY ("cloudPlanId") REFERENCES "CloudPlan"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CloudDeployment
CREATE TABLE "CloudDeployment" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "status" "CloudDeploymentStatus" NOT NULL DEFAULT 'PENDING',
  "type" "CloudDeploymentType" NOT NULL DEFAULT 'DOCKER_IMAGE',
  "source" TEXT NOT NULL,
  "namespace" TEXT NOT NULL,
  "subdomain" TEXT,
  "cpu" DOUBLE PRECISION NOT NULL DEFAULT 0.25,
  "memory" INTEGER NOT NULL DEFAULT 512,
  "storage" INTEGER NOT NULL DEFAULT 1024,
  "replicas" INTEGER NOT NULL DEFAULT 1,
  "customDomains" TEXT[],
  "envVars" JSONB,
  "healthCheck" TEXT,
  "lastDeployedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CloudDeployment_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "CloudDeployment_namespace_key" ON "CloudDeployment"("namespace");
CREATE UNIQUE INDEX "CloudDeployment_subdomain_key" ON "CloudDeployment"("subdomain");
CREATE INDEX "CloudDeployment_userId_status_idx" ON "CloudDeployment"("userId","status");
ALTER TABLE "CloudDeployment" ADD CONSTRAINT "CloudDeployment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CloudInvoice
CREATE TABLE "CloudInvoice" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "number" TEXT NOT NULL,
  "amountUSD" DOUBLE PRECISION,
  "amountEGP" DOUBLE PRECISION,
  "currency" TEXT NOT NULL DEFAULT 'USD',
  "status" "CloudInvoiceStatus" NOT NULL DEFAULT 'PENDING',
  "description" TEXT NOT NULL,
  "provider" TEXT,
  "providerRef" TEXT,
  "dueDate" TIMESTAMP(3) NOT NULL,
  "paidAt" TIMESTAMP(3),
  "refundedAt" TIMESTAMP(3),
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CloudInvoice_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "CloudInvoice_number_key" ON "CloudInvoice"("number");
CREATE INDEX "CloudInvoice_userId_status_idx" ON "CloudInvoice"("userId","status");
ALTER TABLE "CloudInvoice" ADD CONSTRAINT "CloudInvoice_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CloudPaymentMethod
CREATE TABLE "CloudPaymentMethod" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "type" "CloudPaymentMethodType" NOT NULL,
  "providerId" TEXT NOT NULL,
  "label" TEXT,
  "last4" TEXT,
  "isDefault" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CloudPaymentMethod_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "CloudPaymentMethod_userId_idx" ON "CloudPaymentMethod"("userId");
ALTER TABLE "CloudPaymentMethod" ADD CONSTRAINT "CloudPaymentMethod_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CloudAnnouncement
CREATE TABLE "CloudAnnouncement" (
  "id" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "severity" TEXT NOT NULL DEFAULT 'info',
  "audience" TEXT NOT NULL DEFAULT 'all',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CloudAnnouncement_pkey" PRIMARY KEY ("id")
);

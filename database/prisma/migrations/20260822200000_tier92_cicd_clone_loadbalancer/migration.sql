-- Tier 9.2 — per-VPS CI/CD, staging clones, load balancing.

-- CreateEnum
DO $$ BEGIN
  CREATE TYPE "CicdProvider" AS ENUM ('NONE', 'GITHUB', 'GITLAB');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "DeployRunStatus" AS ENUM ('QUEUED', 'RUNNING', 'SUCCEEDED', 'FAILED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "LoadBalancerAlgorithm" AS ENUM ('ROUND_ROBIN', 'LEAST_CONNECTIONS', 'IP_HASH');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "LoadBalancerStatus" AS ENUM ('PROVISIONING', 'ACTIVE', 'DEGRADED', 'DISABLED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- AlterTable: staging clone lineage on CloudDeployment
ALTER TABLE "CloudDeployment" ADD COLUMN IF NOT EXISTS "clonedFromId" TEXT;
ALTER TABLE "CloudDeployment" ADD COLUMN IF NOT EXISTS "isStaging" BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS "CloudDeployment_clonedFromId_idx" ON "CloudDeployment"("clonedFromId");

DO $$ BEGIN
  ALTER TABLE "CloudDeployment"
    ADD CONSTRAINT "CloudDeployment_clonedFromId_fkey"
    FOREIGN KEY ("clonedFromId") REFERENCES "CloudDeployment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- CreateTable
CREATE TABLE IF NOT EXISTS "vps_cicd_configs" (
    "id" TEXT NOT NULL,
    "vpsId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "provider" "CicdProvider" NOT NULL DEFAULT 'NONE',
    "repository" TEXT,
    "autoDeployBranch" TEXT NOT NULL DEFAULT 'main',
    "autoDeploy" BOOLEAN NOT NULL DEFAULT false,
    "prPreview" BOOLEAN NOT NULL DEFAULT false,
    "buildCommand" TEXT,
    "deployCommand" TEXT,
    "accessTokenCipher" TEXT,
    "webhookToken" TEXT NOT NULL,
    "webhookSecretCipher" TEXT NOT NULL,
    "lastTriggeredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vps_cicd_configs_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "vps_cicd_configs_vpsId_key" ON "vps_cicd_configs"("vpsId");
CREATE UNIQUE INDEX IF NOT EXISTS "vps_cicd_configs_webhookToken_key" ON "vps_cicd_configs"("webhookToken");
CREATE INDEX IF NOT EXISTS "vps_cicd_configs_userId_idx" ON "vps_cicd_configs"("userId");

DO $$ BEGIN
  ALTER TABLE "vps_cicd_configs"
    ADD CONSTRAINT "vps_cicd_configs_vpsId_fkey"
    FOREIGN KEY ("vpsId") REFERENCES "CloudDeployment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- CreateTable
CREATE TABLE IF NOT EXISTS "vps_deploy_runs" (
    "id" TEXT NOT NULL,
    "vpsId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "provider" "CicdProvider" NOT NULL DEFAULT 'NONE',
    "status" "DeployRunStatus" NOT NULL DEFAULT 'QUEUED',
    "ref" TEXT,
    "commitSha" TEXT,
    "message" TEXT,
    "trigger" TEXT NOT NULL DEFAULT 'manual',
    "detail" JSONB,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),

    CONSTRAINT "vps_deploy_runs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "vps_deploy_runs_vpsId_startedAt_idx" ON "vps_deploy_runs"("vpsId", "startedAt");
CREATE INDEX IF NOT EXISTS "vps_deploy_runs_userId_idx" ON "vps_deploy_runs"("userId");

DO $$ BEGIN
  ALTER TABLE "vps_deploy_runs"
    ADD CONSTRAINT "vps_deploy_runs_vpsId_fkey"
    FOREIGN KEY ("vpsId") REFERENCES "CloudDeployment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- CreateTable
CREATE TABLE IF NOT EXISTS "load_balancers" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "vpsId" TEXT,
    "algorithm" "LoadBalancerAlgorithm" NOT NULL DEFAULT 'ROUND_ROBIN',
    "status" "LoadBalancerStatus" NOT NULL DEFAULT 'PROVISIONING',
    "listenPort" INTEGER NOT NULL DEFAULT 80,
    "targetPort" INTEGER NOT NULL DEFAULT 80,
    "healthCheckPath" TEXT NOT NULL DEFAULT '/',
    "ipAddress" TEXT,
    "monthlyUsd" DOUBLE PRECISION NOT NULL DEFAULT 5,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "load_balancers_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "load_balancers_userId_name_key" ON "load_balancers"("userId", "name");
CREATE INDEX IF NOT EXISTS "load_balancers_status_idx" ON "load_balancers"("status");

DO $$ BEGIN
  ALTER TABLE "load_balancers"
    ADD CONSTRAINT "load_balancers_vpsId_fkey"
    FOREIGN KEY ("vpsId") REFERENCES "CloudDeployment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- CreateTable
CREATE TABLE IF NOT EXISTS "load_balancer_backends" (
    "id" TEXT NOT NULL,
    "loadBalancerId" TEXT NOT NULL,
    "vpsId" TEXT NOT NULL,
    "weight" INTEGER NOT NULL DEFAULT 1,
    "healthy" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "load_balancer_backends_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "load_balancer_backends_loadBalancerId_vpsId_key" ON "load_balancer_backends"("loadBalancerId", "vpsId");
CREATE INDEX IF NOT EXISTS "load_balancer_backends_vpsId_idx" ON "load_balancer_backends"("vpsId");

DO $$ BEGIN
  ALTER TABLE "load_balancer_backends"
    ADD CONSTRAINT "load_balancer_backends_loadBalancerId_fkey"
    FOREIGN KEY ("loadBalancerId") REFERENCES "load_balancers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "load_balancer_backends"
    ADD CONSTRAINT "load_balancer_backends_vpsId_fkey"
    FOREIGN KEY ("vpsId") REFERENCES "CloudDeployment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

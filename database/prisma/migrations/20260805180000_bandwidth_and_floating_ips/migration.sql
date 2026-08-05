-- Tier 9: bandwidth metering + floating IP pool (IPv4/IPv6)

ALTER TABLE "CloudDeployment" ADD COLUMN IF NOT EXISTS "ipv6Address" TEXT;

CREATE TABLE "bandwidth_samples" (
    "id" TEXT NOT NULL,
    "vpsId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "rxBytes" BIGINT NOT NULL,
    "txBytes" BIGINT NOT NULL,
    "sampledAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bandwidth_samples_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "bandwidth_samples_vpsId_sampledAt_idx" ON "bandwidth_samples"("vpsId", "sampledAt");
CREATE INDEX "bandwidth_samples_userId_idx" ON "bandwidth_samples"("userId");

ALTER TABLE "bandwidth_samples" ADD CONSTRAINT "bandwidth_samples_vpsId_fkey"
  FOREIGN KEY ("vpsId") REFERENCES "CloudDeployment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "bandwidth_overages" (
    "id" TEXT NOT NULL,
    "vpsId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "includedGb" DOUBLE PRECISION NOT NULL,
    "usedGb" DOUBLE PRECISION NOT NULL,
    "overageGb" DOUBLE PRECISION NOT NULL,
    "ratePerGb" DOUBLE PRECISION NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "transactionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bandwidth_overages_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "bandwidth_overages_vpsId_periodStart_key" ON "bandwidth_overages"("vpsId", "periodStart");
CREATE INDEX "bandwidth_overages_userId_idx" ON "bandwidth_overages"("userId");
CREATE INDEX "bandwidth_overages_periodStart_idx" ON "bandwidth_overages"("periodStart");

ALTER TABLE "bandwidth_overages" ADD CONSTRAINT "bandwidth_overages_vpsId_fkey"
  FOREIGN KEY ("vpsId") REFERENCES "CloudDeployment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TYPE "FloatingIpStatus" AS ENUM ('AVAILABLE', 'RESERVED', 'ASSIGNED');

CREATE TABLE "floating_ips" (
    "id" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "ipVersion" INTEGER NOT NULL DEFAULT 4,
    "cidr" TEXT,
    "gateway" TEXT,
    "poolName" TEXT NOT NULL DEFAULT 'default',
    "status" "FloatingIpStatus" NOT NULL DEFAULT 'AVAILABLE',
    "userId" TEXT,
    "vpsId" TEXT,
    "reservedAt" TIMESTAMP(3),
    "assignedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "floating_ips_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "floating_ips_address_key" ON "floating_ips"("address");
CREATE INDEX "floating_ips_status_ipVersion_poolName_idx" ON "floating_ips"("status", "ipVersion", "poolName");
CREATE INDEX "floating_ips_userId_idx" ON "floating_ips"("userId");

ALTER TABLE "floating_ips" ADD CONSTRAINT "floating_ips_vpsId_fkey"
  FOREIGN KEY ("vpsId") REFERENCES "CloudDeployment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

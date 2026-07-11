-- CreateTable
CREATE TABLE "pending_allocations" (
    "id" TEXT NOT NULL,
    "clusterId" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "cpu" INTEGER NOT NULL,
    "ramMB" INTEGER NOT NULL,
    "diskGB" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pending_allocations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "pending_allocations_requestId_key" ON "pending_allocations"("requestId");

-- CreateIndex
CREATE INDEX "pending_allocations_clusterId_status_expiresAt_idx" ON "pending_allocations"("clusterId", "status", "expiresAt");

-- AddForeignKey
ALTER TABLE "pending_allocations" ADD CONSTRAINT "pending_allocations_clusterId_fkey" FOREIGN KEY ("clusterId") REFERENCES "proxmox_clusters"("id") ON DELETE CASCADE ON UPDATE CASCADE;

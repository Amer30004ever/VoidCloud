-- Maintenance windows
CREATE TABLE "Maintenance" (
  "id" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "affectedServices" TEXT[],
  "startAt" TIMESTAMP(3) NOT NULL,
  "endAt" TIMESTAMP(3) NOT NULL,
  "status" TEXT NOT NULL,
  "createdBy" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Maintenance_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "Maintenance_startAt_idx" ON "Maintenance"("startAt");
CREATE INDEX "Maintenance_status_idx" ON "Maintenance"("status");

-- Incidents
CREATE TABLE "Incident" (
  "id" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "severity" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "resolvedAt" TIMESTAMP(3),
  CONSTRAINT "Incident_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "Incident_status_idx" ON "Incident"("status");
CREATE INDEX "Incident_createdAt_idx" ON "Incident"("createdAt");

-- Incident updates
CREATE TABLE "IncidentUpdate" (
  "id" TEXT NOT NULL,
  "incidentId" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "IncidentUpdate_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "IncidentUpdate_incidentId_fkey" FOREIGN KEY ("incidentId") REFERENCES "Incident"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "IncidentUpdate_incidentId_idx" ON "IncidentUpdate"("incidentId");

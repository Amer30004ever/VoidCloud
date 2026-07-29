-- GDPR-style ToS acceptance tracking

CREATE TABLE "tos_acceptances" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "userId" TEXT NOT NULL,
    "tosVersion" TEXT NOT NULL,
    "privacyVersion" TEXT NOT NULL,
    "acceptedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ipAddress" TEXT,
    "userAgent" TEXT,

    CONSTRAINT "tos_acceptances_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "tos_acceptances_userId_tosVersion_key" ON "tos_acceptances"("userId", "tosVersion");

CREATE INDEX "tos_acceptances_userId_idx" ON "tos_acceptances"("userId");

ALTER TABLE "tos_acceptances" ADD CONSTRAINT "tos_acceptances_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

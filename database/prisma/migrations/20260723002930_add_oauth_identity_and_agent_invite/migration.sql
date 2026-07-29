-- CreateTable
CREATE TABLE "oauth_identities" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "userId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "oauth_identities_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "oauth_identities_provider_providerAccountId_key" ON "oauth_identities"("provider", "providerAccountId");

-- CreateIndex
CREATE INDEX "oauth_identities_userId_idx" ON "oauth_identities"("userId");

-- CreateTable
CREATE TABLE "agent_invites" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "tenantId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "acceptedAt" TIMESTAMP(3),

    CONSTRAINT "agent_invites_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "agent_invites_token_key" ON "agent_invites"("token");

-- CreateIndex
CREATE INDEX "agent_invites_email_idx" ON "agent_invites"("email");

-- AddForeignKey
ALTER TABLE "oauth_identities" ADD CONSTRAINT "oauth_identities_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

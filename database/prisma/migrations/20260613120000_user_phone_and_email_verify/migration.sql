-- Add phone + email verification fields to User
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "phone" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "emailVerifyTokenHash" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "emailVerifyExpires" TIMESTAMP(3);
CREATE UNIQUE INDEX IF NOT EXISTS "User_emailVerifyTokenHash_key" ON "User"("emailVerifyTokenHash");

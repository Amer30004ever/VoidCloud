-- 01-init-db.sql
DO $$ BEGIN
    CREATE TYPE "Role" AS ENUM ('USER', 'ADMIN');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "MessageType" AS ENUM ('TEXT', 'IMAGE', 'VIDEO', 'DOCUMENT', 'AUDIO');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "ConversationStatus" AS ENUM ('ACTIVE', 'ARCHIVED', 'BLOCKED');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- Create User table with all required columns
CREATE TABLE IF NOT EXISTS "User" (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    name TEXT,
    role "Role" DEFAULT 'USER',
    "isActive" BOOLEAN DEFAULT true,
    "lastLogin" TIMESTAMP,
    "refreshToken" TEXT,
    "resetToken" TEXT,
    "resetTokenExpiry" TIMESTAMP,
    "createdAt" TIMESTAMP DEFAULT NOW(),
    "updatedAt" TIMESTAMP DEFAULT NOW()
);

-- Create Conversation table
CREATE TABLE IF NOT EXISTS "Conversation" (
    id TEXT PRIMARY KEY,
    title TEXT,
    status "ConversationStatus" DEFAULT 'ACTIVE',
    "userId" TEXT REFERENCES "User"(id),
    "createdAt" TIMESTAMP DEFAULT NOW(),
    "updatedAt" TIMESTAMP DEFAULT NOW()
);

-- Create Message table
CREATE TABLE IF NOT EXISTS "Message" (
    id TEXT PRIMARY KEY,
    content TEXT,
    type "MessageType" DEFAULT 'TEXT',
    "conversationId" TEXT REFERENCES "Conversation"(id),
    "senderId" TEXT REFERENCES "User"(id),
    "createdAt" TIMESTAMP DEFAULT NOW()
);

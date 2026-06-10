#!/bin/bash

echo "Setting up Amer Portal..."

# Stop everything
docker compose down -v

# Start postgres
docker compose up -d postgres

# Wait for postgres
sleep 10

# Create schema
docker compose exec -T postgres psql -U postgres -d amer_portal << 'SQL'
DROP SCHEMA public CASCADE;
CREATE SCHEMA public;
CREATE TYPE "Role" AS ENUM ('USER', 'ADMIN', 'AGENT');
CREATE TYPE "MessageType" AS ENUM ('TEXT', 'IMAGE', 'AUDIO', 'VIDEO', 'DOCUMENT', 'TEMPLATE');
CREATE TYPE "ConversationStatus" AS ENUM ('ACTIVE', 'RESOLVED', 'PENDING', 'OPEN');
CREATE TABLE "User" (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), email TEXT UNIQUE NOT NULL, name TEXT NOT NULL, password TEXT NOT NULL, role "Role" DEFAULT 'USER', "isActive" BOOLEAN DEFAULT true, "createdAt" TIMESTAMP DEFAULT NOW(), "updatedAt" TIMESTAMP DEFAULT NOW());
CREATE TABLE "Conversation" (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), "userId" UUID NOT NULL REFERENCES "User"(id) ON DELETE CASCADE, platform TEXT NOT NULL, "contactId" TEXT, "platformId" TEXT, title TEXT, status "ConversationStatus" DEFAULT 'OPEN', "createdAt" TIMESTAMP DEFAULT NOW(), "updatedAt" TIMESTAMP DEFAULT NOW());
CREATE TABLE "Message" (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), "conversationId" UUID NOT NULL REFERENCES "Conversation"(id) ON DELETE CASCADE, role TEXT NOT NULL, content TEXT NOT NULL, type "MessageType" DEFAULT 'TEXT', "mediaUrl" TEXT, "waMessageId" TEXT, direction TEXT DEFAULT 'OUTBOUND', "createdAt" TIMESTAMP DEFAULT NOW(), "userId" UUID REFERENCES "User"(id) ON DELETE SET NULL);
CREATE TABLE "WhatsappContact" (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), "userId" UUID NOT NULL REFERENCES "User"(id) ON DELETE CASCADE, "waId" TEXT UNIQUE NOT NULL, name TEXT, phone TEXT, "createdAt" TIMESTAMP DEFAULT NOW(), "updatedAt" TIMESTAMP DEFAULT NOW());
CREATE TABLE "WebhookLog" (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), platform TEXT NOT NULL, "eventType" TEXT NOT NULL, source TEXT, payload JSONB, processed BOOLEAN DEFAULT false, "createdAt" TIMESTAMP DEFAULT NOW());
SQL

# Start backend and frontend
docker compose up -d

# Wait for backend
sleep 15

# Create admin user
docker compose exec -T backend node -e "
const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
bcrypt.hash('AmerDevOps2026!', 10).then(hash => 
  prisma.user.upsert({
    where: { email: 'admin@amer.dev' },
    update: { password: hash, isActive: true, role: 'ADMIN' },
    create: { email: 'admin@amer.dev', name: 'Amer Admin', password: hash, role: 'ADMIN', isActive: true }
  }).then(() => console.log('✅ Admin created')).finally(() => prisma.$disconnect())
);
"

echo "Setup complete! Test with:"
echo "curl -X POST http://localhost:3001/api/v1/auth/login -H 'Content-Type: application/json' -d '{\"email\":\"admin@amer.dev\",\"password\":\"AmerDevOps2026!\"}'"

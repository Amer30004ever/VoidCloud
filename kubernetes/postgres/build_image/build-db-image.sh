#!/bin/bash

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================${NC}"
echo -e "${GREEN}🐘 Building Custom PostgreSQL Image${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

IMAGE_NAME="amer30004ever/voidcloud-postgres"
TAG=$(date +"%Y%m%d-%H%M%S")

# Step 1: Create postgres directory if not exists
echo -e "${YELLOW}Creating postgres directory...${NC}"
mkdir -p postgres

# Step 2: Create init scripts
echo -e "${YELLOW}Creating initialization scripts...${NC}"

cat > postgres/01-init-db.sql << 'EOF'
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
EOF

cat > postgres/02-seed-admin.sql << 'EOF'
-- 02-seed-admin.sql
-- Insert admin user (password: AmerDevOps2026!)
INSERT INTO "User" (id, email, password, name, role, "isActive") 
VALUES (
    '4b4a9fc0-1271-47d4-8ff7-619e0e0ee254',
    'admin@amer.dev',
    '$2b$10$vEM2gvnLFKt2W7BfYuYhFeIRFrRsjvwPGen8WLEBcGF7k2t46n5Fq',
    'Amer Admin',
    'ADMIN',
    true
) ON CONFLICT (email) DO NOTHING;
EOF

# Step 3: Create Dockerfile
echo -e "${YELLOW}Creating Dockerfile...${NC}"

cat > postgres/Dockerfile << 'EOF'
FROM postgres:15-alpine

ENV POSTGRES_USER=postgres
ENV POSTGRES_PASSWORD=AmerDevOps2026
ENV POSTGRES_DB=voidcloud

# Copy initialization scripts (executed in alphabetical order)
COPY 01-init-db.sql /docker-entrypoint-initdb.d/
COPY 02-seed-admin.sql /docker-entrypoint-initdb.d/

EXPOSE 5432
EOF

echo -e "${GREEN}✅ Scripts created${NC}"
echo ""

# Step 4: Build image
echo -e "${YELLOW}Building Docker image...${NC}"
docker build -t "${IMAGE_NAME}:latest" -t "${IMAGE_NAME}:${TAG}" ./postgres

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Docker build failed!${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Image built successfully${NC}"
echo ""

# Step 5: Push to Docker Hub
echo -e "${YELLOW}Pushing to Docker Hub...${NC}"

# Check if logged into Docker Hub
if ! docker info | grep -q "Username"; then
    echo -e "${YELLOW}Not logged into Docker Hub. Please login first:${NC}"
    docker login
fi

docker push "${IMAGE_NAME}:latest"
docker push "${IMAGE_NAME}:${TAG}"

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}✅ Custom PostgreSQL image created!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "${CYAN}Image name: ${IMAGE_NAME}${NC}"
echo -e "${CYAN}Tags: latest, ${TAG}${NC}"
echo ""
echo -e "${YELLOW}To use in Docker Compose:${NC}"
echo -e "  ${WHITE}image: ${IMAGE_NAME}:latest${NC}"
echo ""
echo -e "${YELLOW}To use in Kubernetes:${NC}"
echo -e "  ${WHITE}image: ${IMAGE_NAME}:latest${NC}"
echo ""
echo -e "${YELLOW}To test locally:${NC}"
echo -e "  ${WHITE}docker run -d -p 5432:5432 ${IMAGE_NAME}:latest${NC}"
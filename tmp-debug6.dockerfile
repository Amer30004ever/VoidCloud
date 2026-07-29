FROM node:20-alpine AS builder
WORKDIR /workspace
COPY services/auth ./services/auth
COPY database ./database
COPY shared ./shared
WORKDIR /workspace/services/auth
RUN npm install && npm install typescript ts-node @types/node @types/jest express ioredis && npx prisma@6 generate --schema=../../database/prisma/schema.prisma && echo node_modules_structure= && ls -la node_modules/@nestjs/common | head -10

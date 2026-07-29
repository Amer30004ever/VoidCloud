FROM node:20-alpine AS builder
WORKDIR /workspace
COPY services/auth/package.json ./services/auth/
COPY database/prisma ./services/auth/prisma/
COPY shared ./shared
COPY services/billing ./services/billing
COPY services/auth/src ./services/auth/src/
COPY services/auth/tsconfig*.json ./services/auth/
WORKDIR /workspace/services/auth
RUN npm install && npm install axios @nestjs/schedule @nestjs/microservices @sentry/node express ioredis && npx prisma generate --schema=./prisma/schema.prisma && cp -r node_modules ../../node_modules && echo node_modules_check= && ls ../../node_modules/@nestjs/common 2>&1 && echo shared_check= && ls ../../shared/logging/index.ts 2>&1

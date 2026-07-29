FROM node:20-alpine AS builder
WORKDIR /workspace
COPY . .
WORKDIR /workspace/services/auth
RUN npm install -g pnpm && cd /workspace && pnpm install --ignore-scripts && echo prisma_check= && ls node_modules/.bin/prisma 2>&1 && ls ../../node_modules/.bin/prisma 2>&1 && which prisma 2>&1

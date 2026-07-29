FROM node:20-alpine AS builder
WORKDIR /workspace
COPY . .
RUN npm install -g pnpm && pnpm install --ignore-scripts && echo prisma_search= && find node_modules -name prisma -type f 2>/dev/null | head -10

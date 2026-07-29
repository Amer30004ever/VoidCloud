FROM node:20-alpine AS builder
WORKDIR /workspace
COPY services/auth ./services/auth
COPY database ./database
COPY shared ./shared
WORKDIR /workspace/services/auth
RUN npm install && npm install typescript ts-node @types/node @types/jest && npx prisma@6 generate --schema=../../database/prisma/schema.prisma && echo tsc_version= && ./node_modules/.bin/tsc --version && echo testing_resolution= && ./node_modules/.bin/tsc --version 2>&1 | head -5

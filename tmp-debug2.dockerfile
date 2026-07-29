FROM node:20-alpine AS builder
WORKDIR /workspace
COPY services/auth ./services/auth
COPY database ./database
COPY shared ./shared
WORKDIR /workspace/services/auth
RUN npm install && npm install typescript ts-node @types/node @types/jest && \
    npx prisma@6 generate --schema=../../database/prisma/schema.prisma && \
    mkdir -p ../shared/node_modules && cp -r node_modules/. ../shared/node_modules/ && \
    ls ../shared/node_modules/@nestjs 2>&1 | head -3 && \
    ls ../shared/node_modules/ioredis 2>&1 | head -3 && \
    ls ../shared/node_modules/express 2>&1 | head -3 && \
    ./node_modules/.bin/tsc -p tsconfig.build.json 2>&1 | head -20

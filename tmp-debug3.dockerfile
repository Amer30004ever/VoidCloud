FROM node:20-alpine AS builder
WORKDIR /workspace
COPY services/auth ./services/auth
COPY database ./database
COPY shared ./shared
WORKDIR /workspace/services/auth
RUN npm install && npm install typescript ts-node @types/node @types/jest && \
    npx prisma@6 generate --schema=../../database/prisma/schema.prisma && \
    echo "=== node_modules contents ===" && ls node_modules | wc -l && \
    echo "=== @nestjs packages ===" && ls node_modules/@nestjs 2>&1 && \
    echo "=== express ===" && ls node_modules/express 2>&1 && \
    echo "=== ioredis ===" && ls node_modules/ioredis 2>&1 && \
    echo "=== nodemailer ===" && ls node_modules/nodemailer 2>&1 && \
    echo "=== resend ===" && ls node_modules/resend 2>&1 && \
    ./node_modules/.bin/tsc -p tsconfig.build.json 2>&1 | head -10

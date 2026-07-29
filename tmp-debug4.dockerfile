FROM node:20-alpine AS builder
WORKDIR /workspace
COPY services/auth ./services/auth
COPY database ./database
COPY shared ./shared
WORKDIR /workspace/services/auth
RUN npm install && npm install typescript ts-node @types/node @types/jest && \
    npx prisma@6 generate --schema=../../database/prisma/schema.prisma && \
    echo "=== tsc location ===" && which tsc 2>&1 && echo "=== local tsc ===" && ls -la node_modules/.bin/tsc 2>&1 && echo "=== typescript version ===" && ./node_modules/.bin/tsc --version 2>&1 && echo "=== module resolution test ===" && cat > /tmp/test.ts << "EOF"
import { Controller } from "@nestjs/common";
console.log(Controller);
EOF
    ./node_modules/.bin/tsc /tmp/test.ts --module commonjs --moduleResolution node --esModuleInterop --skipLibCheck --outDir /tmp/out 2>&1

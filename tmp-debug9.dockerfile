FROM node:20-alpine AS builder
WORKDIR /workspace
COPY services/auth ./services/auth
COPY database ./database
COPY shared ./shared
WORKDIR /workspace/services/auth
RUN npm install && npm install prisma@6 @prisma/client@6 && npx prisma --version 2>&1

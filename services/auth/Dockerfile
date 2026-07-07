# syntax=docker/dockerfile:1.6
FROM node:20-alpine AS builder
WORKDIR /app
COPY services/auth/package*.json ./
COPY database/prisma ./prisma/
RUN npm install
COPY services/auth/tsconfig*.json ./
COPY services/auth/src ./src/
RUN npx prisma generate --schema=./prisma/schema.prisma \
 && npm run build \
 && npm prune --omit=dev

FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/dist ./dist
EXPOSE 3001
CMD ["node", "dist/main.js"]

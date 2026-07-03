FROM node:20-alpine AS builder
WORKDIR /app
COPY services/notification/package*.json ./
COPY database/prisma ./prisma/
RUN npm ci --no-audit --no-fund --progress=false
COPY services/notification/tsconfig*.json ./
COPY services/notification/src ./src/
RUN npx prisma generate --schema=./prisma/schema.prisma
RUN npm run build
RUN npm prune --omit=dev --no-audit --no-fund --progress=false

FROM node:20-alpine AS runtime
WORKDIR /app
COPY services/notification/package*.json ./
COPY database/prisma ./prisma/
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
ENV NODE_ENV=production
EXPOSE 3009
CMD ["node", "dist/main.js"]

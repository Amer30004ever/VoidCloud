FROM node:20-alpine AS builder
WORKDIR /app
COPY services/notification/package*.json ./
COPY database/prisma ./prisma/
RUN npm config set fetch-retry-maxtimeout 600000 && \
    npm config set fetch-retries 5 && \
    npm ci --no-audit --no-fund --progress=false || \
    npm ci --no-audit --no-fund --progress=false
COPY services/notification/tsconfig*.json ./
COPY services/notification/src ./src/
RUN npx prisma generate --schema=./prisma/schema.prisma
RUN npm run build

FROM node:20-alpine AS runtime
WORKDIR /app
COPY services/notification/package*.json ./
COPY database/prisma ./prisma/
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
ENV NODE_ENV=production
EXPOSE 3009
CMD ["node", "dist/main.js"]

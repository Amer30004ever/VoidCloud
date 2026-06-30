FROM node:20-alpine AS builder
WORKDIR /app
COPY services/notification/package*.json ./
COPY database/prisma ./prisma/
RUN npm ci
COPY services/notification/tsconfig*.json ./
COPY services/notification/src ./src/
RUN npm run build

FROM node:20-alpine
WORKDIR /app
COPY services/notification/package*.json ./
COPY database/prisma ./prisma/
RUN npm ci --omit=dev && npx prisma generate --schema=./prisma/schema.prisma
COPY --from=builder /app/dist ./dist
EXPOSE 3009
CMD ["node", "dist/main.js"]

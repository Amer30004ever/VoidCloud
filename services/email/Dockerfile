FROM node:20-alpine AS builder
WORKDIR /app
COPY services/email/package*.json ./
COPY database/prisma ./prisma/
RUN npm ci
COPY services/email/tsconfig*.json ./
COPY services/email/src ./src/
RUN npx prisma generate --schema=./prisma/schema.prisma
RUN npm run build

FROM node:20-alpine
WORKDIR /app
COPY services/email/package*.json ./
COPY database/prisma ./prisma/
RUN npm ci --omit=dev && npx prisma generate --schema=./prisma/schema.prisma
COPY --from=builder /app/dist ./dist
EXPOSE 3008
CMD ["node", "dist/main.js"]

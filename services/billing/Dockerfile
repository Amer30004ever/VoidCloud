FROM node:20-alpine AS builder
WORKDIR /app
COPY services/billing/package*.json ./
COPY database/prisma ./prisma/
RUN npm install
COPY services/billing/tsconfig*.json ./
COPY services/billing/src ./src/
RUN npx prisma generate --schema=./prisma/schema.prisma
RUN npm run build

FROM node:20-alpine
WORKDIR /app
COPY services/billing/package*.json ./
COPY database/prisma ./prisma/
RUN npm install --omit=dev && npx prisma generate --schema=./prisma/schema.prisma
COPY --from=builder /app/dist ./dist
EXPOSE 3005
CMD ["node", "dist/main.js"]

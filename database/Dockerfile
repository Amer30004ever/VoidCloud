FROM node:20-alpine
WORKDIR /app
COPY package.json ./
COPY prisma ./prisma/
RUN npm ci --omit=dev && npx prisma generate
CMD ["npx", "prisma", "migrate", "deploy"]

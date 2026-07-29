FROM node:20-alpine
WORKDIR /app
COPY package.json ./
COPY database/prisma ./prisma/
RUN npm install prisma@6 @prisma/client@6 --production && npx prisma@6 generate --schema=./prisma/schema.prisma
CMD ["npx", "prisma@6", "migrate", "deploy"]

# Stage 1: Build the NestJS application
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install ALL dependencies (including dev dependencies for build)
RUN npm ci --include=dev

# Copy source code and prisma schema
COPY . .

# Generate Prisma Client (after copying source code to use updated schema)
RUN npx prisma generate

# Build the NestJS application (tsc emits dist/main.js)
RUN rm -rf dist tsconfig.tsbuildinfo tsconfig.build.tsbuildinfo && npm run build
RUN test -f dist/main.js || (echo "Build failed: dist/main.js missing" && ls -la dist && exit 1)

# Stage 2: Production image
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

# Install dumb-init and postgres client
RUN apk add --no-cache dumb-init postgresql-client

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nodejs

# Copy built application and dependencies
COPY --from=builder --chown=nodejs:nodejs /app/dist ./dist
COPY --from=builder --chown=nodejs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nodejs:nodejs /app/package*.json ./
COPY --from=builder --chown=nodejs:nodejs /app/prisma ./prisma
COPY --from=builder --chown=nodejs:nodejs /app/prisma.config.ts ./
COPY --from=builder --chown=nodejs:nodejs /app/tsconfig.json ./
COPY --from=builder --chown=nodejs:nodejs /app/scripts ./scripts

RUN sed -i 's/\r$//' /app/scripts/*.sh && chmod +x /app/scripts/*.sh
RUN test -f dist/main.js

# Generate Prisma client in production
RUN npx prisma generate

USER nodejs

EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3001/api/v1/health', (r) => {if (r.statusCode !== 200) throw new Error('Not healthy')})"

ENTRYPOINT ["dumb-init", "--"]

CMD ["sh", "/app/scripts/docker-entrypoint.sh"]

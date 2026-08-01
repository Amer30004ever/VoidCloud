FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
COPY lib/ui-kit/package.json ./lib/ui-kit/
COPY frontend/package.json ./frontend/
COPY pnpm-workspace.yaml ./
COPY tsconfig.base.json ./tsconfig.base.json
COPY .npmrc .npmrc
RUN npm install -g pnpm@10.14.0 && pnpm install --no-frozen-lockfile

FROM node:20-alpine AS production-deps
WORKDIR /app
ENV CI=true
COPY package.json pnpm-lock.yaml ./
COPY --from=deps /app/pnpm-lock.yaml ./
COPY lib/ui-kit/package.json ./lib/ui-kit/
COPY frontend/package.json ./frontend/
COPY pnpm-workspace.yaml ./
COPY tsconfig.base.json ./tsconfig.base.json
COPY .npmrc .npmrc
RUN npm install -g pnpm && pnpm install --prod --no-frozen-lockfile

FROM node:20-alpine AS builder
WORKDIR /app
ENV CI=true
COPY package.json pnpm-lock.yaml ./
COPY lib/ui-kit/package.json ./lib/ui-kit/
COPY pnpm-workspace.yaml ./
COPY tsconfig.base.json ./tsconfig.base.json
COPY .npmrc .npmrc
COPY lib/ui-kit/src ./lib/ui-kit/src
COPY frontend/package.json ./frontend/
COPY frontend/next.config.ts ./frontend/
COPY frontend/next-env.d.ts ./frontend/
COPY frontend/tsconfig.json ./frontend/tsconfig.json
COPY tsconfig.json ./
RUN npm install -g pnpm && pnpm install --no-frozen-lockfile
COPY frontend/public ./frontend/public
COPY frontend/src ./frontend/src
ARG NEXT_PUBLIC_API_URL
ARG NEXT_TELEMETRY_DISABLED=1
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}
ENV NEXT_TELEMETRY_DISABLED=${NEXT_TELEMETRY_DISABLED}
RUN cd frontend && pnpm exec next build --webpack

FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production
ENV NODE_PATH=/app/frontend/node_modules
RUN apk add --no-cache pnpm
COPY --from=builder /app/frontend/.next/standalone/frontend/server.js ./server.js
COPY --from=builder /app/frontend/.next/standalone/frontend/package.json ./package.json
COPY --from=builder /app/frontend/.next/standalone/frontend/.next ./.next
COPY --from=builder /app/node_modules/ ./node_modules/
COPY --from=builder /app/frontend/node_modules/ ./frontend/node_modules/
COPY --from=builder /app/package.json ./
COPY --from=builder /app/pnpm-lock.yaml ./
RUN pnpm prune --prod 2>&1
COPY --from=builder /app/frontend/.next/static ./.next/static
COPY --from=builder /app/frontend/public ./public
EXPOSE 3000
ENV PORT 3000
ENV HOSTNAME "0.0.0.0"
CMD ["node", "server.js"]

FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
COPY lib/ui-kit/package.json ./lib/ui-kit/
RUN npm install -g pnpm@10.14.0 && pnpm install

FROM node:22-alpine AS production-deps
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
RUN npm install -g pnpm && pnpm prune --prod

FROM node:22-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY package.json ./
COPY lib/ui-kit/package.json ./lib/ui-kit/
COPY lib/ui-kit/src ./lib/ui-kit/src
COPY frontend/package.json ./frontend/
COPY frontend/next.config.ts ./frontend/
COPY frontend/next-env.d.ts ./frontend/
COPY frontend/public ./frontend/public
COPY frontend/src ./frontend/src
COPY tsconfig.json ./
ARG NEXT_PUBLIC_API_URL
ARG NEXT_TELEMETRY_DISABLED=1
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}
ENV NEXT_TELEMETRY_DISABLED=${NEXT_TELEMETRY_DISABLED}
RUN cd frontend && pnpm run build

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY --from=production-deps /app/node_modules ./node_modules
COPY --from=builder /app/frontend/.next/standalone/frontend/server.js ./server.js
COPY --from=builder /app/frontend/.next/standalone/frontend/package.json ./package.json
COPY --from=builder /app/frontend/.next/standalone/frontend/.next ./.next
COPY --from=builder /app/frontend/.next/static ./.next/static
COPY --from=builder /app/frontend/public ./public
EXPOSE 3000
ENV PORT 3000
ENV HOSTNAME "0.0.0.0"
CMD ["node", "server.js"]

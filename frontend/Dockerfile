FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
COPY lib/ui-kit/package.json ./lib/ui-kit/
COPY frontend/package.json ./frontend/
COPY pnpm-workspace.yaml ./
COPY tsconfig.base.json ./tsconfig.base.json
COPY .npmrc .npmrc
RUN npm install -g pnpm@10.14.0 && pnpm install --no-frozen-lockfile

FROM node:22-alpine AS production-deps
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

FROM node:22-alpine AS builder
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
COPY frontend/public ./frontend/public
COPY frontend/src ./frontend/src
COPY tsconfig.json ./
RUN npm install -g pnpm && pnpm install --no-frozen-lockfile
ARG NEXT_PUBLIC_API_URL
ARG NEXT_TELEMETRY_DISABLED=1
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}
ENV NEXT_TELEMETRY_DISABLED=${NEXT_TELEMETRY_DISABLED}
RUN cd frontend && pnpm exec next build --webpack

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/frontend/.next/standalone/node_modules/.pnpm ./node_modules/.pnpm
COPY --from=builder /app/frontend/.next/standalone/frontend/server.js ./server.js
COPY --from=builder /app/frontend/.next/standalone/frontend/package.json ./package.json
COPY --from=builder /app/frontend/.next/standalone/frontend/.next ./.next
COPY --from=builder /app/frontend/.next/static ./.next/static
COPY --from=builder /app/frontend/public ./public
RUN ln -s /app/node_modules/.pnpm/next@16.2.6_@babel+core@7.29.7_supports-color@8.1.1__@opentelemetry+api@1.9.1_react-dom_be377da3d2525d8a3e902fa375cd6b45/node_modules/next /app/node_modules/next
EXPOSE 3000
ENV PORT 3000
ENV HOSTNAME "0.0.0.0"
CMD ["node", "server.js"]

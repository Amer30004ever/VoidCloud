import os

services = {
    'agent': 3006,
    'analytics': 3012,
    'audit': 3011,
    'auth': 3001,
    'billing': 3005,
    'crm': 3006,
    'email': 3008,
    'monitoring': 3010,
    'notification': 3009,
    'sub2api': 1,
    'tenant': 3003,
    'user': 3002,
    'vps': 3004,
    'whatsapp': 3007,
}

dockerfile = """FROM node:20-alpine AS deps
WORKDIR /app
COPY services/combined-package.json ./package.json
RUN npm install --production

FROM deps AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/package.json ./package.json
COPY database/prisma ./prisma/
COPY services/{svc}/dist ./dist
RUN npx prisma generate --schema=./prisma/schema.prisma

FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/package.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/prisma ./prisma
COPY services/shared/dist ./services/shared/dist
COPY services/agent/dist ./services/agent/dist
COPY services/analytics/dist ./services/analytics/dist
COPY services/audit/dist ./services/audit/dist
COPY services/auth/dist ./services/auth/dist
COPY services/billing/dist ./services/billing/dist
COPY services/crm/dist ./services/crm/dist
COPY services/email/dist ./services/email/dist
COPY services/monitoring/dist ./services/monitoring/dist
COPY services/notification/dist ./services/notification/dist
COPY services/sub2api/dist ./services/sub2api/dist
COPY services/tenant/dist ./services/tenant/dist
COPY services/user/dist ./services/user/dist
COPY services/vps/dist ./services/vps/dist
COPY services/whatsapp/dist ./services/whatsapp/dist

COPY --from=builder /app/dist ./dist
EXPOSE {port}
CMD ["node", "dist/services/{svc}/src/main.js"]
"""

for svc, port in services.items():
    path = os.path.join('services', svc, 'Dockerfile')
    content = dockerfile.format(svc=svc, port=port)
    with open(path, 'w') as f:
        f.write(content)
    print('Wrote', path)

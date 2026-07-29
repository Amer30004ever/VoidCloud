# Database (Prisma)

Schema is defined in `schema.prisma`. Changes are applied via migrations in `migrations/`.

## Commands

```bash
# Apply pending migrations (production / Docker startup)
npm run db:migrate

# Seed default admin user
npm run db:seed

# Both
npm run db:setup

# Create a new migration after editing schema.prisma (development)
npx prisma migrate dev --name describe_change

# Regenerate client after schema change
npm run prisma:generate

# Open Prisma Studio (local)
npx prisma studio
```

## Seed

`seed.ts` upserts the admin user using:

| Env var | Default |
|---------|---------|
| `ADMIN_EMAIL` | `admin@amer.dev` |
| `ADMIN_PASSWORD` | `AmerDevOps2026!` |
| `ADMIN_NAME` | `Amer Admin` |

Passwords are hashed with bcrypt (cost 10) on each seed run. Existing admins get password updated on upsert — change `ADMIN_PASSWORD` in env before seed if you need a new default.

## Docker startup

`scripts/docker-entrypoint.sh` runs before the API:

1. Wait for Postgres (`POSTGRES_HOST`, default `postgres`)
2. `prisma migrate deploy`
3. `prisma db seed`
4. Start NestJS

## Fresh database

```bash
# Docker Compose
docker compose down -v
docker compose up -d --build backend

# Local Postgres
createdb voidcloud
export DATABASE_URL="postgresql://postgres:postgres@localhost:5432/voidcloud"
npm run db:setup
```

## Migrating from legacy `init-db.sh`

Older deployments used a shell script with raw SQL instead of Prisma migration history. If `migrate deploy` fails on duplicate objects, reset the volume once (see above) or baseline migrations manually with `prisma migrate resolve`.

## Migrations in repo

| Migration | Description |
|-----------|-------------|
| `20260529215358_add_documentation_and_learning_models` | Core models, docs, learning |
| `20260601120000_platform_integration_models` | User password flags, projects, API keys, secrets, clusters, audit |

Always commit new migration folders when changing `schema.prisma`.

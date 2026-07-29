# Void Cloud — Deployment & Rollback Guide

## Environments

| Environment | Namespace | Trigger | URL |
|-------------|-----------|---------|-----|
| Staging | `voidcloud-staging` | Auto on `main`, `master`, `develop` | https://staging.voidcloud.cc.cd |
| Production | `voidcloud` | Manual approval after staging passes | https://voidcloud.cc.cd |

## Image Tagging Strategy

Every successful production build pushes two tags:

- `latest` — always points to the newest production image
- `<TIMESTAMP>-<SHORT_SHA>` — immutable, e.g. `20260723-110915-a1b2c3d`

The last 10 timestamped tags are retained in Docker Hub. Use these for targeted rollbacks.

## Rollback Procedures

### Option A: Full rollback (all services)

Trigger the **`rollback-all`** job in GitLab CI (manual job on main/master).

This runs `kubectl rollout undo` for every deployment in the production namespace, reverting all services to their previous replica set.

### Option B: Service-specific rollback

Trigger the **`rollback-service`** job in GitLab CI (manual job on main/master).

Required variables:
- `SERVICE` — service name, e.g. `auth`, `vps`, `billing`
- `TARGET_TAG` — the timestamp-SHA tag to roll back to, e.g. `20260723-110915-a1b2c3d`

Example:
```bash
SERVICE=vps
TARGET_TAG=20260723-110915-a1b2c3d
```

The job sets the deployment image to `voidcloud/<SERVICE>-service:<TARGET_TAG>` and waits for the rollout to complete.

### Option C: Emergency local kubectl rollback

```bash
# Roll back a single service
kubectl -n voidcloud rollout undo deployment/vps-service

# Roll back all services
for d in $(kubectl -n voidcloud get deployments -o name); do
  kubectl -n voidcloud rollout undo $d
done
```

## Health Verification

After every production deploy, the pipeline:

1. Checks pod readiness for `auth-service`, `user-service`, `tenant-service`, `frontend`
2. Hits `/health` on `auth:3001`, `vps:3004`, `billing:3005`
3. If any check fails, it automatically triggers a rollback for the affected services and exits with failure

## Migration Safety

New Prisma migrations are scanned in CI for destructive operations:

- `DROP COLUMN`
- `DROP TABLE`
- `DROP INDEX`
- `TRUNCATE`

Destructive migrations **block the pipeline by default**. To allow an intentional destructive migration, include `ALLOW_DESTRUCTIVE_MIGRATION` in the merge request title or description.

Example:
```
feat: remove legacy column

ALLOW_DESTRUCTIVE_MIGRATION
```

## Manual Steps

1. Ensure Docker Hub credentials (`DOCKER_HUB_USERNAME`, `DOCKER_HUB_TOKEN`) are set in CI/CD variables.
2. Ensure K8s kubeconfig (`KUBECONFIG_B64`) is configured for the GitLab runner.
3. Ensure notification tokens (`TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`, `SLACK_WEBHOOK_URL`) are set if you want deploy alerts.
4. For staging deploys on non-main branches, trigger the pipeline manually via GitLab CI/CD > Run pipeline.

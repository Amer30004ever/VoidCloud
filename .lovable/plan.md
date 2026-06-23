# Developer Tools & Scalability Features

Large scope — splitting into 4 deliverables. Confirm before I build.

## 1. CI/CD Tab (VPS detail page)
- New `CICDPanel` component under `frontend/src/components/cloud/`
- UI sections:
  - **GitHub Actions**: Connect repo (OAuth via existing GitHub integration), toggle auto-deploy on push, toggle PR preview deploys
  - **GitLab CI**: Repo URL + token field, toggle auto-deploy on push
  - **Webhook URL**: Auto-generated per-VPS deploy webhook with copy button + 3 example snippets (curl, GitHub Actions YAML, GitLab CI YAML)
- Backend: `VpsCicdService` with endpoints `GET/PUT /cloud/vps/:id/cicd`, `POST /cloud/vps/:id/cicd/webhook/regenerate`, public `POST /api/public/deploy/:webhookToken`
- Schema additions: `VpsCicdConfig` model (vpsId, githubRepo, gitlabRepo, autoDeployBranch, prPreview, webhookToken, webhookSecret)

## 2. Managed Databases (new top-level service)
- New sidebar entry **Databases** → `frontend/src/app/amercloud/dashboard/databases/`
  - List page, create wizard, detail page (connection string, backups, scale, delete)
- Plans seeded:
  - PostgreSQL 1GB/10GB — $10/mo
  - MySQL 1GB/10GB — $10/mo
  - Redis 512MB — $5/mo
- Features per DB: daily automated backups (existing backup-v2 hook), PITR flag, vertical scale (plan change) + horizontal scale (read replicas flag), connection string + credentials revealed once
- Backend: `ManagedDatabase` Prisma model + `DatabasesService`/`DatabasesController`, Proxmox provisioning stubbed like VPS
- Pricing wired into existing billing pipeline

## 3. Staging Clone
- "Clone VPS" button on VPS detail header → modal
- Backend `POST /cloud/vps/:id/clone`:
  - Creates new VPS row with name `<orig>-staging`, same plan, new IP placeholder
  - Optional `syncData: boolean` — when true, queues snapshot+restore job (stub)
- Frontend toast → navigates to new VPS

## 4. Resource Scaling
- Extend existing `VpsResizeModal` (already does plan changes) with:
  - "Live resize (minimal downtime)" checkbox — passes `live: true` to resize service
  - Link to "Add another instance (cluster)" — opens create-VPS flow pre-filled with same plan + cluster tag
- New **Load Balancer** section in VPS detail:
  - Toggle enable, multi-select backend VPS instances, algorithm dropdown (round-robin/least-conn)
  - Backend: `LoadBalancer` Prisma model + CRUD endpoints
  - Pricing: $5/mo flat (stub)

## Pricing summary added to landing /pricing addons table
| Add-on | Price |
|--------|-------|
| PostgreSQL DB | $10/mo |
| MySQL DB | $10/mo |
| Redis Cache | $5/mo |
| Load Balancer | $5/mo |

## Files I'll create/edit
- `backend/prisma/schema.prisma` + new migration
- `backend/src/cloud/cicd/vps-cicd.service.ts` + controller
- `backend/src/cloud/databases/databases.service.ts` + controller + module wiring
- `backend/src/cloud/vps/vps-clone.service.ts`
- `backend/src/cloud/loadbalancer/load-balancer.service.ts` + controller
- `backend/src/cloud/cloud.module.ts` (register new providers)
- `frontend/src/components/cloud/CICDPanel.tsx`
- `frontend/src/components/cloud/LoadBalancerPanel.tsx`
- `frontend/src/components/cloud/CloneVpsModal.tsx`
- `frontend/src/components/cloud/VpsResizeModal.tsx` (add live toggle)
- `frontend/src/app/amercloud/dashboard/vps/[id]/page.tsx` (new tab + buttons)
- `frontend/src/app/amercloud/dashboard/databases/` (list, create, [id] pages)
- `frontend/src/components/layout/Sidebar.tsx` (Databases entry)
- `frontend/src/lib/cloud.ts` (new API helpers)
- `README.md` + `backend/README.md`

## Out of scope (stubbed, not real)
- Actual Proxmox DB provisioning, GitHub OAuth app reconnection flow, real load balancer (HAProxy/Nginx) config generation, real live-migration. All return success with placeholder data — same pattern as existing VPS provisioning stub.

Approve and I'll implement in one pass.

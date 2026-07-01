---
name: Admin layout split
description: Each role has a dedicated layout with its own sidebar, NOT reusing CloudDashboardLayout
---

Three role-specific layouts exist under `/amercloud/`:
- `admin/layout.tsx` — Super Admin (red/orange theme, 10 nav items)
- `business/layout.tsx` — Business Admin (blue/violet theme, 6 nav items)  
- `agent/layout.tsx` — Agent Portal (violet/fuchsia theme, 3 nav items)

**Why:** Prior to this change, admin/layout.tsx just wrapped CloudDashboardLayout which had a generic nav. Super Admin needs its own nav (Tenants, Audit Logs, Monitoring, etc.).

**How to apply:** When adding new Super Admin pages, add to `SA_NAV` array in `admin/layout.tsx`. For Business Admin pages, add to `BUSINESS_NAV` in `business/layout.tsx`. Guards in each layout check JWT role and redirect to /amercloud/login if unauthorized.

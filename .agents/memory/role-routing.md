---
name: Role-based routing
description: How login page routes each role to their respective dashboard after authentication
---

After successful login, role routing in `frontend/src/app/amercloud/login/page.tsx`:
- `SUPER_ADMIN` → `/amercloud/admin/dashboard`
- `ADMIN` → `/amercloud/business/dashboard`
- `AGENT` → `/amercloud/agent/dashboard`
- `USER` → `/amercloud/user/dashboard`

**Why:** Previous code only handled ADMIN and defaulted everyone else to user dashboard, breaking SUPER_ADMIN and AGENT flows.

**How to apply:** Any new role added to the backend enum must have a matching `else if` branch in the login page submit handler.

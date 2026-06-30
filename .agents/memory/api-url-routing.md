---
name: API URL routing
description: How the frontend connects to the api-server in Replit
---
# API URL routing

The frontend's `API_BASE_URL` must be a relative path `/api/v1`, not `http://localhost:3001/api/v1`.

**Why:** Replit's reverse proxy routes `/api` → api-server (port 8080). The original codebase
assumed a microservices gateway at localhost:3001 which doesn't exist in this environment.
The relative path works in both dev and production via the Replit proxy.

**How to apply:** If VITE_API_URL env var is not set and the hostname isn't voidcloud.cc.cd,
use `/api/v1`. This is in `artifacts/voidcloud/src/lib/constants.ts`.

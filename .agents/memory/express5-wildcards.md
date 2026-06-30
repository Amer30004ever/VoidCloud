---
name: Express 5 wildcard routes
description: Express 5 with path-to-regexp v8 rejects bare "*" wildcards
---
# Express 5 wildcard routes

Express 5 uses path-to-regexp v8 which **throws a PathError** if you use bare `"*"` as a route path.

**Why:** path-to-regexp v8 requires named parameters. The old `"*"` pattern is no longer supported.

**How to apply:** Replace `router.all("*", ...)` with:
- `router.all("/{*splat}", ...)` for matching all sub-paths
- `router.all("/", ...)` for matching root of the mount point

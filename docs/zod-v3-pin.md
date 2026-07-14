# Zod v3 pin — investigation & upgrade plan

**Date**: 2026-07-15
**Status**: Upgrade path exists. Pin removal recommended in a dedicated PR.

## Background

`frontend/package.json` and `lib/api-zod/package.json` pin `zod@^3.x`. The
original justification was that `@hookform/resolvers` — used by the frontend
form layer — required Zod v3's schema shape.

## Finding

`@hookform/resolvers@^5.4.0` (current `latest`, released well before this
audit) supports **both Zod v3 and Zod v4 simultaneously**. From the published
source of `@hookform/resolvers/zod`:

```ts
import * as z3 from 'zod/v3';
import * as z4 from 'zod/v4/core';

const isZod3Schema = (schema): schema is z3.ZodSchema => ...
const isZod4Schema = (schema): schema is z4.$ZodType => ...
```

The resolver dispatches on the schema shape at runtime, so callers can pass
a Zod v3 OR v4 schema and the resolver handles it. There is no version
conflict blocking the upgrade.

## Upgrade recipe

1. `bun add zod@^4 -w` from repo root (updates the workspace root, plus every
   workspace package via the `overrides` block).
2. Bump `lib/api-zod/package.json` and `frontend/package.json` from `^3.x` to
   `^4`.
3. Regenerate `lib/api-zod/src/generated/**` from the OpenAPI spec — Zod v4
   changed a handful of API shapes:
   - `z.string().datetime()` → `z.iso.datetime()`
   - `z.record(V)` → `z.record(z.string(), V)`
   - Custom error messages: `{ message: '...' }` → `{ error: '...' }`
   The orval generator (see `lib/api-spec/orval.config.ts`) needs `zod`
   plugin bumped to a v4-aware version.
4. Run `bun run typecheck` — Zod v4 tightens some inferred types. Expect
   a handful of narrow fixes in form components that destructured Zod's
   internal `_def` shape (unusual).
5. Run the frontend test suite.

## Why not done in-place in this PR

Regenerating `lib/api-zod/src/generated/**` risks large-scale diffs across
consumers that need reviewed separately from the security-focused backlog
this branch is working through. Landing it as its own PR keeps the review
focused and the rollback path clean.

## Acceptance handoff

When the follow-up PR lands:

- Remove the `zod ^3` pin from `frontend/package.json` and `lib/api-zod/package.json`.
- Delete this file OR replace it with a "resolved" note.
- Confirm `bun run typecheck` and the frontend tests pass on Zod v4.

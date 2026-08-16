# `lib/*` peer-dependency audit rule

Date: 2026-08-16

## Rule

**Whenever a package is added to `lib/*`, or a new peer dependency is added to an
existing one, audit it: any dependency the package's own source imports directly
(runtime *or* types) must also be declared as a `devDependency`, even when it is
correctly a `peerDependency`.**

Under pnpm's strict node_modules layout a peer dependency is not hoisted into the
package's own `node_modules`, so the package's own `tsc` build cannot resolve it.
It only works by accident when a sibling install happens to place it in range.

## Why

This has already caused two build failures from the same root cause:

1. `lib/ui-kit` — `WidgetBoundary` (a class component) could not resolve
   `React.Component`'s props, so every JSX attribute on it errored. `react` /
   `react-dom` were peer-only, with no `@types/react`.
2. `lib/api-client-react` — same structural gap, caught proactively before it
   broke a build: `@tanstack/react-query`'s types pull in React's types
   transitively while `react` was peer-only with no `@types/react`.

Both were fixed by keeping the `peerDependencies` entry and adding the package
plus its `@types/*` to `devDependencies`.

## Current state (audited 2026-08-16)

| Package | Direct imports | Status |
|---|---|---|
| `ui-kit` | react, react-dom, clsx, cva, tailwind-merge, lucide-react, @base-ui/react | fixed — react/react-dom + types in devDeps |
| `api-client-react` | @tanstack/react-query, react (types) | fixed — react + @types/react in devDeps |
| `db` | drizzle-orm, drizzle-zod, pg, `zod/v4` | clean — see below |
| `api-zod` | zod | clean — declared as a dependency |
| `api-spec` | none (orval config only) | n/a |

### `db`'s `zod/v4` subpath, verified not assumed

`docs/zod-v3-pin.md` records the workspace pin to zod v3 (for
`@hookform/resolvers`). `lib/db/src/schema/*.ts` imports from `zod/v4`, which is
a real forward-compat subpath shipped by `zod@3.25.76` (`./v4`, `./v4/core`,
`./v4-mini`, … are all in its `exports` map), so it resolves *and* typechecks
against the v3 pin.

Confirmed by build, not by inspection:

- `lib/db` **is** inside `typecheck:libs`' scope — the root `tsconfig.json`
  references `./lib/db`, `./lib/api-client-react` and `./lib/api-zod`.
- Because `tsc --build` skips up-to-date projects, it was re-run from scratch:
  `rm -rf lib/db/dist lib/db/tsconfig.tsbuildinfo && tsc --build lib/db/tsconfig.json --force`
  → exit 0, no diagnostics.

Scope gap, now closed: `lib/ui-kit` was **not** a reference in the root
`tsconfig.json`, so `typecheck:libs` never covered it — which is why its
peer-only React gap could only surface as a failed production build. It is now
listed as a project reference (with `jsx: react-jsx` and `types: ["react"]` in
its own tsconfig), so every future dependency change there is gated by the same
check. Any new `lib/*` package must be added to the root references too.


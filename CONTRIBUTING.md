# Contributing to Void Cloud

## Rule #1 — pnpm only, everywhere

**This workspace uses pnpm exclusively. Never run `npm install` or `npm ci` in
this repository — not at the root, and not inside any subfolder
(`frontend/`, `services/*`, `lib/*`, `database/`, `tests/`, `scripts/`).**

```bash
# correct
pnpm install                        # from the repo root
pnpm --filter frontend add zod      # add a dep to one package
pnpm --filter frontend dev

# NEVER
npm install
npm ci
cd frontend && npm install
```

### Why this matters

The repo is a pnpm workspace (`pnpm-workspace.yaml`). Running npm anywhere:

- rewrites `node_modules` into a flat npm layout,
- destroys the `@workspace/*` symlinks between `lib/*`, `services/*` and `frontend/`,
- breaks resolution of the Next.js CLI (`Cannot find module '.../next/dist/bin/next'`),
- and produces a stray `package-lock.json` that makes the next install worse.

If a tool, IDE, CI job, or agent session defaults to npm, **that is the root
cause** of the recurring install/build breakage in this repo. It is not caused
by any single config file, and no config change can fully prevent it — the only
fix is to use pnpm.

### Recovering from an accidental npm run

```bash
rm -f package-lock.json frontend/package-lock.json
rm -rf node_modules frontend/node_modules
pnpm install                # root postinstall relinks frontend/node_modules/next
pnpm verify:next            # confirms the Next CLI resolves
```

### Other install rules

- Only `pnpm-lock.yaml` is committed. `package-lock.json` and `yarn.lock` are not.
- Add dependencies with `pnpm --filter <package> add <dep>`; do not hand-edit a
  `package.json` and rely on hoisting.
- Shared code under `lib/*` must declare its own runtime dependencies — it is
  imported from outside `frontend/`, so it cannot rely on `frontend/node_modules`.

## Repository layout & code rules

See [`AGENTS.md`](AGENTS.md) for service layout, ports, locked files, and the
microservice-only architecture rules.

## Tests

```bash
bash scripts/run-all-tests.sh       # full cross-platform suite
pnpm --filter tests test            # jest only
```

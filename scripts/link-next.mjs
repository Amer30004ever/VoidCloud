#!/usr/bin/env node
/**
 * postinstall: guarantee `frontend/node_modules/next` resolves.
 *
 * Why this exists
 * ---------------
 * The repo carries BOTH an npm `workspaces` field and a pnpm workspace. The two
 * installers disagree about layout:
 *   - `npm install` hoists `next` to the repo root and deletes the nested copy.
 *   - `pnpm install` rewrites `frontend/node_modules` from the store and drops
 *     any symlink a previous npm run left behind.
 *
 * Either way `frontend/node_modules/next` can vanish, and when it does, Next's
 * workspace-root inference fails ("We couldn't find the Next.js package") and
 * the dev supervisor — which looks for that exact path — refuses to start.
 * This has been re-broken and hand-fixed repeatedly; running it as postinstall
 * makes the repair automatic on every install.
 *
 * What it does
 * ------------
 * Resolves the real Next install (see resolve-next.mjs) and symlinks
 * `frontend/node_modules/next` at it when the path is missing or stale. Never
 * touches a directory that is already a real, correct install.
 *
 * Exit code is always 0 in normal operation: a missing Next package before the
 * first install must not fail `npm install` itself. Pass --check to make it
 * strict (used by CI to assert the relink actually worked).
 */
import { existsSync, lstatSync, mkdirSync, rmSync, symlinkSync, realpathSync } from "node:fs";
import path from "node:path";
import {
  FRONTEND_DIR,
  REPO_ROOT,
  resolveNext,
  frontendLinkIsValid,
} from "./resolve-next.mjs";

const STRICT = process.argv.includes("--check");
const tag = "[link-next]";

function log(msg) {
  console.log(`${tag} ${msg}`);
}

function fail(msg) {
  console.error(`${tag} ${msg}`);
  process.exit(STRICT ? 1 : 0);
}

const linkPath = path.join(FRONTEND_DIR, "node_modules", "next");

if (frontendLinkIsValid()) {
  log(`ok — ${path.relative(REPO_ROOT, linkPath)} already resolves`);
  process.exit(0);
}

const found = resolveNext();
if (!found) {
  fail(
    "next is not installed anywhere yet (frontend/node_modules, root node_modules, pnpm store). " +
      "This is expected before the first install; re-run after dependencies are installed.",
  );
}

if (STRICT && !found) process.exit(1);

// Remove whatever is sitting at the path: a dangling symlink, a symlink to a
// removed store entry, or an empty/partial directory left by a failed install.
if (existsSync(linkPath) || isSymlink(linkPath)) {
  try {
    rmSync(linkPath, { recursive: true, force: true });
  } catch (e) {
    fail(`could not clear stale ${linkPath}: ${e.message}`);
  }
}

function isSymlink(p) {
  try {
    return lstatSync(p).isSymbolicLink();
  } catch {
    return false;
  }
}

try {
  mkdirSync(path.dirname(linkPath), { recursive: true });
  symlinkSync(realpathSync(found.dir), linkPath, "junction");
} catch (e) {
  fail(`could not link next into frontend/node_modules: ${e.message}`);
}

if (!frontendLinkIsValid()) {
  fail("relink completed but the path still does not resolve");
}

log(
  `relinked ${path.relative(REPO_ROOT, linkPath)} -> ${path.relative(REPO_ROOT, found.dir)} ` +
    `(source: ${found.source})`,
);

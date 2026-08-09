#!/usr/bin/env node
/**
 * Guarantee the Next.js CLI is installed before a build.
 *
 * Root `package.json` intentionally has no `workspaces` field (npm/pnpm
 * collision — see scripts/link-next.mjs), so a root-level `bun install` /
 * `npm install` does NOT install `frontend`'s dependencies. On a clean
 * checkout that makes `next` missing and the build fails with
 * "[next-bin] Could not locate the Next.js CLI".
 *
 * This script detects that case and installs the frontend package itself,
 * then relinks. It is a no-op when Next is already resolvable.
 */
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import { FRONTEND_DIR, REPO_ROOT, resolveNext } from "./resolve-next.mjs";

const tag = "[ensure-next]";

if (resolveNext()) {
  console.log(`${tag} ok — Next.js CLI is present`);
  process.exit(0);
}

console.log(`${tag} Next.js is not installed — installing frontend dependencies`);

const candidates = [];
if (existsSync(path.join(REPO_ROOT, "bun.lockb")) || existsSync(path.join(REPO_ROOT, "bun.lock"))) {
  candidates.push(["bun", ["install"]]);
}
candidates.push(["bun", ["install"]], ["npm", ["install", "--no-audit", "--no-fund"]]);

let installed = false;
for (const [cmd, args] of candidates) {
  const res = spawnSync(cmd, args, { cwd: FRONTEND_DIR, stdio: "inherit", shell: process.platform === "win32" });
  if (res.status === 0) {
    installed = true;
    break;
  }
  console.warn(`${tag} \`${cmd} ${args.join(" ")}\` failed in frontend — trying the next installer`);
}

if (!installed) {
  console.error(`${tag} could not install frontend dependencies`);
  process.exit(1);
}

// Make sure frontend/node_modules/next resolves for Next's workspace inference.
spawnSync(process.execPath, [path.join(REPO_ROOT, "scripts", "link-next.mjs")], { stdio: "inherit" });

if (!resolveNext()) {
  console.error(`${tag} install completed but the Next.js CLI is still not resolvable`);
  process.exit(1);
}

console.log(`${tag} Next.js CLI is now available`);

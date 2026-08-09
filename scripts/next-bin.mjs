#!/usr/bin/env node
/**
 * Thin wrapper that runs the Next.js CLI from wherever it actually lives.
 *
 * Path resolution is delegated to scripts/resolve-next.mjs so that this file,
 * scripts/link-next.mjs and scripts/assemble-dist.mjs can never drift apart or
 * hardcode `frontend/node_modules/next/dist/bin/next`.
 *
 * If the link is missing (e.g. a bare `pnpm install` just rewrote
 * frontend/node_modules and postinstall did not run), repair it in-process
 * before invoking the CLI — Next's own workspace-root inference needs
 * `next/package.json` to be resolvable from the frontend directory.
 */
import { spawnSync } from "node:child_process";
import { FRONTEND_DIR, resolveNextBin, frontendLinkIsValid } from "./resolve-next.mjs";

let found;
try {
  found = resolveNextBin();
} catch (e) {
  console.error(`[next-bin] ${e.message}`);
  process.exit(1);
}

if (!frontendLinkIsValid()) {
  console.log("[next-bin] frontend/node_modules/next is missing or stale — repairing");
  const relink = spawnSync(process.execPath, [new URL("./link-next.mjs", import.meta.url).pathname], {
    stdio: "inherit",
  });
  if (relink.status !== 0) {
    console.warn("[next-bin] relink did not succeed; continuing with the resolved CLI path");
  }
}

console.log(`[next-bin] using ${found.binPath} (${found.source})`);

const result = spawnSync(process.execPath, [found.binPath, ...process.argv.slice(2)], {
  stdio: "inherit",
  cwd: FRONTEND_DIR,
});

if (result.error) {
  console.error(`[next-bin] failed to run the Next.js CLI: ${result.error.message}`);
  process.exit(1);
}
process.exit(result.status ?? 1);

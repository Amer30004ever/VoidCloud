#!/usr/bin/env node
/**
 * Package-manager guard (tooling-level, not documentation).
 *
 * This repo is a pnpm workspace. Running `npm install` (or yarn) anywhere in it
 * flattens/overwrites the pnpm symlink farm — most visibly `frontend/node_modules/next`
 * and the `@workspace/*` workspace links — which breaks the dev server and the build.
 *
 * Any automated harness step that shells out to `npm install` regardless of the repo's
 * package manager hits this guard. Instead of letting npm corrupt the tree, we:
 *   1. run the correct `pnpm install` at the workspace root, then
 *   2. exit non-zero so npm aborts before it can touch node_modules.
 *
 * Result: dependencies end up installed correctly even when the caller used npm.
 *
 * Bypass (only for tooling that genuinely needs npm): ALLOW_NPM=1
 */
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const ua = process.env['npm_config_user_agent'] ?? '';
const execpath = process.env['npm_execpath'] ?? '';
const usingPnpm = ua.startsWith('pnpm') || /pnpm/.test(execpath);
const usingNpmOrYarn = !usingPnpm && (ua.startsWith('npm') || ua.startsWith('yarn') || /npm-cli\.js|yarn/.test(execpath));

if (process.env['ALLOW_NPM'] === '1' || !usingNpmOrYarn) {
  process.exit(0);
}

const pm = ua.split('/')[0] || 'npm';
console.error(
  `\n[enforce-pnpm] Detected "${pm} install" in a pnpm workspace.\n` +
    `[enforce-pnpm] npm/yarn destroy the pnpm links (next, @workspace/*), so this install is being redirected.\n` +
    `[enforce-pnpm] Running "pnpm install" at ${ROOT} instead...\n`,
);

const res = spawnSync('pnpm', ['install'], { cwd: ROOT, stdio: 'inherit', env: process.env });

if (res.error || res.status !== 0) {
  console.error(`[enforce-pnpm] pnpm install failed (${res.error?.message ?? `exit ${res.status}`}). Run "pnpm install" manually.`);
  process.exit(1);
}

console.error(
  `\n[enforce-pnpm] Dependencies are installed via pnpm and the workspace is healthy.\n` +
    `[enforce-pnpm] Aborting the ${pm} install on purpose so it cannot overwrite node_modules.\n` +
    `[enforce-pnpm] Configure the install step to use "pnpm install" to avoid this message.\n`,
);
process.exit(1);

#!/usr/bin/env node
/**
 * Single source of truth for "where is Next.js installed?".
 *
 * The repo is a pnpm workspace that also carries an npm `workspaces` field, so
 * depending on which installer ran last, `next` can live in any of:
 *
 *   frontend/node_modules/next                      (nested / npm legacy)
 *   node_modules/next                               (hoisted to the root)
 *   node_modules/.pnpm/next@<ver>_<hash>/node_modules/next   (pnpm store)
 *   frontend/node_modules/next -> ../../node_modules/next    (symlink)
 *
 * Nothing may hardcode `frontend/node_modules/next/dist/bin/next`: a plain
 * `pnpm install` rewrites `frontend/node_modules` and that path disappears,
 * which is what repeatedly broke `next build` and the dev supervisor.
 *
 * Every consumer (next-bin.mjs, link-next.mjs, assemble-dist.mjs) imports from
 * here instead.
 */
import { createRequire } from "node:module";
import { existsSync, readdirSync, realpathSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const REPO_ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
export const FRONTEND_DIR = path.join(REPO_ROOT, "frontend");

function isDir(p) {
  try {
    return statSync(p).isDirectory();
  } catch {
    return false;
  }
}

/** A directory is a usable Next install only if it carries the CLI entrypoint. */
function isUsableNextDir(dir) {
  return Boolean(dir) && existsSync(path.join(dir, "dist", "bin", "next"));
}

/** Scan node_modules/.pnpm for an extracted next@<version> package. */
function scanPnpmStore(nodeModulesDir) {
  const store = path.join(nodeModulesDir, ".pnpm");
  if (!isDir(store)) return undefined;
  const matches = readdirSync(store)
    .filter((entry) => entry.startsWith("next@"))
    .sort()
    .reverse(); // highest version first
  for (const entry of matches) {
    const candidate = path.join(store, entry, "node_modules", "next");
    if (isUsableNextDir(candidate)) return candidate;
  }
  return undefined;
}

/**
 * Resolve the directory of the `next` package.
 * Strategy order: nested -> hoisted -> Node resolution -> pnpm store scan.
 *
 * @returns {{ dir: string, binPath: string, source: string } | undefined}
 */
export function resolveNext() {
  const direct = [
    { dir: path.join(FRONTEND_DIR, "node_modules", "next"), source: "frontend/node_modules" },
    { dir: path.join(REPO_ROOT, "node_modules", "next"), source: "root node_modules (hoisted)" },
  ];
  for (const candidate of direct) {
    if (isUsableNextDir(candidate.dir)) {
      return { ...candidate, binPath: path.join(candidate.dir, "dist", "bin", "next") };
    }
  }

  // Node's own resolution honours symlinks and nested node_modules chains.
  for (const from of [
    path.join(FRONTEND_DIR, "package.json"),
    path.join(REPO_ROOT, "package.json"),
  ]) {
    try {
      const require = createRequire(from);
      const dir = path.dirname(require.resolve("next/package.json"));
      if (isUsableNextDir(dir)) {
        return {
          dir,
          binPath: path.join(dir, "dist", "bin", "next"),
          source: `node resolution from ${path.relative(REPO_ROOT, from)}`,
        };
      }
    } catch {
      /* try the next strategy */
    }
  }

  // Last resort: pnpm's content-addressed store, which is where the real
  // package lives when the workspace links have been clobbered.
  for (const nm of [
    path.join(FRONTEND_DIR, "node_modules"),
    path.join(REPO_ROOT, "node_modules"),
  ]) {
    const dir = scanPnpmStore(nm);
    if (dir) {
      return {
        dir,
        binPath: path.join(dir, "dist", "bin", "next"),
        source: "pnpm store (.pnpm)",
      };
    }
  }

  return undefined;
}

/** Resolve just the CLI path, or throw a message that says how to fix it. */
export function resolveNextBin() {
  const found = resolveNext();
  if (!found) {
    throw new Error(
      "Could not locate the Next.js CLI in any known location " +
        "(frontend/node_modules, root node_modules, node resolution, pnpm store). " +
        "Run `pnpm install` at the repo root, which also runs `node scripts/link-next.mjs`.",
    );
  }
  return found;
}

/** True when frontend/node_modules/next already points at the resolved install. */
export function frontendLinkIsValid() {
  const link = path.join(FRONTEND_DIR, "node_modules", "next");
  if (!isUsableNextDir(link)) return false;
  const found = resolveNext();
  if (!found) return false;
  try {
    return realpathSync(link) === realpathSync(found.dir);
  } catch {
    return false;
  }
}

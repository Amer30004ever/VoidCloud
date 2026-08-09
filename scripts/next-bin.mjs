#!/usr/bin/env node
// Resolves the Next.js CLI wherever it is installed (frontend/node_modules or
// hoisted to the workspace root) and runs it with the given arguments.
import { createRequire } from "node:module";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const candidates = [
  path.join(root, "frontend", "node_modules", "next", "dist", "bin", "next"),
  path.join(root, "node_modules", "next", "dist", "bin", "next"),
];

let bin = candidates.find((p) => existsSync(p));

if (!bin) {
  for (const from of [path.join(root, "frontend", "package.json"), path.join(root, "package.json")]) {
    try {
      const require = createRequire(from);
      bin = path.join(path.dirname(require.resolve("next/package.json")), "dist", "bin", "next");
      if (existsSync(bin)) break;
      bin = undefined;
    } catch {
      /* keep looking */
    }
  }
}

if (!bin) {
  console.error("[next-bin] Could not locate the Next.js CLI. Run an install first.");
  process.exit(1);
}

const result = spawnSync(process.execPath, [bin, ...process.argv.slice(2)], {
  stdio: "inherit",
  cwd: path.join(root, "frontend"),
});
process.exit(result.status ?? 1);

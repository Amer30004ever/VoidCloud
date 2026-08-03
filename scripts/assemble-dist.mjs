#!/usr/bin/env node
// Assembles the Next.js standalone build into a top-level `dist/` directory
// so platform build verification (dist-check) finds the expected output.
import { cp, mkdir, rm, access, readdir, lstat, realpath } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const nextDir = path.join(root, "frontend", ".next");
const dist = path.join(root, "dist");

// Build output must not contain symlinks (directory symlinks are rejected by
// the dist uploader). Walk the tree and replace any symlink with its target.
async function dereferenceSymlinks(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    const stat = await lstat(full);
    if (stat.isSymbolicLink()) {
      let target;
      try {
        target = await realpath(full);
      } catch {
        await rm(full, { force: true });
        continue;
      }
      await rm(full, { recursive: true, force: true });
      await cp(target, full, { recursive: true, dereference: true, force: true });
    } else if (entry.isDirectory()) {
      await dereferenceSymlinks(full);
    }
  }
}


async function findStandaloneAppDir() {
  const base = path.join(nextDir, "standalone");
  if (!existsSync(base)) return null;
  // server.js can be nested (monorepo layouts): standalone/<...>/frontend/server.js
  const { readdir } = await import("node:fs/promises");
  const queue = [base];
  while (queue.length) {
    const dir = queue.shift();
    const entries = await readdir(dir, { withFileTypes: true });
    if (entries.some((e) => e.isFile() && e.name === "server.js")) return dir;
    for (const e of entries) {
      if (e.isDirectory() && e.name !== "node_modules") queue.push(path.join(dir, e.name));
    }
  }
  return null;
}

async function main() {
  if (!existsSync(nextDir)) {
    console.error("[assemble-dist] frontend/.next not found — run the build first.");
    process.exit(1);
  }

  await rm(dist, { recursive: true, force: true });
  await mkdir(dist, { recursive: true });

  // Symlinks (especially directory symlinks like node_modules) are not
  // supported in the uploaded build output — always resolve them to real files.
  const copy = (src, dest) => cp(src, dest, { recursive: true, dereference: true, force: true });

  const appDir = await findStandaloneAppDir();
  if (appDir) {
    await copy(appDir, dist);
    // hoisted node_modules from the standalone root
    const hoisted = path.join(nextDir, "standalone", "node_modules");
    const distModules = path.join(dist, "node_modules");
    if (existsSync(hoisted) && !existsSync(distModules)) {
      await copy(hoisted, distModules);
    }
  } else {
    // Non-standalone build: ship the compiled output as-is.
    await copy(nextDir, path.join(dist, ".next"));
  }

  const staticDir = path.join(nextDir, "static");
  if (existsSync(staticDir)) {
    await copy(staticDir, path.join(dist, ".next", "static"));
  }

  const publicDir = path.join(root, "frontend", "public");
  if (existsSync(publicDir)) {
    await copy(publicDir, path.join(dist, "public"));
  }

  await dereferenceSymlinks(dist);

  await access(dist);
  console.log("[assemble-dist] dist/ ready at", dist);
}

main().catch((err) => {
  console.error("[assemble-dist] failed:", err);
  process.exit(1);
});

#!/usr/bin/env node
// Assembles the Next.js standalone build into a top-level `dist/` directory
// so platform build verification (dist-check) finds the expected output.
import { cp, mkdir, rm, access } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const nextDir = path.join(root, "frontend", ".next");
const dist = path.join(root, "dist");

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

  const appDir = await findStandaloneAppDir();
  if (appDir) {
    await cp(appDir, dist, { recursive: true });
    // hoisted node_modules from the standalone root
    const hoisted = path.join(nextDir, "standalone", "node_modules");
    const distModules = path.join(dist, "node_modules");
    if (existsSync(hoisted) && !existsSync(distModules)) {
      await cp(hoisted, distModules, { recursive: true });
    }
  } else {
    // Non-standalone build: ship the compiled output as-is.
    await cp(nextDir, path.join(dist, ".next"), { recursive: true });
  }

  const staticDir = path.join(nextDir, "static");
  if (existsSync(staticDir)) {
    await cp(staticDir, path.join(dist, ".next", "static"), { recursive: true });
  }

  const publicDir = path.join(root, "frontend", "public");
  if (existsSync(publicDir)) {
    await cp(publicDir, path.join(dist, "public"), { recursive: true });
  }

  await access(dist);
  console.log("[assemble-dist] dist/ ready at", dist);
}

main().catch((err) => {
  console.error("[assemble-dist] failed:", err);
  process.exit(1);
});

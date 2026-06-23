import { cp, mkdir, rm, stat, symlink, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const frontendDir = resolve(scriptDir, "..");
const parentDir = resolve(frontendDir, "..");
const isMonorepoCheckout =
  existsSync(join(parentDir, "frontend")) && existsSync(join(parentDir, "package.json"));
const repoRoot = isMonorepoCheckout ? parentDir : frontendDir;

const nextDir = join(frontendDir, ".next");
const standaloneDir = join(nextDir, "standalone");
const staticDir = join(nextDir, "static");
const publicDir = join(frontendDir, "public");
const outputDir = join(repoRoot, "dist");
const frontendDistDir = join(frontendDir, "dist");

async function ensureDirectory(path, label) {
  const info = await stat(path).catch(() => null);

  if (!info?.isDirectory()) {
    throw new Error(`${label} is missing at ${path}. Run next build before preparing dist.`);
  }
}

async function copyIfDirectory(source, destination) {
  const info = await stat(source).catch(() => null);

  if (info?.isDirectory()) {
    await cp(source, destination, { recursive: true });
  }
}

async function createFrontendDistAlias() {
  if (frontendDistDir === outputDir) {
    return;
  }

  await rm(frontendDistDir, { recursive: true, force: true });

  try {
    await symlink(relative(frontendDir, outputDir), frontendDistDir, "dir");
  } catch {
    await mkdir(frontendDistDir, { recursive: true });
    await writeFile(
      join(frontendDistDir, "README.txt"),
      `Build output is prepared in ${relative(frontendDir, outputDir)}.\n`,
    );
  }
}

await ensureDirectory(standaloneDir, "Next standalone output");
await ensureDirectory(staticDir, "Next static output");

await rm(outputDir, { recursive: true, force: true });
await mkdir(outputDir, { recursive: true });
await cp(standaloneDir, outputDir, { recursive: true });
await copyIfDirectory(staticDir, join(outputDir, ".next", "static"));
await copyIfDirectory(publicDir, join(outputDir, "public"));
await writeFile(
  join(outputDir, "BUILD_OUTPUT.txt"),
  "AmerCloud Next.js standalone build artifact for Lovable dist checks.\nRun with: node server.js\n",
);
await createFrontendDistAlias();

console.log(`Prepared Lovable dist artifact at ${outputDir}`);
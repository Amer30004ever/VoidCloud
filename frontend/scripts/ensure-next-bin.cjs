const fs = require("fs");
const path = require("path");

const frontendRoot = path.resolve(__dirname, "..");
const workspaceRoot = path.resolve(frontendRoot, "..");
const rootNextDirectory = path.join(workspaceRoot, "node_modules", "next");
const frontendNextDirectory = path.join(frontendRoot, "node_modules", "next");
const frontendBinDirectory = path.join(frontendRoot, "node_modules", ".bin");
const frontendNextBin = path.join(frontendNextDirectory, "dist", "bin", "next");
const frontendBinShim = path.join(frontendBinDirectory, "next");
const rootNextBin = path.join(rootNextDirectory, "dist", "bin", "next");

function linkDirectory(source, destination) {
  if (!fs.existsSync(source)) {
    return false;
  }

  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.rmSync(destination, { force: true, recursive: true });
  fs.symlinkSync(source, destination, "junction");
  return true;
}

function writeBinShim() {
  fs.mkdirSync(frontendBinDirectory, { recursive: true });
  fs.writeFileSync(
    frontendBinShim,
    "#!/usr/bin/env node\nrequire('../next/dist/bin/next')\n",
    { mode: 0o755 },
  );
}

function writeNextWrapper() {
  if (!fs.existsSync(rootNextBin)) {
    return false;
  }

  const wrapperDirectory = path.dirname(frontendNextBin);
  const rootNextBinRequirePath = path.relative(wrapperDirectory, rootNextBin);

  fs.rmSync(frontendNextDirectory, { force: true, recursive: true });
  fs.mkdirSync(wrapperDirectory, { recursive: true });
  fs.writeFileSync(
    frontendNextBin,
    `#!/usr/bin/env node
const path = require("path");
const args = process.argv.slice(2);
const isDev = args[0] === "dev";
const hasPort = args.includes("-p") || args.includes("--port") || args.some((arg) => arg.startsWith("--port="));

if (isDev && !hasPort && !process.env.PORT) {
  process.env.PORT = "8080";
}

require(path.resolve(__dirname, ${JSON.stringify(rootNextBinRequirePath)}));
`,
    { mode: 0o755 },
  );
  return true;
}

if (!writeNextWrapper() && !fs.existsSync(frontendNextBin)) {
  const linked = linkDirectory(rootNextDirectory, frontendNextDirectory);

  if (!linked && !fs.existsSync(frontendNextBin)) {
    console.warn(
      "Next.js is not installed at frontend/node_modules/next or node_modules/next yet.",
    );
    process.exit(0);
  }
}

writeBinShim();
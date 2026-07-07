const fs = require("fs");
const path = require("path");

const frontendRoot = path.resolve(__dirname, "..");
const workspaceRoot = path.resolve(frontendRoot, "..");
const rootNextDirectory = path.join(workspaceRoot, "node_modules", "next");
const frontendNextDirectory = path.join(frontendRoot, "node_modules", "next");
const frontendBinDirectory = path.join(frontendRoot, "node_modules", ".bin");
const frontendNextBin = path.join(frontendNextDirectory, "dist", "bin", "next");
const frontendBinShim = path.join(frontendBinDirectory, "next");

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

if (!fs.existsSync(frontendNextBin)) {
  const linked = linkDirectory(rootNextDirectory, frontendNextDirectory);

  if (!linked && !fs.existsSync(frontendNextBin)) {
    console.warn(
      "Next.js is not installed at frontend/node_modules/next or node_modules/next yet.",
    );
    process.exit(0);
  }
}

writeBinShim();
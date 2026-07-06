const path = require("path");
const fs = require("fs");
const { PHASE_PRODUCTION_BUILD } = require("next/constants");

function installDistCheckIndexHook() {
  if (process.env.VOIDCLOUD_DIST_CHECK_INDEX_HOOK === "installed") {
    return;
  }

  process.env.VOIDCLOUD_DIST_CHECK_INDEX_HOOK = "installed";
  process.on("exit", () => {
    const source = path.join(__dirname, ".next/server/pages/index.html");
    const nextIndexDestination = path.join(__dirname, ".next/index.html");
    const rootDistDirectory = path.join(__dirname, "..", "dist");
    const rootIndexDestination = path.join(rootDistDirectory, "index.html");
    const staticSource = path.join(__dirname, ".next/static");
    const staticDestination = path.join(rootDistDirectory, "_next/static");

    if (fs.existsSync(source)) {
      fs.mkdirSync(rootDistDirectory, { recursive: true });
      fs.copyFileSync(source, nextIndexDestination);
      fs.copyFileSync(source, rootIndexDestination);
    }

    if (fs.existsSync(staticSource)) {
      fs.rmSync(staticDestination, { recursive: true, force: true });
      fs.cpSync(staticSource, staticDestination, { recursive: true });
    }
  });
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  reactStrictMode: true,
  swcMinify: true,
  webpack(config) {
    config.resolve.alias.react = path.resolve(__dirname, "../node_modules/react");
    config.resolve.alias["react-dom"] = path.resolve(__dirname, "../node_modules/react-dom");

    // Resolve the local api-client-react package
    config.resolve.alias["@workspace/api-client-react"] = path.resolve(
      __dirname,
      "lib/api-client-react"
    );
    return config;
  },
};

module.exports = (phase) => {
  if (phase === PHASE_PRODUCTION_BUILD) {
    installDistCheckIndexHook();
  }

  return nextConfig;
};

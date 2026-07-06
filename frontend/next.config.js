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
    const destination = path.join(__dirname, ".next/index.html");

    if (fs.existsSync(source)) {
      fs.copyFileSync(source, destination);
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

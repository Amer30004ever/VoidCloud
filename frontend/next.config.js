const path = require("path");

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

module.exports = nextConfig;

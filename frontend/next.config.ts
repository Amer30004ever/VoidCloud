import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  output: 'standalone',  // ← REQUIRED for Docker deployment
  transpilePackages: ['@workspace/ui-kit'],
  turbopack: {
    root: path.resolve(__dirname, '..'),
    resolveAlias: {
      '@workspace/ui-kit': path.resolve(__dirname, '../lib/ui-kit/src'),
    },
  },
};

export default nextConfig;
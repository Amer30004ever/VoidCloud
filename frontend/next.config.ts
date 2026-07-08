import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',  // ← REQUIRED for Docker deployment
};

export default nextConfig;
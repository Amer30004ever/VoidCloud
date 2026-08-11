import type { NextConfig } from "next";
import path from "path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const nextConfig: NextConfig = {
  output: 'standalone',
  transpilePackages: ['@workspace/ui-kit'],
  turbopack: { root: repoRoot },
  async rewrites() {
    const apiTarget = process.env.API_PROXY_TARGET || 'https://api.voidcloud.cc.cd/api/v1';
    return [
      {
        source: '/api/v1/auth/:path*',
        destination: `${apiTarget}/auth/:path*`,
      },
      {
        source: '/api/v1/billing/:path*',
        destination: `${apiTarget}/billing/:path*`,
      },
      {
        source: '/api/v1/users/:path*',
        destination: `${apiTarget}/users/:path*`,
      },
      {
        source: '/api/v1/tenants/:path*',
        destination: `${apiTarget}/tenants/:path*`,
      },
      {
        source: '/api/v1/vps/:path*',
        destination: `${apiTarget}/vps/:path*`,
      },
      {
        source: '/api/v1/whatsapp/:path*',
        destination: `${apiTarget}/whatsapp/:path*`,
      },
      {
        source: '/api/v1/webhooks/:path*',
        destination: `${apiTarget}/webhooks/:path*`,
      },
      {
        source: '/api/v1/email/:path*',
        destination: `${apiTarget}/email/:path*`,
      },
      {
        source: '/api/v1/notifications/:path*',
        destination: `${apiTarget}/notifications/:path*`,
      },
      {
        source: '/api/v1/monitoring/:path*',
        destination: `${apiTarget}/monitoring/:path*`,
      },
      {
        source: '/api/v1/audit/:path*',
        destination: `${apiTarget}/audit/:path*`,
      },
      {
        source: '/api/v1/analytics/:path*',
        destination: `${apiTarget}/analytics/:path*`,
      },
      {
        source: '/api/v1/agent/:path*',
        destination: `${apiTarget}/agent/:path*`,
      },
      {
        source: '/api/v1/sub2api/:path*',
        destination: `${apiTarget}/sub2api/:path*`,
      },
    ];
  },
};

export default nextConfig;
/** Base API URL — reads NEXT_PUBLIC_API_URL baked at build time, falls back to runtime hostname detection */
export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ??
  (typeof window !== 'undefined'
    ? window.location.hostname.includes('voidcloud.cc.cd')
      ? 'https://api.voidcloud.cc.cd/api/v1'
      : 'http://localhost:3001/api/v1'
    : 'http://localhost:3001/api/v1');

export const ROUTES = {
  login: "/login",
  dashboard: "/dashboard",
  projects: "/projects",
  pipelines: "/pipelines",
  deployments: "/deployments",
  infrastructure: "/infrastructure",
  monitoring: "/monitoring",
  logs: "/logs",
  settings: "/settings",
} as const;

export type AppRoute = (typeof ROUTES)[keyof typeof ROUTES];
export const API_BASE_URL =
  import.meta.env.VITE_API_URL ??
  (typeof window !== 'undefined'
    ? window.location.hostname.includes('voidcloud.cc.cd')
      ? 'https://api.voidcloud.cc.cd/api/v1'
      : '/api/v1'
    : '/api/v1');

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

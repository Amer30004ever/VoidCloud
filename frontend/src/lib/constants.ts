/** Base API URL - detects environment at runtime */
export const API_BASE_URL =
  typeof window !== 'undefined'
    ? (window.location.hostname.includes('amer-portal.cc.cd')
      ? 'https://api.amer-portal.cc.cd/api/v1'
      : 'http://localhost:3001/api/v1')
    : (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1');

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
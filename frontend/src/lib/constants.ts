/** Base API URL — reads NEXT_PUBLIC_API_URL baked at build time.
 *  Falls back to a relative /api/v1 path so the app works behind any
 *  nginx/ingress reverse-proxy on K8s without needing to set the env var.
 *  Set NEXT_PUBLIC_API_URL if your API lives on a different origin.
 */
export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ??
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
/** Base API URL - detects environment at runtime */
export const API_BASE_URL =
  typeof window !== 'undefined'
    ? (process.env.NEXT_PUBLIC_API_URL ||
       (window.location.hostname.includes('voidcloud.cc.cd')
         ? 'https://api.voidcloud.cc.cd/api/v1'
         : (window.location.hostname === 'localhost' && window.location.port === '3000'
           ? 'http://localhost:3000/api/v1'
           : 'http://localhost:3001/api/v1')))
    : (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1');

export const SUB2API_BASE_URL =
  typeof window !== 'undefined'
    ? (window.location.hostname.includes('voidcloud.cc.cd')
        ? 'https://api.voidcloud.cc.cd/api/v1/sub2api'
        : 'http://localhost:3013/api/v1/sub2api')
    : (process.env.NEXT_PUBLIC_SUB2API_URL ?? 'http://localhost:3013/api/v1/sub2api');

export const ROUTES = {
  login: "/voidcloud/login",
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
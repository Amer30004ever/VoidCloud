import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  turbopack: {
    root: __dirname,
  },
  env: {
    PROXMOX_HOST: process.env.PROXMOX_HOST ?? "10.51.100.10",
    PROXMOX_TOKEN_ID: process.env.PROXMOX_TOKEN_ID ?? "root@pam!Amer-Cloud",
    PROXMOX_TOKEN_SECRET: process.env.PROXMOX_TOKEN_SECRET ?? "",
    PROMETHEUS_URL: process.env.PROMETHEUS_URL ?? "http://prometheus-operated.monitoring.svc.cluster.local:9090",
    GRAFANA_URL: process.env.GRAFANA_URL ?? "http://grafana.monitoring.svc.cluster.local:3000",
    ALERTMANAGER_URL: process.env.ALERTMANAGER_URL ?? "http://alertmanager-operated.monitoring.svc.cluster.local:9093",
    LOKI_URL: process.env.LOKI_URL ?? "http://loki.monitoring.svc.cluster.local:3100",
  },
  serverExternalPackages: [],
};

export default nextConfig;

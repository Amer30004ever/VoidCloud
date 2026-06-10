export type PodStatus = "Running" | "Pending" | "Failed" | "Succeeded" | "CrashLoopBackOff";
export type PipelineStatus = "success" | "running" | "failed" | "queued" | "cancelled";

export const clusters = [
  { id: "prod-us-east", name: "prod-us-east-1", provider: "EKS", region: "us-east-1", version: "v1.29.4", nodes: 24, pods: 412, status: "Healthy" },
  { id: "prod-eu-west", name: "prod-eu-west-2", provider: "GKE", region: "eu-west-2", version: "v1.29.2", nodes: 18, pods: 287, status: "Healthy" },
  { id: "staging", name: "staging-global", provider: "AKS", region: "us-west-2", version: "v1.30.0", nodes: 8, pods: 96, status: "Degraded" },
  { id: "dev", name: "dev-shared", provider: "Kind", region: "local", version: "v1.30.0", nodes: 3, pods: 41, status: "Healthy" },
];

export const namespaces = ["default", "kube-system", "ingress-nginx", "monitoring", "argocd", "payments", "checkout", "api-gateway", "ml-platform"];

export const nodes = [
  { name: "ip-10-0-1-42", role: "control-plane", cpu: 38, mem: 54, pods: 18, status: "Ready" },
  { name: "ip-10-0-1-87", role: "control-plane", cpu: 41, mem: 60, pods: 21, status: "Ready" },
  { name: "ip-10-0-2-12", role: "worker", cpu: 72, mem: 81, pods: 34, status: "Ready" },
  { name: "ip-10-0-2-44", role: "worker", cpu: 88, mem: 92, pods: 38, status: "Pressure" },
  { name: "ip-10-0-2-71", role: "worker", cpu: 56, mem: 64, pods: 29, status: "Ready" },
  { name: "ip-10-0-3-19", role: "worker", cpu: 12, mem: 22, pods: 8, status: "Ready" },
  { name: "ip-10-0-3-55", role: "worker", cpu: 64, mem: 70, pods: 31, status: "Ready" },
  { name: "ip-10-0-3-90", role: "worker", cpu: 47, mem: 51, pods: 24, status: "Ready" },
];

export const pods: { name: string; namespace: string; status: PodStatus; restarts: number; age: string; node: string; cpu: string; mem: string }[] = [
  { name: "payments-api-7d9c4f8b9-xq2lm", namespace: "payments", status: "Running", restarts: 0, age: "4d2h", node: "ip-10-0-2-12", cpu: "240m", mem: "412Mi" },
  { name: "payments-api-7d9c4f8b9-bk7vw", namespace: "payments", status: "Running", restarts: 0, age: "4d2h", node: "ip-10-0-2-44", cpu: "228m", mem: "402Mi" },
  { name: "checkout-web-5c8f6b4d8-r9pmn", namespace: "checkout", status: "Running", restarts: 2, age: "1d6h", node: "ip-10-0-2-71", cpu: "110m", mem: "256Mi" },
  { name: "checkout-web-5c8f6b4d8-tg4qx", namespace: "checkout", status: "CrashLoopBackOff", restarts: 14, age: "32m", node: "ip-10-0-2-44", cpu: "0m", mem: "0Mi" },
  { name: "api-gateway-6f7d9c5b8-lm3vp", namespace: "api-gateway", status: "Running", restarts: 0, age: "11d", node: "ip-10-0-3-55", cpu: "180m", mem: "320Mi" },
  { name: "ml-trainer-job-8x2nq", namespace: "ml-platform", status: "Pending", restarts: 0, age: "2m", node: "—", cpu: "—", mem: "—" },
  { name: "prometheus-server-0", namespace: "monitoring", status: "Running", restarts: 1, age: "23d", node: "ip-10-0-3-90", cpu: "320m", mem: "1.4Gi" },
  { name: "grafana-c4b7f8d9-mn2lp", namespace: "monitoring", status: "Running", restarts: 0, age: "23d", node: "ip-10-0-3-19", cpu: "60m", mem: "180Mi" },
  { name: "argocd-server-69d8b7f8c-x4vlk", namespace: "argocd", status: "Running", restarts: 0, age: "47d", node: "ip-10-0-3-55", cpu: "85m", mem: "210Mi" },
  { name: "ingress-nginx-controller-8x9pq", namespace: "ingress-nginx", status: "Running", restarts: 0, age: "12d", node: "ip-10-0-2-12", cpu: "140m", mem: "190Mi" },
  { name: "data-migrate-job-29lpx", namespace: "default", status: "Succeeded", restarts: 0, age: "3h", node: "ip-10-0-2-71", cpu: "—", mem: "—" },
  { name: "legacy-cron-29842", namespace: "default", status: "Failed", restarts: 0, age: "1h", node: "ip-10-0-2-44", cpu: "—", mem: "—" },
];

export const deployments = [
  { name: "payments-api", namespace: "payments", ready: "6/6", upToDate: 6, available: 6, age: "12d", image: "payments-api:v2.14.0" },
  { name: "checkout-web", namespace: "checkout", ready: "3/4", upToDate: 4, available: 3, age: "5d", image: "checkout-web:v1.8.3" },
  { name: "api-gateway", namespace: "api-gateway", ready: "4/4", upToDate: 4, available: 4, age: "30d", image: "api-gateway:v3.2.1" },
  { name: "ml-inference", namespace: "ml-platform", ready: "2/2", upToDate: 2, available: 2, age: "8d", image: "ml-inference:v0.9.4" },
  { name: "grafana", namespace: "monitoring", ready: "1/1", upToDate: 1, available: 1, age: "23d", image: "grafana/grafana:10.4.2" },
];

export const pipelines: {
  id: string; name: string; branch: string; commit: string; author: string; status: PipelineStatus;
  duration: string; started: string; stages: { name: string; status: PipelineStatus; duration: string }[];
}[] = [
  {
    id: "PL-2841", name: "payments-api / deploy-prod", branch: "main", commit: "a8f29c1", author: "maria.kovac",
    status: "success", duration: "6m 42s", started: "14 min ago",
    stages: [
      { name: "Checkout", status: "success", duration: "8s" },
      { name: "Lint & Test", status: "success", duration: "1m 22s" },
      { name: "Build Image", status: "success", duration: "2m 14s" },
      { name: "Scan", status: "success", duration: "48s" },
      { name: "Deploy", status: "success", duration: "2m 10s" },
    ],
  },
  {
    id: "PL-2840", name: "checkout-web / deploy-staging", branch: "feat/new-cart", commit: "e1b772d", author: "j.tanaka",
    status: "running", duration: "3m 11s", started: "3 min ago",
    stages: [
      { name: "Checkout", status: "success", duration: "7s" },
      { name: "Lint & Test", status: "success", duration: "1m 18s" },
      { name: "Build Image", status: "running", duration: "1m 46s" },
      { name: "Scan", status: "queued", duration: "—" },
      { name: "Deploy", status: "queued", duration: "—" },
    ],
  },
  {
    id: "PL-2839", name: "ml-inference / nightly", branch: "main", commit: "9c44a02", author: "bot-ci",
    status: "failed", duration: "4m 02s", started: "1 h ago",
    stages: [
      { name: "Checkout", status: "success", duration: "9s" },
      { name: "Lint & Test", status: "failed", duration: "3m 53s" },
      { name: "Build Image", status: "cancelled", duration: "—" },
      { name: "Scan", status: "cancelled", duration: "—" },
      { name: "Deploy", status: "cancelled", duration: "—" },
    ],
  },
  {
    id: "PL-2838", name: "api-gateway / release-v3.2.2", branch: "release/3.2", commit: "4d1f8aa", author: "p.singh",
    status: "success", duration: "8m 17s", started: "2 h ago",
    stages: [
      { name: "Checkout", status: "success", duration: "8s" },
      { name: "Lint & Test", status: "success", duration: "2m 41s" },
      { name: "Build Image", status: "success", duration: "2m 50s" },
      { name: "Scan", status: "success", duration: "1m 02s" },
      { name: "Deploy", status: "success", duration: "1m 36s" },
    ],
  },
  {
    id: "PL-2837", name: "data-platform / etl-hourly", branch: "main", commit: "77b18e0", author: "bot-ci",
    status: "success", duration: "12m 08s", started: "3 h ago",
    stages: [
      { name: "Checkout", status: "success", duration: "6s" },
      { name: "Extract", status: "success", duration: "3m 20s" },
      { name: "Transform", status: "success", duration: "5m 41s" },
      { name: "Load", status: "success", duration: "3m 01s" },
    ],
  },
  {
    id: "PL-2836", name: "checkout-web / pr-1284", branch: "pr-1284", commit: "b22c9fa", author: "l.fernandez",
    status: "cancelled", duration: "0m 24s", started: "4 h ago",
    stages: [
      { name: "Checkout", status: "success", duration: "8s" },
      { name: "Lint & Test", status: "cancelled", duration: "16s" },
    ],
  },
  {
    id: "PL-2835", name: "infra / terraform-apply", branch: "main", commit: "31aa00c", author: "ops-bot",
    status: "queued", duration: "—", started: "queued",
    stages: [
      { name: "Plan", status: "queued", duration: "—" },
      { name: "Apply", status: "queued", duration: "—" },
    ],
  },
];

// last 24h pipeline runs per hour
export const pipelineHistory = Array.from({ length: 24 }, (_, i) => ({
  hour: `${String(i).padStart(2, "0")}:00`,
  success: 4 + Math.round(Math.sin(i / 3) * 3 + Math.random() * 4),
  failed: Math.max(0, Math.round(Math.cos(i / 4) * 2 + Math.random() * 2)),
}));

export const clusterLoad = Array.from({ length: 30 }, (_, i) => ({
  t: i,
  cpu: 40 + Math.round(Math.sin(i / 3) * 18 + Math.random() * 10),
  mem: 55 + Math.round(Math.cos(i / 4) * 12 + Math.random() * 8),
}));

import api from "@/lib/api";

export type CicdProvider = "NONE" | "GITHUB" | "GITLAB";

export interface CicdConfig {
  id: string;
  vpsId: string;
  provider: CicdProvider;
  repository: string | null;
  autoDeployBranch: string;
  autoDeploy: boolean;
  prPreview: boolean;
  buildCommand: string | null;
  deployCommand: string | null;
  hasAccessToken: boolean;
  webhookToken: string;
  webhookPath: string;
  /** Present only on first read or right after regeneration. */
  webhookSecret?: string;
  lastTriggeredAt: string | null;
}

export interface DeployRun {
  id: string;
  status: "QUEUED" | "RUNNING" | "SUCCEEDED" | "FAILED";
  ref: string | null;
  commitSha: string | null;
  message: string | null;
  trigger: string;
  startedAt: string;
  finishedAt: string | null;
}

export type LbAlgorithm = "ROUND_ROBIN" | "LEAST_CONNECTIONS" | "IP_HASH";

export interface LoadBalancer {
  id: string;
  name: string;
  vpsId: string | null;
  algorithm: LbAlgorithm;
  status: "PROVISIONING" | "ACTIVE" | "DEGRADED" | "DISABLED";
  listenPort: number;
  targetPort: number;
  healthCheckPath: string;
  monthlyUsd: number;
  backends: Array<{ id: string; vpsId: string; healthy: boolean; vps?: { id: string; name: string; ipv4Address?: string | null; status: string } }>;
}

export const cicdApi = {
  get: async (vpsId: string) => (await api.get<CicdConfig>(`/vps/${vpsId}/cicd`)).data,
  update: async (vpsId: string, body: Partial<Omit<CicdConfig, "webhookSecret">> & { accessToken?: string | null }) =>
    (await api.put<CicdConfig>(`/vps/${vpsId}/cicd`, body)).data,
  regenerate: async (vpsId: string) => (await api.post<CicdConfig>(`/vps/${vpsId}/cicd/webhook/regenerate`)).data,
  runs: async (vpsId: string) => (await api.get<DeployRun[]>(`/vps/${vpsId}/cicd/runs`)).data,
  deploy: async (vpsId: string, ref?: string) => (await api.post(`/vps/${vpsId}/cicd/deploy`, { ref })).data,
};

export const cloneApi = {
  clone: async (vpsId: string, body: { name?: string; syncData?: boolean; mode?: "staging" | "cluster" }) =>
    (await api.post<{ vps: { id: string; name: string }; syncData: boolean; mode: string }>(`/vps/${vpsId}/clone`, body)).data,
  list: async (vpsId: string) => (await api.get<Array<{ id: string; name: string; status: string; isStaging: boolean }>>(`/vps/${vpsId}/clones`)).data,
};

export const loadBalancerApi = {
  list: async (vpsId?: string) =>
    (await api.get<LoadBalancer[]>(`/vps/load-balancers${vpsId ? `?vpsId=${encodeURIComponent(vpsId)}` : ""}`)).data,
  create: async (body: { name: string; vpsId?: string; algorithm?: LbAlgorithm; listenPort?: number; targetPort?: number; healthCheckPath?: string; backendVpsIds: string[] }) =>
    (await api.post<LoadBalancer>("/vps/load-balancers", body)).data,
  update: async (id: string, body: { algorithm?: LbAlgorithm; backendVpsIds?: string[]; enabled?: boolean; listenPort?: number; targetPort?: number; healthCheckPath?: string }) =>
    (await api.patch<LoadBalancer>(`/vps/load-balancers/${id}`, body)).data,
  remove: async (id: string) => (await api.delete(`/vps/load-balancers/${id}`)).data,
};

/** Public base used to build copyable webhook URLs. */
export function publicApiOrigin(): string {
  const base = (api.defaults.baseURL ?? "").replace(/\/api\/v1\/?$/, "");
  if (base.startsWith("http")) return base;
  return typeof window !== "undefined" ? window.location.origin : "https://api.voidcloud.cc.cd";
}

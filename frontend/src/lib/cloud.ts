import api from "./api";

export interface CloudPlan {
  id: string;
  name: string;
  slug: string;
  description?: string;
  priceUSD: number;
  priceEGP: number;
  interval: string;
  cpuLimit: number;
  memoryLimit: number;
  storageLimit: number;
  deploymentLimit: number;
  vpsLimit?: number;
  customDomainLimit: number;
  apiRequestLimit: number;
  teamMemberLimit: number;
  databaseSizeLimit: number;
  redisLimit?: number | null;
  trialDays: number;
  features: string[];
  isActive: boolean;
  isPopular: boolean;
  sortOrder: number;
}

export interface CloudDeployment {
  id: string;
  name: string;
  status: "PENDING" | "DEPLOYING" | "RUNNING" | "STOPPED" | "FAILED" | "DELETED";
  type: "GITHUB" | "DOCKER_IMAGE" | "DOCKER_COMPOSE";
  source: string;
  namespace: string;
  subdomain?: string;
  cpu: number;
  memory: number;
  storage: number;
  replicas: number;
  customDomains: string[];
  envVars?: Record<string, string>;
  healthCheck?: string;
  lastDeployedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CloudInvoice {
  id: string;
  number: string;
  amountUSD?: number;
  amountEGP?: number;
  currency: string;
  status: "PENDING" | "PAID" | "FAILED" | "REFUNDED";
  description: string;
  provider?: string;
  providerRef?: string;
  dueDate: string;
  paidAt?: string;
  createdAt: string;
}

export interface CloudUsage {
  plan: CloudPlan | null;
  limits: Record<string, number>;
  used: { cpu: number; memory: number; storage: number; deployments: number; apiRequests: number };
}

export const cloudApi = {
  plans: {
    list: async () => (await api.get<CloudPlan[]>("/cloud/plans")).data,
  },
  deployments: {
    list: async () => (await api.get<CloudDeployment[]>("/cloud/deployments")).data,
    get: async (id: string) => (await api.get<CloudDeployment>(`/cloud/deployments/${id}`)).data,
    create: async (body: Partial<CloudDeployment>) =>
      (await api.post<CloudDeployment>("/cloud/deployments", body)).data,
    update: async (id: string, body: Partial<CloudDeployment>) =>
      (await api.put<CloudDeployment>(`/cloud/deployments/${id}`, body)).data,
    remove: async (id: string) => api.delete(`/cloud/deployments/${id}`),
    restart: async (id: string) => (await api.post(`/cloud/deployments/${id}/restart`)).data,
    metrics: async (id: string) => (await api.get(`/cloud/deployments/${id}/metrics`)).data,
    logs: async (id: string) => (await api.get(`/cloud/deployments/${id}/logs`)).data,
    usage: async () => (await api.get<CloudUsage>("/cloud/deployments/usage/me")).data,
  },
  billing: {
    current: async () => (await api.get("/cloud/billing/current")).data,
    subscribe: async (body: { planId: string; provider: "stripe" | "fawry" | "instapay" | "cash"; customerPhone?: string; payerInstapayId?: string }) =>
      (await api.post("/cloud/billing/subscribe", body)).data,
    cancel: async () => (await api.post("/cloud/billing/cancel")).data,
    invoices: async () => (await api.get<CloudInvoice[]>("/cloud/billing/invoices")).data,
    invoice: async (id: string) => (await api.get<CloudInvoice>(`/cloud/billing/invoices/${id}`)).data,
    paymentMethods: async () => (await api.get("/cloud/billing/payment-methods")).data,
    addPaymentMethod: async (body: Record<string, unknown>) => (await api.post("/cloud/billing/payment-methods", body)).data,
    removePaymentMethod: async (id: string) => api.delete(`/cloud/billing/payment-methods/${id}`),
  },
  admin: {
    stats: async () => (await api.get("/cloud/admin/stats")).data,
    users: async (q?: string) => (await api.get("/cloud/admin/users", { params: { q } })).data,
    createUser: async (body: { email: string; name: string; password: string; role?: string; planId?: string | null }) =>
      (await api.post("/cloud/admin/users", body)).data,
    deleteUser: async (id: string) => api.delete(`/cloud/admin/users/${id}`),
    resetPassword: async (id: string) => (await api.post(`/cloud/admin/users/${id}/reset-password`)).data,
    impersonate: async (id: string) =>
      (await api.post<{ access_token: string; user: { id: string; email: string; name: string; role: string } }>(`/cloud/admin/users/${id}/impersonate`)).data,
    setPlan: async (id: string, planId: string | null) =>
      (await api.put(`/cloud/admin/users/${id}/plan`, { planId })).data,
    suspend: async (id: string, reason: string) =>
      (await api.put(`/cloud/admin/users/${id}/suspend`, { reason })).data,
    activate: async (id: string) => (await api.put(`/cloud/admin/users/${id}/activate`)).data,
    overrideLimits: async (id: string, limits: Record<string, number>) =>
      (await api.put(`/cloud/admin/users/${id}/override-limits`, limits)).data,
    extendTrial: async (id: string, days: number) =>
      (await api.put(`/cloud/admin/users/${id}/extend-trial`, { days })).data,
    plans: async () => (await api.get<CloudPlan[]>("/cloud/admin/plans")).data,
    createPlan: async (body: Partial<CloudPlan>) =>
      (await api.post<CloudPlan>("/cloud/admin/plans", body)).data,
    updatePlan: async (id: string, body: Partial<CloudPlan>) =>
      (await api.put<CloudPlan>(`/cloud/admin/plans/${id}`, body)).data,
    deletePlan: async (id: string) => api.delete(`/cloud/admin/plans/${id}`),
    transactions: async () => (await api.get("/cloud/admin/billing/transactions")).data,
    transactionsCsvUrl: () => {
      const base = (api.defaults?.baseURL || "").replace(/\/$/, "");
      return `${base}/cloud/admin/billing/transactions.csv`;
    },
    refund: async (invoiceId: string, partial?: number) =>
      (await api.post("/cloud/admin/billing/refund", { invoiceId, partial })).data,
    confirm: async (invoiceId: string) =>
      (await api.post("/cloud/admin/billing/confirm", { invoiceId })).data,
    rejectInvoice: async (invoiceId: string, reason: string) =>
      (await api.post("/cloud/admin/billing/reject", { invoiceId, reason })).data,
    broadcast: async (body: { title: string; body: string; severity?: string; audience?: string }) =>
      (await api.post("/cloud/admin/announcements", body)).data,
    announcements: async () => (await api.get("/cloud/admin/announcements")).data,
  },
};

/* ============ Phase 2 helpers ============ */

export function streamDeploymentLogs(
  deploymentId: string,
  onLine: (line: string) => void,
  onError?: (e: Event) => void,
): () => void {
  const base = (api.defaults?.baseURL || "").replace(/\/$/, "");
  const token = typeof window !== "undefined" ? localStorage.getItem("amer_token") : null;
  const url = `${base}/cloud/deployments/${deploymentId}/logs/stream${token ? `?token=${encodeURIComponent(token)}` : ""}`;
  const es = new EventSource(url, { withCredentials: true });
  es.onmessage = (e) => {
    try {
      const { line } = JSON.parse(e.data);
      if (line) onLine(line);
    } catch {}
  };
  if (onError) es.onerror = onError;
  return () => es.close();
}

export const cloudTwoFactor = {
  enable: async () => (await api.post("/cloud/auth/2fa/enable")).data,
  verify: async (token: string) => (await api.post("/cloud/auth/2fa/verify", { token })).data,
  disable: async () => (await api.post("/cloud/auth/2fa/disable")).data,
};

export const cloudBackups = {
  list: async (deploymentId: string) =>
    (await api.get(`/cloud/deployments/${deploymentId}/backups`)).data,
  create: async (deploymentId: string) =>
    (await api.post(`/cloud/deployments/${deploymentId}/backups`)).data,
  restore: async (deploymentId: string, backupId: string) =>
    (await api.post(`/cloud/deployments/${deploymentId}/backups/restore/${backupId}`)).data,
};

export const cloudAudit = {
  list: async (params?: { targetId?: string; action?: string }) =>
    (await api.get("/cloud/admin/audit-logs", { params })).data,
};

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

// Single VPS current usage (for dashboard cards)
export interface VpsCurrentUsage {
  cpuPercent: number;
  ramPercent: number;
  diskPercent: number;
  uptime: number;
  networkRx: number;
  networkTx: number;
  memUsedMB: number;
  memTotalMB: number;
  diskUsedGB: number;
  diskTotalGB: number;
}

export interface OsTemplate {
  id: string;
  label: string;
  proxmoxId: number;
  description: string;
  hasDocker: boolean;
}

export const cloudApi = {
  plans: {
    list: async () => (await api.get<CloudPlan[]>("/cloud/plans")).data,
  },
  templates: {
    list: async () => (await api.get<OsTemplate[]>("/cloud/templates")).data,
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
    start: async (id: string) => (await api.post(`/cloud/deployments/${id}/start`)).data,
    stop: async (id: string) => (await api.post(`/cloud/deployments/${id}/stop`)).data,
    reinstall: async (id: string) => (await api.post<{ ok: boolean; rootPassword: string }>(`/cloud/deployments/${id}/reinstall`)).data,
    resetRootPassword: async (id: string) => (await api.post<{ ok: boolean; rootPassword: string }>(`/cloud/deployments/${id}/reset-root-password`)).data,
    resize: async (id: string, body: { cpu?: number; memory?: number; storage?: number }) =>
      (await api.put(`/cloud/deployments/${id}/resize`, body)).data,
    metrics: async (id: string) => (await api.get(`/cloud/deployments/${id}/metrics`)).data,
    usage: async () => (await api.get<CloudUsage>("/cloud/deployments/usage/me")).data,
    usageOne: async (id: string) => (await api.get<VpsCurrentUsage>(`/cloud/deployments/${id}/usage`)).data,
    logs: async (id: string) => (await api.get(`/cloud/deployments/${id}/logs`)).data,
  },
  snapshots: {
    list: async (vpsId: string): Promise<Array<{ id: string; name: string; description?: string; sizeBytes: string; status: string; createdAt: string }>> =>
      (await api.get(`/cloud/vps/${vpsId}/snapshots`)).data,
    create: async (vpsId: string, name: string, description?: string) =>
      (await api.post(`/cloud/vps/${vpsId}/snapshots`, { name, description })).data,
    restore: async (snapshotId: string) => (await api.post(`/cloud/snapshots/${snapshotId}/restore`)).data,
    remove: async (snapshotId: string) => (await api.delete(`/cloud/snapshots/${snapshotId}`)).data,
  },
  apps: {
    catalog: async (): Promise<Array<{ id: string; name: string; category: string; description: string }>> =>
      (await api.get(`/cloud/apps/catalog`)).data,
    install: async (vpsId: string, apps: string[]) =>
      (await api.post(`/cloud/vps/${vpsId}/apps/install`, { apps })).data,
    status: async (vpsId: string): Promise<{ apps: string[]; installedApps: Record<string, { status: string; installedAt: string }> }> =>
      (await api.get(`/cloud/vps/${vpsId}/apps/status`)).data,
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
    reset2FA: async (id: string) => (await api.post(`/cloud/admin/users/${id}/reset-2fa`)).data,
    smtpStatus: async () => (await api.get<{ transport: string; from: string; host: string | null; port: number | null; user: string | null; configured: boolean }>("/cloud/admin/smtp/status")).data,
    smtpVerify: async () => (await api.post<{ ok: boolean; transport: string; error?: string }>("/cloud/admin/smtp/verify")).data,
    smtpTest: async (to?: string) => (await api.post<{ ok: boolean }>("/cloud/admin/smtp/test", { to })).data,
    allVps: async () => (await api.get("/cloud/admin/vps")).data,
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
    } catch { }
  };
  if (onError) es.onerror = onError;
  return () => es.close();
}

export const cloudTwoFactor = {
  status: async () => (await api.get<{ enabled: boolean; recoveryCodesRemaining: number }>("/cloud/auth/2fa/status")).data,
  enable: async () => (await api.post<{ otpauthUrl: string; base32: string; qrCode: string }>("/cloud/auth/2fa/enable")).data,
  verify: async (token: string) => (await api.post<{ enabled: boolean; recoveryCodes: string[] }>("/cloud/auth/2fa/verify", { token })).data,
  regenerate: async () => (await api.post<{ recoveryCodes: string[] }>("/cloud/auth/2fa/recovery-codes/regenerate")).data,
  disable: async (body: { password?: string; recoveryCode?: string }) =>
    (await api.post("/cloud/auth/2fa/disable", body)).data,
};

export interface CloudProfile {
  id: string; email: string; name: string; phone: string;
  emailVerified: boolean; twoFactorEnabled: boolean;
  avatar: string | null; createdAt: string;
}

export interface NotificationPrefs {
  vpsAlerts: boolean;
  usageAlerts: boolean;
  trialReminders: boolean;
  paymentAlerts: boolean;
  securityAlerts: boolean;
}

export const cloudAccount = {
  getProfile: async () => (await api.get<CloudProfile>("/cloud/account/profile")).data,
  updateProfile: async (b: { displayName?: string; phone?: string | null }) =>
    (await api.put<{ ok: boolean }>("/cloud/account/profile", b)).data,
  requestEmailChange: async (b: { currentPassword: string; newEmail: string }) =>
    (await api.post<{ ok: boolean; message: string }>("/cloud/account/email/request-change", b)).data,
  changePassword: async (b: { currentPassword: string; newPassword: string }) =>
    (await api.post<{ ok: boolean }>("/cloud/account/password/change", b)).data,
  deleteAccount: async (password: string) =>
    (await api.delete<{ ok: boolean }>("/cloud/account", { data: { password } })).data,
  getNotificationPrefs: async () =>
    (await api.get<NotificationPrefs>("/cloud/account/notifications/preferences")).data,
  updateNotificationPrefs: async (prefs: Partial<NotificationPrefs>) =>
    (await api.put<NotificationPrefs>("/cloud/account/notifications/preferences", prefs)).data,
};

export interface VpsBackup {
  id: string;
  deploymentId: string;
  name?: string | null;
  type: "MANUAL" | "SCHEDULED";
  sizeMB: number;
  storagePath: string;
  status: string;
  createdAt: string;
  completedAt?: string | null;
  deployment?: { id: string; name: string };
}
export interface BackupSchedule {
  vpsId: string;
  enabled: boolean;
  frequency: "DAILY" | "WEEKLY" | "MONTHLY";
  retention: number;
  hour?: number | null;
  dayOfWeek?: number | null;
  dayOfMonth?: number | null;
}
export const cloudBackups = {
  listForVps: async (vpsId: string): Promise<VpsBackup[]> =>
    (await api.get(`/cloud/vps/${vpsId}/backups`)).data,
  create: async (vpsId: string, name?: string): Promise<VpsBackup> =>
    (await api.post(`/cloud/vps/${vpsId}/backups`, { name })).data,
  listAll: async (params?: { vpsId?: string; from?: string; to?: string }): Promise<VpsBackup[]> =>
    (await api.get(`/cloud/backups`, { params })).data,
  restore: async (backupId: string, targetVpsId?: string) =>
    (await api.post(`/cloud/backups/${backupId}/restore`, { targetVpsId })).data,
  remove: async (backupId: string) =>
    (await api.delete(`/cloud/backups/${backupId}`)).data,
  removeBatch: async (ids: string[]) =>
    (await api.post(`/cloud/backups/batch-delete`, { ids })).data,
  getSchedule: async (vpsId: string): Promise<BackupSchedule> =>
    (await api.get(`/cloud/vps/${vpsId}/backup-schedule`)).data,
  updateSchedule: async (vpsId: string, s: Partial<BackupSchedule>): Promise<BackupSchedule> =>
    (await api.put(`/cloud/vps/${vpsId}/backup-schedule`, s)).data,
};

export const cloudAudit = {
  list: async (params?: { targetId?: string; action?: string }) =>
    (await api.get("/cloud/admin/audit-logs", { params })).data,
};

export interface ResizeQuote {
  daysLeft: number; cycleDays: number;
  currentPlan: CloudPlan | null; newPlan: CloudPlan;
  amountUSD: number; amountEGP: number; credit: boolean; isUpgrade: boolean;
}
export const cloudResize = {
  options: async (vpsId: string): Promise<{ current: CloudPlan | null; upgrades: CloudPlan[]; downgrades: CloudPlan[] }> =>
    (await api.get(`/cloud/vps/${vpsId}/upgrades`)).data,
  quote: async (vpsId: string, newPlanId: string): Promise<ResizeQuote> =>
    (await api.get(`/cloud/vps/${vpsId}/resize/price`, { params: { newPlanId } })).data,
  liveSupported: async (vpsId: string): Promise<{ supported: boolean; requiresReboot: boolean }> =>
    (await api.get(`/cloud/vps/${vpsId}/resize/live-supported`)).data,
  resize: async (vpsId: string, newPlanId: string) =>
    (await api.post(`/cloud/vps/${vpsId}/resize`, { newPlanId, confirmPrice: true })).data,
};

export interface FirewallRule {
  id: string; vpsId: string; name: string; priority: number;
  action: "ALLOW" | "DENY"; protocol: "TCP" | "UDP" | "ICMP" | "ANY";
  port?: string | null; sourceIP?: string | null; description?: string | null;
  enabled: boolean; createdAt: string; updatedAt: string;
}
export type FirewallRuleInput = Partial<Omit<FirewallRule, "id" | "vpsId" | "createdAt" | "updatedAt">>;
export const cloudFirewall = {
  list: async (vpsId: string): Promise<FirewallRule[]> => (await api.get(`/cloud/vps/${vpsId}/firewall`)).data,
  create: async (vpsId: string, data: FirewallRuleInput): Promise<FirewallRule> =>
    (await api.post(`/cloud/vps/${vpsId}/firewall`, data)).data,
  update: async (id: string, data: FirewallRuleInput): Promise<FirewallRule> =>
    (await api.put(`/cloud/firewall/${id}`, data)).data,
  remove: async (id: string) => (await api.delete(`/cloud/firewall/${id}`)).data,
  toggle: async (id: string): Promise<FirewallRule> => (await api.post(`/cloud/firewall/${id}/toggle`)).data,
  reorder: async (vpsId: string, ruleIds: string[]) =>
    (await api.post(`/cloud/vps/${vpsId}/firewall/reorder`, { ruleIds })).data,
  reset: async (vpsId: string) => (await api.post(`/cloud/vps/${vpsId}/firewall/reset`)).data,
};

export type OrgRole = "OWNER" | "ADMIN" | "MEMBER" | "VIEWER";
export interface Organization { id: string; name: string; slug: string; ownerId: string; avatar?: string | null; createdAt: string; _count?: { members: number; vps: number }; members?: { role: OrgRole }[] }
export interface OrgMember { organizationId: string; userId: string; role: OrgRole; joinedAt: string; user: { id: string; email: string; name: string } }
export interface OrgInvitation { id: string; organizationId: string; email: string; role: OrgRole; expiresAt: string; acceptedAt: string | null; organization?: { id: string; name: string; slug: string } }
export const cloudOrgs = {
  list: async (): Promise<Organization[]> => (await api.get("/cloud/orgs")).data,
  create: async (name: string): Promise<Organization> => (await api.post("/cloud/orgs", { name })).data,
  get: async (id: string) => (await api.get(`/cloud/orgs/${id}`)).data,
  update: async (id: string, data: { name?: string }) => (await api.put(`/cloud/orgs/${id}`, data)).data,
  remove: async (id: string) => (await api.delete(`/cloud/orgs/${id}`)).data,
  members: async (id: string): Promise<OrgMember[]> => (await api.get(`/cloud/orgs/${id}/members`)).data,
  invite: async (id: string, email: string, role: OrgRole) => (await api.post(`/cloud/orgs/${id}/members/invite`, { email, role })).data,
  removeMember: async (id: string, userId: string) => (await api.delete(`/cloud/orgs/${id}/members/${userId}`)).data,
  setRole: async (id: string, userId: string, role: OrgRole) => (await api.put(`/cloud/orgs/${id}/members/${userId}/role`, { role })).data,
  myInvitations: async (): Promise<OrgInvitation[]> => (await api.get("/cloud/orgs/invitations")).data,
  accept: async (invId: string) => (await api.post(`/cloud/orgs/invitations/${invId}/accept`)).data,
  revokeInvite: async (invId: string) => (await api.delete(`/cloud/orgs/invitations/${invId}`)).data,
};

export type ImageType = "SNAPSHOT" | "CUSTOM" | "MARKETPLACE";
export interface CustomImage {
  id: string; userId: string; name: string; description?: string | null;
  type: ImageType; sourceVpsId?: string | null; sizeMB: number;
  isPublic: boolean; storageUrl?: string | null; createdAt: string;
  sourceVps?: { id: string; name: string } | null;
  _shared?: boolean;
}
export const cloudImages = {
  list: async (): Promise<CustomImage[]> => (await api.get("/cloud/images")).data,
  marketplace: async (): Promise<CustomImage[]> => (await api.get("/cloud/marketplace")).data,
  snapshot: async (vpsId: string, name: string, description?: string): Promise<CustomImage> =>
    (await api.post(`/cloud/images/snapshot/${vpsId}`, { name, description })).data,
  upload: async (data: { name: string; sizeMB: number; storageUrl: string; description?: string }): Promise<CustomImage> =>
    (await api.post("/cloud/images/upload", data)).data,
  remove: async (id: string) => (await api.delete(`/cloud/images/${id}`)).data,
  deploy: async (id: string, vpsName: string) => (await api.post(`/cloud/images/${id}/deploy`, { vpsName })).data,
  deployMarketplace: async (id: string, vpsName: string) => (await api.post(`/cloud/marketplace/${id}/deploy`, { vpsName })).data,
  share: async (id: string, email: string) => (await api.post(`/cloud/images/${id}/share`, { email })).data,
  publish: async (id: string, isPublic: boolean) => (await api.post(`/cloud/images/${id}/publish`, { isPublic })).data,
};

export interface Domain {
  id: string; vpsId: string; domain: string; autoSSL: boolean;
  sslIssuedAt?: string | null; sslExpiresAt?: string | null;
  verifiedAt?: string | null; verifyToken: string; createdAt: string;
  _count?: { dnsRecords: number };
}
export interface DNSRecord {
  id: string; domainId: string; type: string; name: string;
  value: string; ttl: number; priority?: number | null; createdAt: string;
}
export const cloudDomains = {
  list: async (vpsId: string): Promise<Domain[]> => (await api.get(`/cloud/vps/${vpsId}/domains`)).data,
  add: async (vpsId: string, domain: string, autoSSL: boolean): Promise<Domain> =>
    (await api.post(`/cloud/vps/${vpsId}/domains`, { domain, autoSSL })).data,
  verifyInfo: async (id: string) => (await api.get(`/cloud/domains/${id}/verify`)).data,
  verify: async (id: string) => (await api.post(`/cloud/domains/${id}/verify`)).data,
  ssl: async (id: string) => (await api.post(`/cloud/domains/${id}/ssl`)).data,
  remove: async (id: string) => (await api.delete(`/cloud/domains/${id}`)).data,
  records: async (id: string): Promise<DNSRecord[]> => (await api.get(`/cloud/domains/${id}/dns`)).data,
  addRecord: async (id: string, data: Partial<DNSRecord>): Promise<DNSRecord> =>
    (await api.post(`/cloud/domains/${id}/dns`, data)).data,
  removeRecord: async (id: string) => (await api.delete(`/cloud/dns/${id}`)).data,
};

export interface UsagePoint { timestamp: string; value: number }

// Historical VPS usage for analytics charts (time series data)
export interface VpsHistoricalUsage {
  cpu: UsagePoint[];
  ram: UsagePoint[];
  disk: UsagePoint[];
  networkRx: UsagePoint[];
  networkTx: UsagePoint[];
}

export interface CostBreakdown {
  byVPS: { vpsId: string; vpsName: string; cost: number }[];
  monthly: { month: string; total: number }[];
  total: number;
  forecast: number;
}
export interface ResourceTrends { cpu: number; ram: number; disk: number; vpsCount: number }
export const cloudAnalytics = {
  vpsUsage: async (vpsId: string, hours = 24): Promise<VpsHistoricalUsage> =>
    (await api.get(`/cloud/analytics/vps/${vpsId}/usage`, { params: { hours } })).data,
  costs: async (months = 3): Promise<CostBreakdown> =>
    (await api.get(`/cloud/analytics/costs`, { params: { months } })).data,
  trends: async (days = 30): Promise<ResourceTrends> =>
    (await api.get(`/cloud/analytics/trends`, { params: { days } })).data,
  exportCsvUrl: () => `/cloud/analytics/export/csv`,
};

export interface RateLimitWindow { endpoint: string; method: string; period: string; limit: number; remaining: number; resetAt: string }
export interface RateLimitStatus {
  limits: RateLimitWindow[];
  overall: { limit: number; remaining: number; resetAt: string };
}
export interface RateLimitHistory {
  daily: { date: string; count: number }[];
  byEndpoint: { endpoint: string; count: number }[];
}
export interface RateLimitAlert { threshold: number; enabled: boolean }
export const cloudRateLimits = {
  current: async (): Promise<RateLimitStatus> => (await api.get('/cloud/rate-limits')).data,
  history: async (days = 7): Promise<RateLimitHistory> =>
    (await api.get('/cloud/rate-limits/history', { params: { days } })).data,
  getAlert: async (): Promise<RateLimitAlert> => (await api.get('/cloud/rate-limits/alert')).data,
  setAlert: async (threshold: number, enabled: boolean): Promise<RateLimitAlert> =>
    (await api.post('/cloud/rate-limits/alert', { threshold, enabled })).data,
};

export interface WebhookEndpoint {
  id: string; name: string; url: string; events: string[];
  secret?: string | null; enabled: boolean; createdAt: string; updatedAt: string;
}
export interface WebhookDelivery {
  id: string; webhookId: string; eventType: string; payload: unknown;
  responseStatus?: number | null; responseBody?: string | null;
  attempt: number; success: boolean; error?: string | null; createdAt: string;
}
export const cloudWebhooks = {
  events: async (): Promise<string[]> => (await api.get('/cloud/webhooks/events')).data,
  list: async (): Promise<WebhookEndpoint[]> => (await api.get('/cloud/webhooks')).data,
  create: async (data: { name: string; url: string; events: string[]; enabled?: boolean }): Promise<WebhookEndpoint> =>
    (await api.post('/cloud/webhooks', data)).data,
  update: async (id: string, data: Partial<{ name: string; url: string; events: string[]; enabled: boolean; regenerateSecret: boolean }>): Promise<WebhookEndpoint> =>
    (await api.put(`/cloud/webhooks/${id}`, data)).data,
  remove: async (id: string): Promise<void> => { await api.delete(`/cloud/webhooks/${id}`); },
  test: async (id: string): Promise<WebhookDelivery> => (await api.post(`/cloud/webhooks/${id}/test`)).data,
  deliveries: async (id: string, limit = 50): Promise<WebhookDelivery[]> =>
    (await api.get(`/cloud/webhooks/${id}/deliveries`, { params: { limit } })).data,
};

export interface MigrationTarget { name: string; currentLoad: number; online: boolean }
export interface MigrationStorage { name: string; available: number; total: number }
export interface MigrationRecord {
  id: string; vpsId: string; sourceNode: string; targetNode: string;
  targetStorage?: string | null; status: string; progress: number;
  estimatedDowntimeSec: number; scheduledFor?: string | null;
  startedAt?: string | null; completedAt?: string | null; errorMessage?: string | null; createdAt: string;
}
export const cloudMigration = {
  targets: async (vpsId: string): Promise<{ current: { node: string | null }; nodes: MigrationTarget[]; storage: MigrationStorage[] }> =>
    (await api.get(`/cloud/vps/${vpsId}/migration/targets`)).data,
  start: async (vpsId: string, targetNode: string, targetStorage?: string, scheduledFor?: string) =>
    (await api.post(`/cloud/vps/${vpsId}/migration`, { targetNode, targetStorage, scheduledFor })).data,
  status: async (migrationId: string): Promise<{ status: string; progress: number; estimatedRemaining: number }> =>
    (await api.get(`/cloud/migration/${migrationId}/status`)).data,
  cancel: async (migrationId: string) => (await api.delete(`/cloud/migration/${migrationId}/cancel`)).data,
  history: async (vpsId: string): Promise<MigrationRecord[]> =>
    (await api.get(`/cloud/vps/${vpsId}/migration/history`)).data,
  adminDrain: async (sourceNode: string, targetNode: string) =>
    (await api.post(`/admin/cloud/migration/drain`, { sourceNode, targetNode })).data,
};

export interface ReferralStats {
  code: string;
  clicks: number;
  signups: number;
  conversions: number;
  earnings: { pending: number; paid: number; total: number };
  history: { date: string; event: string; amount: number }[];
  config: { commissionType: string; commissionValue: number; payoutMinimum: number; cookieDays: number };
}
export interface ReferralPayoutMethod { type: 'FAWRY' | 'INSTAPAY' | 'BANK'; destination: string }
export interface ReferralPayout { id: string; amount: number; currency: string; method: string; destination: string; status: string; createdAt: string }
export const cloudReferral = {
  code: async (): Promise<{ code: string }> => (await api.get('/cloud/referral/code')).data,
  stats: async (): Promise<ReferralStats> => (await api.get('/cloud/referral/stats')).data,
  getPayoutMethod: async (): Promise<ReferralPayoutMethod | null> => (await api.get('/cloud/referral/payout-method')).data,
  setPayoutMethod: async (m: ReferralPayoutMethod): Promise<ReferralPayoutMethod> => (await api.post('/cloud/referral/payout-method', m)).data,
  payouts: async (): Promise<ReferralPayout[]> => (await api.get('/cloud/referral/payouts')).data,
  requestPayout: async (amount: number, method: string): Promise<ReferralPayout> =>
    (await api.post('/cloud/referral/payout', { amount, method })).data,
};

// ============ SSH Keys ============

export interface SSHKey {
  id: string;
  name: string;
  publicKey: string;
  fingerprint: string;
  createdAt: string;
  lastUsedAt: string | null;
  vpses?: { id: string; name: string }[];
}

export const cloudSshKeys = {
  list: async (): Promise<SSHKey[]> => (await api.get("/cloud/ssh-keys")).data,
  add: async (name: string, publicKey: string): Promise<SSHKey> =>
    (await api.post("/cloud/ssh-keys", { name, publicKey })).data,
  remove: async (id: string): Promise<void> => {
    await api.delete(`/cloud/ssh-keys/${id}`);
  },
  listForVps: async (vpsId: string): Promise<SSHKey[]> =>
    (await api.get(`/cloud/vps/${vpsId}/ssh-keys`)).data,
  attach: async (vpsId: string, keyId: string): Promise<void> => {
    await api.post(`/cloud/vps/${vpsId}/ssh-keys/${keyId}`);
  },
  detach: async (vpsId: string, keyId: string): Promise<void> => {
    await api.delete(`/cloud/vps/${vpsId}/ssh-keys/${keyId}`);
  },
};
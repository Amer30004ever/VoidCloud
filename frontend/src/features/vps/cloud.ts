import api from "@/lib/api";

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

export interface TenantQuota {
  id: string;
  tenantId: string;
  maxCpu: number;
  maxRamMb: number;
  maxDiskGb: number;
  maxVpsCount: number;
  currentCpu: number;
  currentRamMb: number;
  currentDiskGb: number;
  currentVpsCount: number;
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

export interface WhatsappTemplate {
  id: string;
  name: string;
  body: string;
  createdBy: string;
  tenantId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface WhatsappBroadcast {
  id: string;
  createdBy: string;
  tenantId?: string;
  templateId?: string;
  templateName?: string;
  messageBody: string;
  segment: string;
  status: string;
  sentCount: number;
  deliveredCount: number;
  failedCount: number;
  metadata?: Record<string, unknown>;
  sentAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface WhatsappBroadcastRecipient {
  id: string;
  broadcastId: string;
  phone: string;
  name?: string;
  status: string;
  error?: string;
  sentAt?: string;
  deliveredAt?: string;
  createdAt: string;
}

export type ProvisionJobStatus = "QUEUED" | "PROCESSING" | "SUCCEEDED" | "FAILED";
export interface ProvisionJob {
  id: string;
  idempotencyKey: string;
  status: ProvisionJobStatus;
  vpsId: string | null;
  result: { vpsId: string; ipv4Address?: string; proxmoxVMID?: number; node?: string } | null;
  errorMessage: string | null;
  attempts: number;
  createdAt: string;
  updatedAt: string;
}

export interface SlaCreditItem {
  id: string;
  vpsId: string;
  periodStart: string;
  periodEnd: string;
  uptimePercent: number;
  downtimeMinutes: number;
  creditPercent: number;
  amount: number;
  createdAt: string;
}

export const cloudApi = {
  plans: {
    list: async () => (await api.get<CloudPlan[]>("/billing/plans")).data,
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
    snapshot: async (id: string, name: string, description?: string) => (await api.post(`/cloud/deployments/${id}/snapshot`, { name, description })).data,
    resize: async (id: string, body: { cpu?: number; memory?: number; storage?: number }) =>
      (await api.put(`/cloud/deployments/${id}/resize`, body)).data,
    metrics: async (id: string) => (await api.get(`/cloud/deployments/${id}/metrics`)).data,
    usage: async () => (await api.get<CloudUsage>("/cloud/deployments/usage/me")).data,
    usageOne: async (id: string) => (await api.get<VpsCurrentUsage>(`/cloud/deployments/${id}/usage`)).data,
    logs: async (id: string) => (await api.get(`/cloud/deployments/${id}/logs`)).data,
  },
  // ── Async VPS provisioning (Prompt 2.1) ──
  vps: {
    provision: async (body: {
      name: string;
      planSlug?: string;
      staticIp?: string;
      billingMode?: "PAY_AS_YOU_GO" | "SUBSCRIPTION";
      idempotencyKey: string;
    }) => (await api.post<ProvisionJob>("/vps/provision", body)).data,
    job: async (id: string) => (await api.get<ProvisionJob>(`/vps/jobs/${id}`)).data,
    jobs: async () => (await api.get<ProvisionJob[]>("/vps/jobs")).data,
    quota: async () => (await api.get<TenantQuota>("/vps/quota")).data,
  },
  billing: {
    current: async () => (await api.get("/billing/subscriptions/me")).data,
    subscribe: async (body: { planId: string; provider: "STRIPE_CARD" | "PAYPAL" | "FAWRY" | "INSTAPAY" | "CASH" | "CREDIT_CARD"; customerPhone?: string; payerInstapayId?: string }) =>
      (await api.post("/billing/payments/checkout", body)).data,
    cancel: async () => (await api.post("/billing/subscriptions/cancel")).data,
    invoices: async () => (await api.get<CloudInvoice[]>("/billing/invoices")).data,
    invoice: async (id: string) => (await api.get<CloudInvoice>(`/billing/invoices/${id}`)).data,
    paymentStatus: async (id: string) => (await api.get(`/billing/invoices/${id}/payment-status`)).data,
    paymentMethods: async () => (await api.get("/billing/payment-methods")).data,
    addPaymentMethod: async (body: Record<string, unknown>) => (await api.post("/billing/payment-methods", body)).data,
    removePaymentMethod: async (id: string) => api.delete(`/billing/payment-methods/${id}`),
  },
  credits: {
    balance: async () => (await api.get<{ balance: number }>("/credits/balance")).data.balance,
    transactions: async (limit = 50, offset = 0) =>
      (await api.get<{ transactions: any[] }>("/credits/transactions", { params: { limit, offset } })).data.transactions,
    purchase: async (body: { packSize: "small" | "medium" | "large"; paymentMethod: string }) =>
      (await api.post<{ invoiceId: string; points: number; checkout: any }>("/credits/purchase", body)).data,
    canStartVps: async (billingMode?: string) =>
      (await api.get<{ allowed: boolean; reason?: string }>("/credits/can-start-vps", { params: { billingMode } })).data,
  },
  slaCredits: {
    list: async (limit = 12) =>
      (await api.get<SlaCreditItem[]>("/billing/sla-credits", { params: { limit } })).data,
  },

  admin: {
    stats: async () => (await api.get("/cloud/admin/stats")).data,
    billingStats: async () => (await api.get("/billing/admin/billing/stats")).data,
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
    quota: async (tenantId: string) => (await api.get<TenantQuota>(`/vps/admin/quota/${tenantId}`)).data,
    setQuota: async (tenantId: string, body: { maxCpu?: number; maxRamMb?: number; maxDiskGb?: number; maxVpsCount?: number }) =>
      (await api.patch<TenantQuota>(`/vps/admin/quota/${tenantId}`, body)).data,
    reconcileQuotas: async () => (await api.get<{ reconciled: number }>("/vps/admin/reconcile")).data,
    impersonate: async (id: string) =>
      (await api.post<{ access_token: string; user: { id: string; email: string; name: string; role: string } }>(`/auth/admin/users/${id}/impersonate`)).data,
    reauth: async (body: { password?: string; totpCode?: string }) =>
      (await api.post<{ ok: boolean }>('/auth/reauth', body)).data,
    exitImpersonation: async () =>
      (await api.post<{ ok: boolean }>('/auth/impersonate/exit')).data,
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
    transactions: async () => (await api.get("/billing/admin/transactions")).data,
    transactionsCsvUrl: () => {
      const base = (api.defaults?.baseURL || "").replace(/\/$/, "");
      return `${base}/billing/admin/transactions.csv`;
    },
    refund: async (invoiceId: string, partial?: number) =>
      (await api.post("/billing/admin/billing/refund", { invoiceId, partial })).data,
    confirm: async (invoiceId: string) =>
      (await api.post("/billing/admin/billing/confirm", { invoiceId })).data,
     rejectInvoice: async (invoiceId: string, reason: string) =>
       (await api.post("/billing/admin/billing/reject", { invoiceId, reason })).data,
      broadcast: async (body: { title: string; body: string; severity?: string; audience?: string }) =>
        (await api.post("/cloud/admin/announcements", body)).data,
      announcements: async () => (await api.get("/cloud/admin/announcements")).data,
      // ── Proxmox cluster registry (multi-host) ──
      clusters: {
        list: async () => (await api.get("/clusters")).data as ProxmoxClusterRow[],
        create: async (body: ClusterInput) => (await api.post("/clusters", body)).data as ProxmoxClusterRow,
        update: async (id: string, body: Partial<ClusterInput> & { status?: string }) =>
          (await api.put(`/clusters/${id}`, body)).data as ProxmoxClusterRow,
        remove: async (id: string, opts?: { force?: boolean; confirmName?: string }) =>
          api.delete(`/clusters/${id}${opts?.force ? "?force=true" : ""}`, {
            data: opts?.confirmName ? { confirmName: opts.confirmName } : undefined,
          }),
        disable: async (id: string) => (await api.put(`/clusters/${id}/disable`)).data as ProxmoxClusterRow,
        enable: async (id: string) => (await api.put(`/clusters/${id}/enable`)).data as ProxmoxClusterRow,
        test: async (id: string) =>
          (await api.post(`/clusters/${id}/test`)).data as { ok: boolean; error?: string; errorType?: string; cluster?: ProxmoxClusterRow },
        schedule: async (req: { cpu: number; ramMB: number; diskGB: number }) =>
          (await api.post("/clusters/schedule", req)).data as { chosen: ProxmoxClusterRow | null; candidates?: number; reason?: string },
      },
      // ── K8s pod manager (Prompt 2.7) ──
      pods: {
        namespaces: async () => (await api.get("/pods/namespaces")).data as { namespaces: string[] },
        list: async (namespace: string) => (await api.get(`/pods/namespaces/${encodeURIComponent(namespace)}`)).data as { pods: any[] },
        restart: async (namespace: string, name: string, body: { password?: string; totpCode?: string }) =>
          (await api.post(`/pods/namespaces/${encodeURIComponent(namespace)}/${encodeURIComponent(name)}/restart`, body)).data,
        logs: async (namespace: string, name: string, container?: string, tailLines = 200) =>
          (await api.get(`/pods/namespaces/${encodeURIComponent(namespace)}/${encodeURIComponent(name)}/logs`, { params: { container, tailLines } })).data as { podName: string; namespace: string; logs: string },
      },
      // ── Real-time service health probes (all 13 microservices) ──
      servicesHealth: async () =>
        (await api.get("/monitoring/services/health")).data as ServicesHealthSnapshot,
      servicesHealthCheckNow: async () =>
        (await api.post("/monitoring/services/health/check-now")).data as ServicesHealthSnapshot,
      // ── Maintenance mode ──
      maintenance: {
        get: async () => (await api.get("/platform/maintenance")).data as MaintenanceState,
        set: async (body: { enabled: boolean; message?: string }) =>
          (await api.put("/platform/maintenance", body)).data as MaintenanceState,
      },
      // ── WhatsApp broadcast (Prompt 2.5) ──
      whatsapp: {
        templates: async () => (await api.get<WhatsappTemplate[]>("/crm/whatsapp/broadcast/templates")).data,
        createTemplate: async (body: { name: string; body: string; tenantId?: string }) =>
          (await api.post<WhatsappTemplate>("/crm/whatsapp/broadcast/templates", body)).data,
        updateTemplate: async (id: string, body: { name: string; body: string }) =>
          (await api.put<WhatsappTemplate>(`/crm/whatsapp/broadcast/templates/${id}`, body)).data,
        deleteTemplate: async (id: string) => api.delete(`/crm/whatsapp/broadcast/templates/${id}`),
        broadcasts: async () => (await api.get<WhatsappBroadcast[]>("/crm/whatsapp/broadcast")).data,
        broadcast: async (id: string) => (await api.get<WhatsappBroadcast>(`/crm/whatsapp/broadcast/${id}`)).data,
        recipients: async (id: string) => (await api.get<WhatsappBroadcastRecipient[]>(`/crm/whatsapp/broadcast/${id}/recipients`)).data,
        send: async (body: { templateId: string; segment?: string; recipientPhones?: string[]; tenantId?: string; planId?: string; activeWithinDays?: number; signupAfter?: string; signupBefore?: string }) =>
          (await api.post<WhatsappBroadcast>("/crm/whatsapp/broadcast/send", body)).data,
      },
    },
    crm: {
      leads: async () => (await api.get("/crm/leads")).data,
      createLead: async (body: { name: string; email?: string; phone?: string; source?: string; status?: string }) =>
        (await api.post("/crm/leads", body)).data,
      contacts: async () => (await api.get("/crm/customers")).data,
      createContact: async (body: { name: string; email?: string; phone?: string; company?: string; title?: string; notes?: string }) =>
        (await api.post("/crm/customers", body)).data,
    },
};

export interface ClusterInput {
  name: string;
  host: string;
  port?: number;
  username?: string;
  tokenId?: string;
  tokenSecret?: string;
}
export interface ProxmoxClusterRow {
  id: string;
  name: string;
  host: string;
  port: number;
  username: string;
  tokenId: string | null;
  tokenSecretPreview: string;
  status: string;
  nodeCount: number;
  cpuTotal: number; cpuUsed: number;
  ramTotal: number; ramUsed: number;
  diskTotal: number; diskUsed: number;
  vmCount: number;
  freeCpu: number; freeRamMB: number; freeDiskGB: number;
  createdAt: string; updatedAt: string;
}
export interface ServiceProbe {
  name: string;
  url: string;
  status: "UP" | "DEGRADED" | "DOWN";
  responseTimeMs: number | null;
  error?: string;
  lastChecked: string;
}
export interface ServicesHealthSnapshot {
  services: ServiceProbe[];
  healthPercent: number;
  up: number; down: number; degraded: number;
  checkedAt: string;
}
export interface MaintenanceState {
  enabled: boolean;
  message: string;
  updatedAt: string | null;
}


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
  status: async () => (await api.get<{ enabled: boolean; recoveryCodesRemaining: number }>("/auth/two-factor/status")).data,
  enable: async () => (await api.post<{ otpauthUrl: string; base32: string; qrCode: string }>("/auth/two-factor/enable")).data,
  verify: async (token: string) => (await api.post<{ enabled: boolean; recoveryCodes: string[] }>("/auth/two-factor/verify", { token })).data,
  regenerate: async () => (await api.post<{ recoveryCodes: string[] }>("/auth/two-factor/recovery-codes/regenerate")).data,
  disable: async (body: { password?: string; recoveryCode?: string }) =>
    (await api.post("/auth/two-factor/disable", body)).data,
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
  deleteAccountGdpr: async (password: string) =>
    (await api.post<{ ok: boolean }>("/auth/me/delete-account", { password })).data,
  acceptTos: async (body: { tosVersion: string; privacyVersion: string }) =>
    (await api.post("/auth/me/tos-accept", body)).data,
  getNotificationPrefs: async () =>
    (await api.get<NotificationPrefs>("/cloud/account/notifications/preferences")).data,
  updateNotificationPrefs: async (prefs: Partial<NotificationPrefs>) =>
    (await api.put<NotificationPrefs>("/cloud/account/notifications/preferences", prefs)).data,
  // ── Onboarding (Prompt 2.9) ──
  getOnboarding: async () => (await api.get<{ onboardingCompleted: boolean; onboardingSkipped: boolean }>("/auth/me/onboarding")).data,
  completeOnboarding: async () =>
    (await api.patch<{ onboardingCompleted: boolean }>("/auth/me/onboarding", { completed: true })).data,
  skipOnboarding: async () =>
    (await api.patch<{ onboardingSkipped: boolean }>("/auth/me/onboarding", { skipped: true })).data,
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
  // Prompt 5.2: new endpoints
  setSchedule: async (vpsId: string, dto: { frequency: string; retention: number; hour?: number; dayOfWeek?: number; dayOfMonth?: number }): Promise<BackupSchedule> =>
    (await api.post(`/vps/${vpsId}/backup-schedule`, dto)).data,
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
  verify: async (id: string, dnsValue?: string) =>
    (await api.post(`/cloud/domains/${id}/verify`, dnsValue ? { dnsValue } : undefined)).data,
  ssl: async (id: string) => (await api.post(`/cloud/domains/${id}/ssl`)).data,
  remove: async (id: string) => (await api.delete(`/cloud/domains/${id}`)).data,
  records: async (id: string): Promise<DNSRecord[]> => (await api.get(`/cloud/domains/${id}/dns`)).data,
  addRecord: async (id: string, data: Partial<DNSRecord>): Promise<DNSRecord> =>
    (await api.post(`/cloud/domains/${id}/dns`, data)).data,
  removeRecord: async (id: string) => (await api.delete(`/cloud/dns/${id}`)).data,
  // Prompt 5.3: new endpoints
  listForVps: async (vpsId: string): Promise<any[]> =>
    (await api.get(`/vps/${vpsId}/domains`)).data,
  addDomain: async (vpsId: string, domain: string): Promise<any> =>
    (await api.post(`/vps/${vpsId}/domains`, { domain })).data,
  verifyDomain: async (domainId: string, dnsValue: string): Promise<any> =>
    (await api.post(`/vps/domains/${domainId}/verify`, { dnsValue })).data,
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
  // Prompt 5.4: new endpoints
  myUsage: async (days = 30): Promise<ApiUsageSummary> =>
    (await api.get<ApiUsageSummary>(`/analytics/usage/me?days=${days}`)).data,
  tenantUsage: async (tenantId: string, days = 30): Promise<ApiUsageSummary> =>
    (await api.get<ApiUsageSummary>(`/analytics/usage/tenant/${tenantId}?days=${days}`)).data,
  allTenants: async (days = 30): Promise<TenantUsageRow[]> =>
    (await api.get<TenantUsageRow[]>(`/analytics/usage/tenants?days=${days}`)).data,
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
export interface IPRateStat { ip: string; requests: number; blocked: boolean; country: string | null; tenantId: number | null }
export interface TenantRateStat { tenantId: string; requestsPerMin: number }
export const cloudRateLimits = {
  current: async (): Promise<{ topIPs: IPRateStat[]; tenantRates: TenantRateStat[]; blockedIPs: string[]; requestsPerMinute: number }> =>
    (await api.get('/monitoring/rate-limits')).data,
  block: async (ip: string, reason?: string, isPermanent = false, expiresAt?: string) =>
    (await api.post('/monitoring/rate-limits/block', { ip, reason, isPermanent, expiresAt })).data,
  unblock: async (ip: string) =>
    (await api.delete(`/monitoring/rate-limits/block/${encodeURIComponent(ip)}`)).data,
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
  resend: async (webhookId: string, deliveryId: string): Promise<WebhookDelivery> =>
    (await api.post(`/cloud/webhooks/${webhookId}/deliveries/${deliveryId}/resend`)).data,
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

// ============ Abuse / AUP (Prompt 0.17) ============

export interface AbuseReport {
  id: string;
  reporterName?: string;
  reporterEmail?: string;
  targetIp?: string;
  targetDomain?: string;
  targetVpsId?: string;
  category: string;
  reason: string;
  evidence?: string;
  status: string;
  source: string;
  detectedSignature?: string;
  createdAt: string;
}

export interface PtrRequest {
  id: string;
  vpsId: string;
  ipAddress?: string;
  hostname: string;
  status: string;
  adminNote?: string;
  createdAt: string;
}

export const cloudAbuse = {
  // Public, unauthenticated third-party intake
  report: async (body: {
    reporterName?: string;
    reporterEmail?: string;
    targetIp?: string;
    targetDomain?: string;
    targetVpsId?: string;
    category?: string;
    reason: string;
    evidence?: string;
  }) => (await api.post("/monitoring/abuse/report", body)).data,

  // SUPER_ADMIN review
  reports: async (status?: string) =>
    (await api.get<AbuseReport[]>(`/monitoring/abuse/reports${status ? `?status=${status}` : ""}`)).data,
  resolve: async (id: string, status: string) =>
    (await api.put(`/monitoring/abuse/reports/${id}`, { status })).data,
  detect: async (windowMinutes?: number) =>
    (await api.post("/monitoring/abuse/detect", { windowMinutes })).data,
  suspendNetwork: async (vpsId: string, reason?: string) =>
    (await api.post(`/monitoring/abuse/vps/${vpsId}/suspend-network`, { reason })).data,

  // Reverse DNS (PTR) requests
  ptrRequests: async (status?: string) =>
    (await api.get<PtrRequest[]>(`/monitoring/abuse/ptr${status ? `?status=${status}` : ""}`)).data,
  requestPtr: async (body: { vpsId: string; hostname: string; ipAddress?: string }) =>
    (await api.post("/monitoring/abuse/ptr", body)).data,
  reviewPtr: async (id: string, status: string, adminNote?: string) =>
    (await api.put(`/monitoring/abuse/ptr/${id}`, { status, adminNote })).data,
};

export interface TeamMember {
  userId: string;
  email: string;
  name: string;
  role: string;
  isActive: boolean;
  joinedAt: string;
}

export interface BusinessSettings {
  id: string;
  name: string;
  subdomain: string;
  settings: Record<string, any>;
}

export interface ApiKeyItem {
  id: string;
  name: string;
  keyPrefix: string;
  lastUsedAt: string | null;
  expiresAt: string | null;
  createdAt: string;
}

export interface ApiKeyCreated extends ApiKeyItem {
  key: string;
}

export const cloudBusiness = {
  inviteTeamMember: async (email: string) =>
    (await api.post('/auth/admin/team/invite', { email })).data,
  listTeam: async (): Promise<TeamMember[]> =>
    (await api.get('/auth/admin/team')).data,
  deactivateMember: async (userId: string) =>
    (await api.post(`/auth/admin/team/${userId}/deactivate`)).data,
  getSettings: async (): Promise<BusinessSettings> =>
    (await api.get('/auth/admin/settings/business')).data,
  updateSettings: async (settings: Record<string, any>) =>
    (await api.patch('/auth/admin/settings/business', settings)).data,
};

export const cloudApiKeys = {
  list: async (): Promise<ApiKeyItem[]> =>
    (await api.get('/auth/admin/api-keys')).data,
  create: async (name: string): Promise<ApiKeyCreated> =>
    (await api.post('/auth/admin/api-keys', { name })).data,
  remove: async (id: string) =>
    (await api.delete(`/auth/admin/api-keys/${id}`)).data,
};


export interface TenantApiKeyItem {
  id: string;
  name: string;
  keyPrefix: string;
  lastUsedAt: string | null;
  expiresAt: string | null;
  createdAt: string;
  scopes: string[];
}

export interface TenantApiKeyCreated extends TenantApiKeyItem {
  key: string;
}

export const tenantApiKeys = {
  list: async (): Promise<TenantApiKeyItem[]> =>
    (await api.get('/auth/api-keys')).data,
  create: async (name: string, scopes: string[] = []): Promise<TenantApiKeyCreated> =>
    (await api.post('/auth/api-keys', { name, scopes })).data,
  regenerate: async (id: string) =>
    (await api.post(`/auth/api-keys/${id}/regenerate`)).data,
  remove: async (id: string) =>
    (await api.delete(`/auth/api-keys/${id}`)).data,
};

export type VpsRecommendation = {
  id: string;
  vpsId: string;
  type: string;
  message: string;
  severity: string;
  currentValue?: number;
  suggestedValue?: number;
  unit?: string;
  acknowledged: boolean;
  createdAt: string;
};

export type ApiUsageSummary = {
  totalCalls: number;
  avgResponseMs: number;
  topEndpoints: Array<{ endpoint: string; count: number; avgMs: number }>;
};

export type TenantUsageRow = {
  tenantId: string;
  totalCalls: number;
  errors: number;
  avgMs: number;
};

export const cloudMonitoring = {
  recommendations: {
    forVps: async (vpsId: string): Promise<VpsRecommendation[]> =>
      (await api.get<VpsRecommendation[]>(`/monitoring/recommendations/vps/${vpsId}`)).data,
    listAll: async (): Promise<VpsRecommendation[]> =>
      (await api.get<VpsRecommendation[]>('/monitoring/recommendations')).data,
    acknowledge: async (id: string) =>
      (await api.post(`/monitoring/recommendations/${id}/acknowledge`)).data,
  },
};

export type AppCatalogItem = { id: string; name: string; description: string; icon: string; category: string };
export type InstalledApp = { id: string; name: string; status: string; installedAt: string };

export type AppStatusResponse = { appId: string; status: string; message?: string };

export const cloudApps = {
  catalog: async (): Promise<AppCatalogItem[]> =>
    (await api.get<AppCatalogItem[]>('/vps/apps/catalog')).data,
  status: async (vpsId: string, appId: string): Promise<AppStatusResponse> =>
    (await api.get<AppStatusResponse>(`/vps/${vpsId}/apps/${appId}/status`)).data,
  install: async (vpsId: string, appId: string) =>
    (await api.post(`/vps/${vpsId}/apps/${appId}/install`)).data,
  uninstall: async (vpsId: string, appId: string) =>
    (await api.delete(`/vps/${vpsId}/apps/${appId}`)).data,
};

export const cloudAgent = {
  dashboard: async () => (await api.get('/agent/dashboard')).data,
  conversations: async () => (await api.get('/agent/conversations')).data,
  leads: async () => (await api.get('/agent/leads')).data,
  reply: async (conversationId: string, content: string) =>
    (await api.post(`/agent/conversations/${conversationId}/reply`, { content })).data,
  updateLeadStatus: async (leadId: string, status: string) =>
    (await api.patch(`/agent/leads/${leadId}/status`, { status })).data,
};

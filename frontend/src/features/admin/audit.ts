import axios from "axios";
import { API_BASE_URL } from "@/lib/constants";

const auditApi = axios.create({
  baseURL:
    typeof window !== "undefined"
      ? window.location.hostname.includes("voidcloud.cc.cd")
        ? `${API_BASE_URL}`
        : "http://localhost:3011/api/v1"
      : process.env.NEXT_PUBLIC_AUDIT_API_URL ?? API_BASE_URL,
  headers: { "Content-Type": "application/json" },
});

auditApi.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
      const token = localStorage.getItem("voidcloud_token");
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

auditApi.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error.response?.status === 401 && typeof window !== "undefined") {
      localStorage.removeItem("voidcloud_token");
      if (window.location.pathname !== "/voidcloud/login") window.location.href = "/voidcloud/login";
    }
    return Promise.reject(error);
  }
);

export interface AuditLogEntry {
  id: string;
  action: string;
  userId?: string;
  userEmail?: string;
  resource?: string;
  details?: Record<string, unknown>;
  ipAddress?: string;
  status?: string;
  createdAt: string;
}

export const auditApiClient = {
  list: async (params?: {
    userId?: string;
    action?: string;
    resource?: string;
    limit?: number;
    offset?: number;
  }): Promise<AuditLogEntry[]> => {
    const { data } = await auditApi.get<AuditLogEntry[]>("/audit/logs", { params });
    return data;
  },

  userLogs: async (userId: string, limit = 50): Promise<AuditLogEntry[]> => {
    const { data } = await auditApi.get<AuditLogEntry[]>(`/audit/logs/user/${encodeURIComponent(userId)}`, {
      params: { limit },
    });
    return data;
  },

  create: async (body: {
    action: string;
    userId?: string;
    userEmail?: string;
    resource?: string;
    details?: unknown;
  }): Promise<AuditLogEntry> => {
    const { data } = await auditApi.post<AuditLogEntry>("/audit/logs", body);
    return data;
  },
};

import api from "@/lib/api";

export interface SecretEntry {
  id: string;
  name: string;
  type: string;
  namespace?: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
  expiresAt?: string | null;
}

export interface RevealedSecret {
  id: string;
  name: string;
  value: string;
}

export interface VulnerabilityScan {
  id: string;
  target: string;
  targetType: "image" | "deployment";
  status: "pending" | "running" | "completed" | "failed";
  severity?: Record<"critical" | "high" | "medium" | "low" | "unknown", number>;
  findings?: Array<Record<string, unknown>>;
  startedAt: string;
  completedAt?: string;
}

export interface VulnerabilityStats {
  totalScans: number;
  open: number;
  bySeverity: Record<string, number>;
}

export const securityApi = {
  // Secrets
  listSecrets: async (namespace?: string) => {
    const { data } = await api.get<{ secrets: SecretEntry[] }>(
      `/security/secrets${namespace ? `?namespace=${namespace}` : ""}`,
    );
    return data.secrets ?? [];
  },
  createSecret: async (payload: { name: string; value: string; type?: string; namespace?: string; description?: string }) => {
    const { data } = await api.post<{ secret: SecretEntry }>("/security/secrets", payload);
    return data.secret;
  },
  deleteSecret: async (id: string) => {
    const { data } = await api.delete<{ success: boolean }>(`/security/secrets/${id}`);
    return data;
  },
  revealSecret: async (id: string) => {
    const { data } = await api.get<RevealedSecret>(`/security/secrets/${id}/reveal`);
    return data;
  },

  // Vulnerability scans
  scanImage: async (payload: { image: string; tag?: string }) => {
    const { data } = await api.post<{ scan: VulnerabilityScan }>("/security/vulnerabilities/scan/image", payload);
    return data.scan;
  },
  scanDeployment: async (payload: { namespace: string; name: string }) => {
    const { data } = await api.post<{ scan: VulnerabilityScan }>("/security/vulnerabilities/scan/deployment", payload);
    return data.scan;
  },
  getScan: async (id: string) => {
    const { data } = await api.get<{ scan: VulnerabilityScan }>(`/security/vulnerabilities/scan/${id}`);
    return data.scan;
  },
  getScanHistory: async (limit = 50) => {
    const { data } = await api.get<{ scans: VulnerabilityScan[] }>(`/security/vulnerabilities/history?limit=${limit}`);
    return data.scans ?? [];
  },
  getVulnerabilityStats: async () => {
    const { data } = await api.get<VulnerabilityStats>("/security/vulnerabilities/stats");
    return data;
  },
};

import api from "./api";

export type UserRole = "USER" | "ADMIN" | "AGENT";
export type PasswordMode = "manual" | "random" | "force_change";

export interface PortalUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  isActive: boolean;
  mustChangePassword: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface CreateUserPayload {
  email: string;
  name: string;
  role: UserRole;
  passwordMode: PasswordMode;
  password?: string;
  isActive?: boolean;
}

export interface CreateUserResponse {
  success: boolean;
  user: PortalUser;
  temporaryPassword?: string;
  mustChangePassword: boolean;
}

export const settingsApi = {
  getUsers: async () => {
    const { data } = await api.get<{ users: PortalUser[] }>("/settings/users");
    return data.users;
  },
  createUser: async (payload: CreateUserPayload) => {
    const { data } = await api.post<CreateUserResponse>("/settings/users", payload);
    return data;
  },
  updateUser: async (id: string, payload: Partial<Pick<PortalUser, "email" | "name" | "role" | "isActive">>) => {
    const { data } = await api.put<{ success: boolean; user: PortalUser }>(`/settings/users/${id}`, payload);
    return data;
  },
  deleteUser: async (id: string) => {
    const { data } = await api.delete<{ success: boolean }>(`/settings/users/${id}`);
    return data;
  },
  resetPassword: async (id: string, payload: { passwordMode: PasswordMode; password?: string }) => {
    const { data } = await api.post<{ success: boolean; temporaryPassword?: string; mustChangePassword: boolean }>(
      `/settings/users/${id}/reset-password`,
      payload,
    );
    return data;
  },
  changePassword: async (payload: { currentPassword: string; newPassword: string }) => {
    const { data } = await api.post<{ success: boolean; message: string }>("/settings/users/change-password", payload);
    return data;
  },
  getAuditLogs: async (limit = 50) => {
    const { data } = await api.get<{ logs: Array<Record<string, unknown>> }>(`/settings/audit-logs?limit=${limit}`);
    return data.logs;
  },
  getApiKeys: async (userId?: string) => {
    const { data } = await api.get<{ apiKeys: Array<Record<string, unknown>> }>(
      `/settings/api-keys${userId ? `?userId=${userId}` : ""}`,
    );
    return data.apiKeys;
  },
  generateApiKey: async (payload: { name: string; userId: string }) => {
    const { data } = await api.post<{ success: boolean; apiKey: Record<string, unknown> }>("/settings/api-keys", payload);
    return data;
  },
  getRoles: async () => {
    const { data } = await api.get<{ roles: Array<Record<string, unknown>> }>("/settings/roles");
    return data.roles ?? [];
  },
  createRole: async (payload: { name: string; description: string; permissions: string[] }) => {
    const { data } = await api.post("/settings/roles", payload);
    return data;
  },
};

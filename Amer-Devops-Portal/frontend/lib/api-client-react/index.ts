/**
 * Local implementation of @workspace/api-client-react
 * Provides typed hooks wrapping @tanstack/react-query for all VoidCloud API endpoints.
 * This module is aliased via webpack in next.config.js and tsconfig paths.
 *
 * All route paths are relative to NEXT_PUBLIC_API_URL (e.g. /api/v1 or /api).
 * Backend services use the global prefix "api/v1" per main.ts.
 */
import { useQuery, useMutation } from "@tanstack/react-query";

const getToken = (): string | null =>
  typeof window !== "undefined" ? localStorage.getItem("voidcloud_token") : null;

const apiBase = (): string => process.env.NEXT_PUBLIC_API_URL || "/api";

const authHeaders = (): Record<string, string> => ({
  "Content-Type": "application/json",
  ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {}),
});

async function apiFetch(path: string, options?: RequestInit) {
  const res = await fetch(`${apiBase()}${path}`, {
    headers: authHeaders(),
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(err.message || err.error || res.statusText);
  }
  return res.json();
}

// ─── Shared Types ─────────────────────────────────────────────────────────────

export interface User {
  id: string;
  email: string;
  name?: string;
  role: "SUPER_ADMIN" | "ADMIN" | "AGENT" | "USER" | string;
  tenantId?: string;
  status?: string;
  createdAt?: string;
}

export interface AuthResponse {
  token?: string;
  access_token?: string;
  user?: User;
  requires2FA?: boolean;
  userId?: string;
}

// ─── Auth Hooks ───────────────────────────────────────────────────────────────

export function useLogin() {
  return useMutation({
    mutationFn: async ({
      data,
    }: {
      data: { email: string; password: string; twoFactorToken?: string };
    }) => {
      const res = await fetch(`${apiBase()}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || json.error || "Login failed");
      return json as AuthResponse;
    },
  });
}

export function useRegister() {
  return useMutation({
    mutationFn: async ({
      data,
    }: {
      data: { email: string; password: string; name?: string; tenantId?: string };
    }) => {
      const res = await fetch(`${apiBase()}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || json.error || "Registration failed");
      return json as AuthResponse;
    },
  });
}

// ─── Dashboard Hooks ──────────────────────────────────────────────────────────
// Note: The backend exposes per-service endpoints; dashboard hooks aggregate
// from the analytics & monitoring services rather than a dedicated route.

export function useGetAdminDashboard(opts?: { query?: { refetchInterval?: number } }) {
  return useQuery({
    queryKey: ["admin-dashboard"],
    queryFn: () => apiFetch("/analytics/usage"),
    refetchInterval: opts?.query?.refetchInterval,
  });
}

export function useGetBusinessDashboard(opts?: { query?: { refetchInterval?: number } }) {
  return useQuery({
    queryKey: ["business-dashboard"],
    queryFn: () => apiFetch("/analytics/usage"),
    refetchInterval: opts?.query?.refetchInterval,
  });
}

export function useGetAgentDashboard(opts?: { query?: { refetchInterval?: number } }) {
  return useQuery({
    queryKey: ["agent-dashboard"],
    queryFn: () => apiFetch("/crm/leads"),
    refetchInterval: opts?.query?.refetchInterval,
  });
}

export function useGetUserDashboard(opts?: { query?: { refetchInterval?: number } }) {
  return useQuery({
    queryKey: ["user-dashboard"],
    queryFn: () => apiFetch("/vps"),
    refetchInterval: opts?.query?.refetchInterval,
  });
}

// ─── Cluster Hooks ────────────────────────────────────────────────────────────

export function useListClusters() {
  return useQuery({
    queryKey: ["clusters"],
    queryFn: () => apiFetch("/clusters"),
  });
}

// ─── Monitoring Hooks ─────────────────────────────────────────────────────────

export function useGetServiceHealth(opts?: { query?: { refetchInterval?: number } }) {
  return useQuery({
    queryKey: ["service-health"],
    queryFn: () => apiFetch("/monitoring/health"),   // GET /api/v1/monitoring/health
    refetchInterval: opts?.query?.refetchInterval,
  });
}

export function useGetPlatformMetrics(opts?: { query?: { refetchInterval?: number } }) {
  return useQuery({
    queryKey: ["platform-metrics"],
    queryFn: () => apiFetch("/monitoring/metrics"),  // GET /api/v1/monitoring/metrics
    refetchInterval: opts?.query?.refetchInterval,
  });
}

export function useListAlerts() {
  return useQuery({
    queryKey: ["alerts"],
    queryFn: () => apiFetch("/monitoring/alerts"),   // GET /api/v1/monitoring/alerts
  });
}

// ─── User Hooks ───────────────────────────────────────────────────────────────

export function useListUsers() {
  return useQuery({
    queryKey: ["users"],
    queryFn: () => apiFetch("/users"),               // GET /api/v1/users
  });
}

// ─── Tenant Hooks ─────────────────────────────────────────────────────────────

export function useListTenants() {
  return useQuery({
    queryKey: ["tenants"],
    queryFn: () => apiFetch("/tenants"),             // GET /api/v1/tenants
  });
}

// ─── VPS Hooks ────────────────────────────────────────────────────────────────

export function useListVPS() {
  return useQuery({
    queryKey: ["vps"],
    queryFn: () => apiFetch("/vps"),                 // GET /api/v1/vps
  });
}

// ─── WhatsApp / CRM Hooks ─────────────────────────────────────────────────────

export function useListConversations() {
  return useQuery({
    queryKey: ["conversations"],
    queryFn: () => apiFetch("/whatsapp/conversations"), // GET /api/v1/whatsapp/conversations
  });
}

export function useListContacts() {
  return useQuery({
    queryKey: ["contacts"],
    queryFn: () => apiFetch("/crm/customers"),       // GET /api/v1/crm/customers
  });
}

export function useListLeads() {
  return useQuery({
    queryKey: ["leads"],
    queryFn: () => apiFetch("/crm/leads"),           // GET /api/v1/crm/leads
  });
}

// ─── Billing Hooks ────────────────────────────────────────────────────────────

export function useListInvoices() {
  return useQuery({
    queryKey: ["invoices"],
    queryFn: () => apiFetch("/billing/invoices"),    // GET /api/v1/billing/invoices
  });
}

export function useListSubscriptions() {
  return useQuery({
    queryKey: ["subscriptions"],
    queryFn: () => apiFetch("/billing/subscriptions"), // GET /api/v1/billing/subscriptions
  });
}

export function useListPlans() {
  return useQuery({
    queryKey: ["plans"],
    queryFn: () => apiFetch("/billing/plans"),       // GET /api/v1/billing/plans
  });
}

export function useGetRevenueDashboard(opts?: { query?: { refetchInterval?: number } }) {
  return useQuery({
    queryKey: ["revenue-dashboard"],
    queryFn: () => apiFetch("/analytics/revenue"),   // GET /api/v1/analytics/revenue
    refetchInterval: opts?.query?.refetchInterval,
  });
}

// ─── Settings / Maintenance Hooks ─────────────────────────────────────────────

export function useGetMaintenanceMode() {
  return useQuery({
    queryKey: ["maintenance-mode"],
    queryFn: () => apiFetch("/maintenance"),
  });
}

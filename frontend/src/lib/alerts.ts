import api from './api';

export interface AlertRule {
  id: string;
  name: string;
  type: string;
  severity: string;
  enabled: boolean;
  threshold: number;
  duration: number;
  labels: Record<string, string>;
  createdAt: string;
  updatedAt: string;
}

export interface Alert {
  id: string;
  ruleId: string;
  ruleName: string;
  type: string;
  severity: string;
  status: string;
  message: string;
  labels: Record<string, string>;
  firedAt: string;
  acknowledgedAt: string | null;
  resolvedAt: string | null;
  remediationSteps?: string[];
}

export interface AlertStats {
  total: number;
  active: number;
  acknowledged: number;
  resolved: number;
  bySeverity: Record<string, number>;
  byType: Record<string, number>;
}

export const alertsApi = {
  // Alert Rules
  getAlertRules: () => api.get<AlertRule[]>('/alerts/rules'),
  createAlertRule: (data: {
    name: string;
    type: string;
    severity: string;
    threshold: number;
    duration: number;
    labels?: Record<string, string>;
  }) => api.post<AlertRule>('/alerts/rules', data),
  updateAlertRule: (id: string, data: Partial<AlertRule>) => api.put<AlertRule>(`/alerts/rules/${id}`, data),
  deleteAlertRule: (id: string) => api.delete<{ success: boolean }>(`/alerts/rules/${id}`),

  // Alerts
  getActiveAlerts: () => api.get<Alert[]>('/alerts/active'),
  getAllAlerts: () => api.get<Alert[]>('/alerts/all'),
  acknowledgeAlert: (id: string) => api.post<Alert>(`/alerts/${id}/acknowledge`, {}),
  resolveAlert: (id: string) => api.post<Alert>(`/alerts/${id}/resolve`, {}),

  // Stats
  getAlertStats: () => api.get<AlertStats>('/alerts/stats'),
};

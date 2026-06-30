import api from './api';

export interface StatsData {
  activePipelines: number;
  deploymentsToday: number;
  runningPods: number;
  activeAlerts: number;
  runningNamespaces: number;
}

export interface SystemStatusData {
  apiStatus: string;
  databaseStatus: string;
  uptime: number;
  version: string;
  region: string;
  kubernetesConnected: boolean;
  lastCheck: string;
  timestamp: string;
}

export interface RunningNamespace {
  namespace: string;
  podCount: number;
  status: 'healthy' | 'warning' | 'critical';
}

export interface NodeMetrics {
  name: string;
  role: 'master' | 'worker';
  cpu: {
    usage: number;
    capacity: number;
    usagePercent: number;
  };
  memory: {
    usage: number;
    capacity: number;
    usagePercent: number;
  };
  disk: {
    usage: number;
    capacity: number;
    usagePercent: number;
  };
  pods: number;
  source: {
    cpu: string;
    memory: string;
    disk: string;
  };
}

export interface ClusterHealthData {
  nodes: NodeMetrics[];
  totalPods: number;
}

export interface RecentDeployment {
  name: string;
  namespace: string;
  replicas: number;
  readyReplicas: number;
  image: string;
  createdAt: string;
}

export interface FailedPod {
  name: string;
  namespace: string;
  phase: string;
  restartCount: number;
  reason?: string;
  message?: string;
  createdAt: string;
}

export interface ActivityItem {
  type: string;
  title: string;
  namespace?: string;
  timestamp: string;
}

export interface PodStatusItem {
  name: string;
  namespace: string;
  status: string;
  restarts: number;
  age: string;
}

export interface ServiceStatusItem {
  service: string;
  namespace: string;
  status: 'healthy' | 'warning' | 'critical';
  responseTimeMs: number | null;
  uptimePercent: number | null;
  lastCheck: string;
}

export interface ServiceHealthItem {
  name: string;
  status: string;
  uptime: string;
  lastIssue: string;
}

export const statsApi = {
  getAllStats: () => api.get<StatsData>('/dashboard/metrics'),
  getPublicStats: () => api.get<StatsData>('/stats'),
  getPipelines: () => api.get<{ count: number }>('/stats/pipelines'),
  getDeployments: () => api.get<{ count: number }>('/stats/deployments'),
  getPods: () => api.get<{ pods: PodStatusItem[] }>('/pods'),
  getAlerts: () => api.get<{ count: number }>('/stats/alerts'),
  getNamespaces: () => api.get<{ namespaces: RunningNamespace[] }>('/namespaces/running'),
  getSystemStatus: () => api.get<SystemStatusData>('/system/status'),
  getServiceStatus: () => api.get<{ services: ServiceStatusItem[] }>('/services/status'),
  getServiceHealth: () => api.get<{ services: ServiceHealthItem[] }>('/stats/service-status'),
  getClusterHealth: () => api.get<ClusterHealthData>('/stats/cluster-health'),
  getRecentDeployments: (limit?: number) => api.get<{ deployments: RecentDeployment[] }>(`/stats/recent-deployments?limit=${limit || 5}`),
  getFailedPods: () => api.get<{ failedPods: FailedPod[] }>('/stats/failed-pods'),
  getRecentActivity: () => api.get<{ activities: ActivityItem[] }>('/activity/recent'),
};

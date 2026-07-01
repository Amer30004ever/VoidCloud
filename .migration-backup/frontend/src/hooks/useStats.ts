import { useQuery } from '@tanstack/react-query';
import {
  statsApi,
  StatsData,
  ClusterHealthData,
  RecentDeployment,
  FailedPod,
  RunningNamespace,
  SystemStatusData,
  ActivityItem,
  PodStatusItem,
  ServiceStatusItem,
  ServiceHealthItem,
} from '@/lib/stats';

export function useStats() {
  return useQuery<StatsData>({
    queryKey: ['stats'],
    queryFn: async () => {
      const response = await statsApi.getAllStats();
      return response.data;
    },
    refetchInterval: 30000, // Auto-refresh every 30 seconds
    retry: 2,
  });
}

export function usePublicStats() {
  return useQuery<StatsData>({
    queryKey: ['public-stats'],
    queryFn: async () => {
      const response = await statsApi.getPublicStats();
      return response.data;
    },
    refetchInterval: 30000,
    retry: 2,
  });
}

export function useClusterHealth() {
  return useQuery<ClusterHealthData>({
    queryKey: ['cluster-health'],
    queryFn: async () => {
      const response = await statsApi.getClusterHealth();
      return response.data;
    },
    refetchInterval: 30000,
    retry: 2,
  });
}

export function useRecentDeployments(limit?: number) {
  return useQuery<{ deployments: RecentDeployment[] }>({
    queryKey: ['recent-deployments', limit],
    queryFn: async () => {
      const response = await statsApi.getRecentDeployments(limit);
      return response.data;
    },
    refetchInterval: 60000,
    retry: 2,
  });
}

export function useFailedPods() {
  return useQuery<{ failedPods: FailedPod[] }>({
    queryKey: ['failed-pods'],
    queryFn: async () => {
      const response = await statsApi.getFailedPods();
      return response.data;
    },
    refetchInterval: 30000,
    retry: 2,
  });
}

export function useSystemStatus() {
  return useQuery<SystemStatusData>({
    queryKey: ['system-status'],
    queryFn: async () => {
      const response = await statsApi.getSystemStatus();
      return response.data;
    },
    refetchInterval: 30000,
    retry: 2,
  });
}

export function useRunningNamespaces() {
  return useQuery<{ namespaces: RunningNamespace[] }>({
    queryKey: ['running-namespaces'],
    queryFn: async () => {
      const response = await statsApi.getNamespaces();
      return response.data;
    },
    refetchInterval: 30000,
    retry: 2,
  });
}

export function useRecentActivity() {
  return useQuery<{ activities: ActivityItem[] }>({
    queryKey: ['recent-activity'],
    queryFn: async () => {
      const response = await statsApi.getRecentActivity();
      return response.data;
    },
    refetchInterval: 30000,
    retry: 2,
  });
}

export function usePodStatus() {
  return useQuery<{ pods: PodStatusItem[] }>({
    queryKey: ['pod-status'],
    queryFn: async () => {
      const response = await statsApi.getPods();
      return response.data;
    },
    refetchInterval: 10000,
    retry: 2,
  });
}

export function useServiceStatus() {
  return useQuery<{ services: ServiceStatusItem[] }>({
    queryKey: ['service-status'],
    queryFn: async () => {
      const response = await statsApi.getServiceStatus();
      return response.data;
    },
    refetchInterval: 5000,
    retry: 2,
  });
}

export function useServiceHealth() {
  return useQuery<{ services: ServiceHealthItem[] }>({
    queryKey: ['service-health'],
    queryFn: async () => {
      const response = await statsApi.getServiceHealth();
      return response.data;
    },
    refetchInterval: 30000,
    retry: 2,
  });
}

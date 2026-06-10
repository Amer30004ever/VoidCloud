import api from './api';

export interface PodLogResponse {
  podName: string;
  namespace: string;
  logs: string;
}

export interface ContainerLogResponse {
  podName: string;
  namespace: string;
  containerName: string;
  logs: string;
}

export interface CrashLogResponse {
  podName: string;
  namespace: string;
  crashLogs: string | null;
  available: boolean;
}

export interface FailedPodLog {
  name: string;
  namespace: string;
  phase: string;
  restartCount: number;
  lastState?: Record<string, unknown>;
  logs?: string;
  error?: string;
}

export const logsApi = {
  // Pod logs
  getPodLogs: (namespace: string, podName: string, params?: {
    previous?: boolean;
    tailLines?: number;
    timestamps?: boolean;
    sinceSeconds?: number;
  }) => {
    const queryParams = new URLSearchParams();
    if (params?.previous !== undefined) queryParams.append('previous', String(params.previous));
    if (params?.tailLines) queryParams.append('tailLines', String(params.tailLines));
    if (params?.timestamps !== undefined) queryParams.append('timestamps', String(params.timestamps));
    if (params?.sinceSeconds) queryParams.append('sinceSeconds', String(params.sinceSeconds));
    
    return api.get<PodLogResponse>(`/logs/pods/${namespace}/${podName}${queryParams.toString() ? `?${queryParams.toString()}` : ''}`);
  },

  // Container logs
  getPodContainers: (namespace: string, podName: string) =>
    api.get<{ podName: string; namespace: string; containers: string[] }>(`/logs/pods/${namespace}/${podName}/containers`),
  
  getContainerLogs: (namespace: string, podName: string, containerName: string, params?: {
    tailLines?: number;
    timestamps?: boolean;
  }) => {
    const queryParams = new URLSearchParams();
    if (params?.tailLines) queryParams.append('tailLines', String(params.tailLines));
    if (params?.timestamps !== undefined) queryParams.append('timestamps', String(params.timestamps));
    
    return api.get<ContainerLogResponse>(`/logs/pods/${namespace}/${podName}/containers/${containerName}${queryParams.toString() ? `?${queryParams.toString()}` : ''}`);
  },

  // Crash logs
  getPodCrashLogs: (namespace: string, podName: string) =>
    api.get<CrashLogResponse>(`/logs/pods/${namespace}/${podName}/crash`),

  // Deployment logs (multi-pod tail)
  getDeploymentLogs: (namespace: string, deploymentName: string, params?: {
    tailLines?: number;
    timestamps?: boolean;
  }) => {
    const queryParams = new URLSearchParams();
    if (params?.tailLines) queryParams.append('tailLines', String(params.tailLines));
    if (params?.timestamps !== undefined) queryParams.append('timestamps', String(params.timestamps));
    
    return api.get<{ deploymentName: string; namespace: string; pods: Record<string, string> }>(`/logs/deployments/${namespace}/${deploymentName}${queryParams.toString() ? `?${queryParams.toString()}` : ''}`);
  },

  // Search logs
  searchLogs: (logs: string, pattern: string, caseSensitive?: boolean) =>
    api.get<{ pattern: string; caseSensitive: boolean; matches: number; results: string[] }>(`/logs/search?logs=${encodeURIComponent(logs)}&pattern=${encodeURIComponent(pattern)}&caseSensitive=${caseSensitive || false}`),

  // Failed pods logs
  getFailedPodLogs: (namespace?: string) =>
    api.get<{ count: number; failed: FailedPodLog[] }>(`/logs/failed${namespace ? `?namespace=${namespace}` : ''}`),
};

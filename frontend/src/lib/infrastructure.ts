import api from './api';

export interface Deployment {
  name: string;
  namespace: string;
  replicas: number;
  readyReplicas: number;
  image: string;
  createdAt: string;
  labels: Record<string, string>;
}

export interface Service {
  name: string;
  namespace: string;
  type: string;
  clusterIP: string;
  externalIP: string | null;
  ports: Array<{
    name: string;
    port: number;
    targetPort: number;
    protocol: string;
  }>;
  createdAt: string;
  labels: Record<string, string>;
}

export interface ConfigMap {
  name: string;
  namespace: string;
  keys: string[];
  size: number;
  createdAt: string;
  labels: Record<string, string>;
}

export interface Secret {
  name: string;
  namespace: string;
  type: string;
  keys: string[];
  createdAt: string;
  labels: Record<string, string>;
}

export interface DeploymentMutationResponse {
  name: string;
  namespace: string;
  replicas?: number;
  image?: string;
  message: string;
}

export interface DeploymentYamlResponse {
  metadata?: {
    name?: string;
    namespace?: string;
    [key: string]: unknown;
  };
  spec?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface DeploymentUpdateRequest {
  yaml?: DeploymentYamlResponse;
  replicas?: number;
}

export interface ConfigMapUpdateResponse {
  name: string;
  namespace: string;
  keys: string[];
  message: string;
}

export const infrastructureApi = {
  // Namespaces
  getNamespaces: () => api.get<string[]>('/infrastructure/namespaces'),

  // Deployments
  getDeployments: (namespace?: string) => 
    api.get<Deployment[]>(`/infrastructure/deployments${namespace ? `?namespace=${namespace}` : ''}`),
  
  deployFromImage: (data: {
    namespace: string;
    name: string;
    image: string;
    replicas?: number;
    port?: number;
    env?: Record<string, string>;
  }) => api.post<DeploymentMutationResponse>('/infrastructure/deployments', data),
  
  getDeploymentYaml: (namespace: string, name: string) =>
    api.get<DeploymentYamlResponse>(`/infrastructure/deployments/${namespace}/${name}/yaml`),
  
  updateDeployment: (namespace: string, name: string, data: DeploymentUpdateRequest) =>
    api.put<DeploymentMutationResponse>(`/infrastructure/deployments/${namespace}/${name}`, data),
  
  deleteDeployment: (namespace: string, name: string) =>
    api.delete<{ message: string }>(`/infrastructure/deployments/${namespace}/${name}`),

  // Services
  getServices: (namespace?: string) =>
    api.get<Service[]>(`/infrastructure/services${namespace ? `?namespace=${namespace}` : ''}`),

  // ConfigMaps
  getConfigMaps: (namespace?: string) =>
    api.get<ConfigMap[]>(`/infrastructure/configmaps${namespace ? `?namespace=${namespace}` : ''}`),
  
  updateConfigMap: (namespace: string, name: string, data: Record<string, string>) =>
    api.put<ConfigMapUpdateResponse>(`/infrastructure/configmaps/${namespace}/${name}`, data),

  // Secrets
  getSecrets: (namespace?: string) =>
    api.get<Secret[]>(`/infrastructure/secrets${namespace ? `?namespace=${namespace}` : ''}`),
};

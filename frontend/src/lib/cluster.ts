import api from "./api";

export interface ClusterNode {
  name: string;
  status: string;
  roles: string[];
  age: string;
  version: string;
  cpu?: { usage: string; capacity: string };
  memory?: { usage: string; capacity: string };
  conditions?: Array<{ type: string; status: string; reason?: string }>;
}

export interface NodePod {
  name: string;
  namespace: string;
  status: string;
  cpu?: string;
  memory?: string;
}

export interface PersistentVolume {
  name: string;
  capacity: string;
  accessModes: string[];
  reclaimPolicy: string;
  status: string;
  storageClass?: string;
  claim?: string;
}

export interface PersistentVolumeClaim {
  name: string;
  namespace: string;
  status: string;
  volume?: string;
  capacity?: string;
  accessModes: string[];
  storageClass?: string;
}

export interface StorageClass {
  name: string;
  provisioner: string;
  reclaimPolicy: string;
  isDefault: boolean;
}

export interface HelmRelease {
  name: string;
  namespace: string;
  chart: string;
  version: string;
  status: string;
  updated: string;
}

export interface NetworkPolicy {
  name: string;
  namespace: string;
  podSelector: Record<string, string>;
  policyTypes: string[];
}

export interface ResourceQuota {
  name: string;
  namespace: string;
  hard: Record<string, string>;
  used: Record<string, string>;
}

export interface ClusterEvent {
  type: string;
  reason: string;
  message: string;
  involvedObject: string;
  namespace: string;
  count: number;
  firstTimestamp: string;
  lastTimestamp: string;
}

export const clusterApi = {
  // Nodes
  listNodes: async () => {
    const { data } = await api.get<{ nodes: ClusterNode[] }>("/cluster/nodes");
    return data.nodes ?? [];
  },
  getNode: async (name: string) => {
    const { data } = await api.get<{ node: ClusterNode }>(`/cluster/nodes/${name}`);
    return data.node;
  },
  drainNode: async (name: string) => {
    const { data } = await api.post<{ success: boolean }>(`/cluster/nodes/${name}/drain`, {});
    return data;
  },
  uncordonNode: async (name: string) => {
    const { data } = await api.post<{ success: boolean }>(`/cluster/nodes/${name}/uncordon`, {});
    return data;
  },
  listPodsOnNode: async (node: string) => {
    const { data } = await api.get<{ pods: NodePod[] }>(`/cluster/pods/${node}`);
    return data.pods ?? [];
  },

  // Storage
  listPersistentVolumes: async () => {
    const { data } = await api.get<{ items: PersistentVolume[] }>("/cluster/persistent-volumes");
    return data.items ?? [];
  },
  listPersistentVolumeClaims: async (namespace?: string) => {
    const qs = namespace ? `?namespace=${namespace}` : "";
    const { data } = await api.get<{ items: PersistentVolumeClaim[] }>(`/cluster/persistent-volume-claims${qs}`);
    return data.items ?? [];
  },
  listStorageClasses: async () => {
    const { data } = await api.get<{ items: StorageClass[] }>("/cluster/storage-classes");
    return data.items ?? [];
  },

  // Helm
  listHelmReleases: async (namespace?: string) => {
    const qs = namespace ? `?namespace=${namespace}` : "";
    const { data } = await api.get<{ releases: HelmRelease[] }>(`/cluster/helm-releases${qs}`);
    return data.releases ?? [];
  },
  installHelmRelease: async (payload: { name: string; chart: string; namespace?: string; version?: string; values?: Record<string, unknown> }) => {
    const { data } = await api.post<{ release: HelmRelease }>("/cluster/helm-releases", payload);
    return data.release;
  },
  deleteHelmRelease: async (name: string, namespace?: string) => {
    const qs = namespace ? `?namespace=${namespace}` : "";
    const { data } = await api.delete<{ success: boolean }>(`/cluster/helm-releases/${name}${qs}`);
    return data;
  },

  // Network policies
  listNetworkPolicies: async (namespace?: string) => {
    const qs = namespace ? `?namespace=${namespace}` : "";
    const { data } = await api.get<{ items: NetworkPolicy[] }>(`/cluster/network-policies${qs}`);
    return data.items ?? [];
  },
  createNetworkPolicy: async (payload: Partial<NetworkPolicy> & { spec: Record<string, unknown> }) => {
    const { data } = await api.post<{ item: NetworkPolicy }>("/cluster/network-policies", payload);
    return data.item;
  },

  // Quotas
  listQuotas: async (namespace?: string) => {
    const qs = namespace ? `?namespace=${namespace}` : "";
    const { data } = await api.get<{ quotas: ResourceQuota[] }>(`/cluster/quotas${qs}`);
    return data.quotas ?? [];
  },
  createQuota: async (payload: { namespace: string; name: string; hard: Record<string, string> }) => {
    const { data } = await api.post<{ quota: ResourceQuota }>("/cluster/quotas", payload);
    return data.quota;
  },

  // Events
  listEvents: async (namespace?: string) => {
    const qs = namespace ? `?namespace=${namespace}` : "";
    const { data } = await api.get<{ events: ClusterEvent[] }>(`/cluster/events${qs}`);
    return data.events ?? [];
  },
};

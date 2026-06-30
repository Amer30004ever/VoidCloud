import api from "./api";

export const platformApi = {
  getObservabilityLinks: async () => {
    const { data } = await api.get<{ links: Array<{ id: string; name: string; url: string; category: string }> }>(
      "/platform/observability",
    );
    return data.links;
  },
  getGitOpsStatus: async () => {
    const { data } = await api.get("/platform/gitops/status");
    return data;
  },
  forceGitOpsSync: async () => {
    const { data } = await api.post("/platform/gitops/sync");
    return data;
  },
  getTopology: async () => {
    const { data } = await api.get("/platform/topology");
    return data;
  },
  getCapacity: async () => {
    const { data } = await api.get("/platform/capacity");
    return data;
  },
  getHeatmap: async () => {
    const { data } = await api.get("/platform/heatmap");
    return data;
  },
  getClusters: async () => {
    const { data } = await api.get("/platform/clusters");
    return data;
  },
  getMetricsSnapshot: async () => {
    const { data } = await api.get("/platform/metrics/snapshot");
    return data;
  },
  createCluster: async (body: {
    name: string;
    context: string;
    environment?: string;
    kubeconfigPath?: string;
    apiServer?: string;
    isDefault?: boolean;
  }) => {
    const { data } = await api.post("/platform/clusters", body);
    return data;
  },
  activateCluster: async (id: string) => {
    const { data } = await api.post(`/platform/clusters/${id}/activate`);
    return data;
  },
};

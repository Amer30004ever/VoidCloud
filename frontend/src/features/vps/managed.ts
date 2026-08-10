/* Tier 9 — Managed platform API client (databases, object storage, K8s, VM import). */
import api from "@/lib/api";
import { API_BASE_URL } from "@/lib/constants";


export type ManagedEngine = "POSTGRES" | "MYSQL" | "REDIS" | "MONGODB";

export interface ManagedDbPlan {
  code: string;
  label: string;
  cpuCores: number;
  memoryMb: number;
  storageGb: number;
  monthlyUsd: number;
}

export interface ManagedDatabase {
  id: string;
  name: string;
  engine: ManagedEngine;
  version: string;
  planCode: string;
  status: string;
  host?: string | null;
  port?: number | null;
  backupsEnabled?: boolean;
  errorMessage?: string | null;
  createdAt: string;
}

/** One step of the provisioning timeline (see GET /managed/databases/:id/events). */
export interface ManagedDatabaseEvent {
  id: string;
  status: "PROVISIONING" | "RUNNING" | "FAILED" | string;
  step: string;
  message?: string | null;
  detail?: Record<string, unknown> | null;
  /** Trace id shared with the structured `proxmox.api` log line of the attempt. */
  correlationId?: string | null;
  createdAt: string;
}

export interface ManagedDatabaseTimeline {
  status: string;
  errorMessage?: string | null;
  provisionAttempts: number;
  correlationId?: string | null;
  nextRetryAt?: string | null;
  events: ManagedDatabaseEvent[];
}



export interface ObjectStorageKey {
  id: string;
  label: string;
  accessKey: string;
  readOnly: boolean;
  lastUsedAt?: string | null;
}

export interface ObjectStorageBucket {
  id: string;
  name: string;
  region: string;
  endpoint: string;
  publicRead: boolean;
  versioning: boolean;
  quotaGb: number;
  usedBytes: number;
  usedPercent: number;
  objectCount?: number;
  keys?: ObjectStorageKey[];
  createdAt: string;
}

export interface K8sNodePool {
  id: string;
  name: string;
  nodeCount: number;
  cpuCores: number;
  memoryMb: number;
  storageGb: number;
}

export interface ManagedK8sCluster {
  id: string;
  name: string;
  k8sVersion: string;
  region: string;
  status: string;
  endpoint?: string | null;
  nodePools?: K8sNodePool[];
  createdAt: string;
}

export interface VmImportJob {
  id: string;
  name: string;
  sourceUrl: string;
  sourceFormat: string;
  status: string;
  progress?: number;
  stage?: string | null;
  errorMessage?: string | null;
  cpuCores: number;
  memoryMb: number;
  diskGb: number;
  createdAt: string;
}

export const managedApi = {
  databases: {
    plans: async () => (await api.get<ManagedDbPlan[]>("/managed/databases/plans")).data,
    list: async () => (await api.get<ManagedDatabase[]>("/managed/databases")).data,
    create: async (body: {
      name: string;
      engine: ManagedEngine;
      planCode: string;
      version?: string;
      backupsEnabled?: boolean;
    }) => (await api.post<ManagedDatabase>("/managed/databases", body)).data,
    connection: async (id: string) =>
      (
        await api.get<{ uri: string; host: string; port: number; username: string; password: string }>(
          `/managed/databases/${id}/connection`,
        )
      ).data,
    start: async (id: string) => (await api.post(`/managed/databases/${id}/start`)).data,
    stop: async (id: string) => (await api.post(`/managed/databases/${id}/stop`)).data,
    resize: async (id: string, planCode: string) =>
      (await api.patch(`/managed/databases/${id}/plan`, { planCode })).data,
    backup: async (id: string) => (await api.post(`/managed/databases/${id}/backups`)).data,
    events: async (id: string) =>
      (await api.get<ManagedDatabaseTimeline>(`/managed/databases/${id}/events`)).data,

    /**
     * Subscribe to the live provisioning timeline over Server-Sent Events.
     *
     * Implemented with fetch + a stream reader rather than `EventSource`
     * because EventSource cannot send the Authorization header, and the
     * endpoint is JWT-guarded like every other managed route.
     *
     * Returns an unsubscribe function. `onError` lets the caller fall back to
     * polling when the browser/proxy cannot hold a streaming connection.
     */
    streamEvents: (
      id: string,
      onMessage: (t: ManagedDatabaseTimeline) => void,
      onError?: (e: unknown) => void,
    ): (() => void) => {
      const controller = new AbortController();

      void (async () => {
        try {
          const token =
            typeof window === "undefined"
              ? null
              : localStorage.getItem("voidcloud_token") ||
                sessionStorage.getItem("voidcloud_token");
          const res = await fetch(
            `${API_BASE_URL}/managed/databases/${id}/events/stream`,
            {
              headers: {
                Accept: "text/event-stream",
                ...(token ? { Authorization: `Bearer ${token}` } : {}),
              },
              signal: controller.signal,
            },
          );
          if (!res.ok || !res.body) throw new Error(`SSE failed (${res.status})`);

          const reader = res.body.getReader();
          const decoder = new TextDecoder();
          let buffer = "";

          for (;;) {
            const { done, value } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });
            // SSE frames are separated by a blank line.
            const frames = buffer.split("\n\n");
            buffer = frames.pop() ?? "";
            for (const frame of frames) {
              const dataLine = frame
                .split("\n")
                .filter((l) => l.startsWith("data:"))
                .map((l) => l.slice(5).trim())
                .join("");
              if (!dataLine) continue;
              try {
                onMessage(JSON.parse(dataLine) as ManagedDatabaseTimeline);
              } catch {
                /* ignore malformed keep-alive frames */
              }
            }
          }
        } catch (e) {
          if (!controller.signal.aborted) onError?.(e);
        }
      })();

      return () => controller.abort();
    },



    destroy: async (id: string) => (await api.delete(`/managed/databases/${id}`)).data,
  },
  storage: {
    list: async () => (await api.get<ObjectStorageBucket[]>("/managed/object-storage/buckets")).data,
    create: async (body: {
      name: string;
      region?: string;
      publicRead?: boolean;
      versioning?: boolean;
      quotaGb?: number;
    }) => (await api.post<ObjectStorageBucket>("/managed/object-storage/buckets", body)).data,
    update: async (
      id: string,
      body: { publicRead?: boolean; versioning?: boolean; quotaGb?: number },
    ) => (await api.patch(`/managed/object-storage/buckets/${id}`, body)).data,
    remove: async (id: string) => (await api.delete(`/managed/object-storage/buckets/${id}`)).data,
    createKey: async (id: string, body: { label?: string; readOnly?: boolean }) =>
      (
        await api.post<{ accessKey: string; secretKey: string; label: string; readOnly: boolean }>(
          `/managed/object-storage/buckets/${id}/keys`,
          body,
        )
      ).data,
    revokeKey: async (keyId: string) =>
      (await api.delete(`/managed/object-storage/keys/${keyId}`)).data,
    presign: async (id: string, objectKey: string, ttlSeconds?: number) =>
      (
        await api.post<{ url: string; expiresAt: string }>(
          `/managed/object-storage/buckets/${id}/presign`,
          { objectKey, ttlSeconds },
        )
      ).data,
  },
  kubernetes: {
    versions: async () => (await api.get<string[]>("/managed/kubernetes/versions")).data,
    list: async () => (await api.get<ManagedK8sCluster[]>("/managed/kubernetes/clusters")).data,
    create: async (body: {
      name: string;
      k8sVersion?: string;
      region?: string;
      nodePool?: { name?: string; nodeCount?: number; cpuCores?: number; memoryMb?: number; storageGb?: number };
    }) => (await api.post<ManagedK8sCluster>("/managed/kubernetes/clusters", body)).data,
    kubeconfig: async (id: string) =>
      (await api.get<{ kubeconfig: string }>(`/managed/kubernetes/clusters/${id}/kubeconfig`)).data,
    addPool: async (id: string, body: Partial<K8sNodePool>) =>
      (await api.post(`/managed/kubernetes/clusters/${id}/node-pools`, body)).data,
    scalePool: async (id: string, poolId: string, nodeCount: number) =>
      (await api.patch(`/managed/kubernetes/clusters/${id}/node-pools/${poolId}`, { nodeCount })).data,
    deletePool: async (id: string, poolId: string) =>
      (await api.delete(`/managed/kubernetes/clusters/${id}/node-pools/${poolId}`)).data,
    destroy: async (id: string) => (await api.delete(`/managed/kubernetes/clusters/${id}`)).data,
  },
  vmImports: {
    formats: async () => (await api.get<string[]>("/managed/vm-imports/formats")).data,
    list: async () => (await api.get<VmImportJob[]>("/managed/vm-imports")).data,
    create: async (body: {
      name: string;
      sourceUrl: string;
      sourceFormat?: string;
      checksum?: string;
      sizeBytes?: number;
      cpuCores?: number;
      memoryMb?: number;
      diskGb?: number;
    }) => (await api.post<VmImportJob>("/managed/vm-imports", body)).data,
    get: async (id: string) => (await api.get<VmImportJob>(`/managed/vm-imports/${id}`)).data,
    cancel: async (id: string) => (await api.post(`/managed/vm-imports/${id}/cancel`)).data,
  },
};

export function formatBytes(bytes: number): string {
  if (!bytes) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)));
  return `${(bytes / 1024 ** i).toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

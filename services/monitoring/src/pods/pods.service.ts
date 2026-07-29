import { Injectable, Logger } from '@nestjs/common';
import * as k8s from '@kubernetes/client-node';

const ALLOWED_NAMESPACES = new Set(['voidcloud']);

@Injectable()
export class PodsK8sService {
  private readonly logger = new Logger(PodsK8sService.name);
  private readonly kc: k8s.KubeConfig;
  private readonly coreApi: k8s.CoreV1Api;
  private readonly appsApi: k8s.AppsV1Api;

  constructor() {
    this.kc = new k8s.KubeConfig();
    this.kc.loadFromDefault();
    this.coreApi = this.kc.makeApiClient(k8s.CoreV1Api);
    this.appsApi = this.kc.makeApiClient(k8s.AppsV1Api);
  }

  async listPods(namespace: string) {
    if (!ALLOWED_NAMESPACES.has(namespace)) {
      throw new Error(`Namespace "${namespace}" is not allowed`);
    }
    const res = await (this.coreApi.listNamespacedPod as any)(
      namespace,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      'true',
    );
    const items = (res?.body?.items ?? []) as k8s.V1Pod[];
    const rows = items.map((pod) => {
      const ready = pod.status?.containerStatuses?.every((c) => c.ready) ?? false;
      const restarts = pod.status?.containerStatuses?.reduce((sum, c) => sum + (c.restartCount ?? 0), 0) ?? 0;
      const node = pod.spec?.nodeName ?? '';
      const age = pod.metadata?.creationTimestamp ? new Date(pod.metadata.creationTimestamp).toISOString() : '';
      const cpu = this.extractResource(pod.spec?.containers ?? [], 'cpu');
      const memory = this.extractResource(pod.spec?.containers ?? [], 'memory');
      return {
        name: pod.metadata?.name ?? '',
        namespace: pod.metadata?.namespace ?? '',
        status: pod.status?.phase ?? 'Unknown',
        ready: ready ? '1/1' : '0/1',
        restarts,
        age: this.formatAge(age),
        node,
        cpu: cpu || '0m',
        memory: memory || '0Mi',
      };
    });
    return { pods: rows };
  }

  async restartDeployment(namespace: string, name: string) {
    if (!ALLOWED_NAMESPACES.has(namespace)) {
      throw new Error(`Namespace "${namespace}" is not allowed`);
    }
    const now = new Date().toISOString();
    await (this.appsApi.patchNamespacedDeployment as any)(
      name,
      namespace,
      { spec: { template: { metadata: { annotations: { 'kubectl.kubernetes.io/restartedBy': now } } } } },
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      { headers: { 'Content-Type': 'application/strategic-merge-patch+json' } },
    );
    return { ok: true, message: `Deployment "${name}" restart initiated` };
  }

  async getLogStream(namespace: string, pod: string, container: string | undefined, tailLines = 200): Promise<string> {
    if (!ALLOWED_NAMESPACES.has(namespace)) {
      throw new Error(`Namespace "${namespace}" is not allowed`);
    }
    const res = await (this.coreApi.readNamespacedPodLog as any)(
      pod,
      namespace,
      container,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      tailLines,
      undefined,
    );
    const body = res?.body;
    if (typeof body === 'string') return body;
    if (body && typeof body === 'object' && 'data' in body) return (body as any).data ?? '';
    return '';
  }

  private extractResource(containers: k8s.V1Container[], kind: 'cpu' | 'memory'): string {
    if (containers.length === 0) return '';
    let total = 0;
    let hasValue = false;
    for (const c of containers) {
      const raw = c.resources?.requests?.[kind] || c.resources?.limits?.[kind];
      if (!raw) continue;
      hasValue = true;
      if (kind === 'cpu') {
        if (typeof raw === 'string') {
          if (raw.endsWith('m')) total += parseInt(raw, 10);
          else if (raw === '0') total += 0;
          else total += parseFloat(raw) * 1000;
        }
      } else {
        if (typeof raw === 'string') {
          if (raw.endsWith('Mi')) total += parseInt(raw, 10);
          else if (raw.endsWith('Gi')) total += parseFloat(raw) * 1024;
          else if (raw === '0') total += 0;
          else total += parseFloat(raw) / (1024 * 1024);
        }
      }
    }
    if (!hasValue) return '';
    if (kind === 'cpu') return `${Math.round(total)}m`;
    return `${Math.round(total)}Mi`;
  }

  private formatAge(iso: string): string {
    const diff = Date.now() - new Date(iso).getTime();
    const days = Math.floor(diff / 86400000);
    if (days > 0) return `${days}d`;
    const hours = Math.floor(diff / 3600000);
    if (hours > 0) return `${hours}h`;
    const mins = Math.floor(diff / 60000);
    return `${mins}m`;
  }
}

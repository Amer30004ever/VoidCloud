import { Injectable, Logger } from '@nestjs/common';
import * as k8s from '@kubernetes/client-node';

export interface DeploymentSpec {
  namespace: string;
  name: string;
  image: string;
  envVars: Record<string, string>;
  cpu: string;
  memory: string;
  replicas?: number;
  port?: number;
}

@Injectable()
export class KubernetesService {
  private readonly logger = new Logger(KubernetesService.name);
  private kc: k8s.KubeConfig;
  private core!: k8s.CoreV1Api;
  private apps!: k8s.AppsV1Api;
  private net!: k8s.NetworkingV1Api;
  private enabled = true;

  constructor() {
    this.kc = new k8s.KubeConfig();
    try {
      if (process.env.NODE_ENV === 'production' && process.env.KUBERNETES_SERVICE_HOST) {
        this.kc.loadFromCluster();
      } else {
        this.kc.loadFromDefault();
      }
      this.core = this.kc.makeApiClient(k8s.CoreV1Api);
      this.apps = this.kc.makeApiClient(k8s.AppsV1Api);
      this.net = this.kc.makeApiClient(k8s.NetworkingV1Api);
    } catch (e: any) {
      this.logger.warn(`K8s client unavailable: ${e.message}. Running in stub mode.`);
      this.enabled = false;
    }
  }

  isEnabled() { return this.enabled; }

  private isConflict(e: any) { return e?.code === 409 || e?.response?.statusCode === 409; }

  async createNamespace(userId: string, deploymentId: string): Promise<string> {
    const name = `amercloud-${userId.slice(0, 8)}-${deploymentId.slice(0, 8)}`.toLowerCase();
    if (!this.enabled) return name;
    try {
      await this.core.createNamespace({
        body: {
          metadata: {
            name,
            labels: { 'amercloud/user': userId, 'amercloud/deployment': deploymentId, 'managed-by': 'amercloud' },
          },
        },
      });
    } catch (e) { if (!this.isConflict(e)) throw e; }
    return name;
  }

  async applyResourceQuota(namespace: string, limits: { cpu: string; memory: string; storage: string }) {
    if (!this.enabled) return;
    const body: any = {
      metadata: { name: 'amercloud-quota', namespace },
      spec: {
        hard: {
          'requests.cpu': limits.cpu,
          'requests.memory': limits.memory,
          'requests.storage': limits.storage,
          'limits.cpu': limits.cpu,
          'limits.memory': limits.memory,
          pods: '10',
          services: '10',
        },
      },
    };
    try {
      await this.core.createNamespacedResourceQuota({ namespace, body });
    } catch (e) {
      if (this.isConflict(e)) {
        await this.core.replaceNamespacedResourceQuota({ name: 'amercloud-quota', namespace, body });
      } else throw e;
    }
  }

  async createOrUpdateDeployment(spec: DeploymentSpec) {
    if (!this.enabled) return;
    const port = spec.port ?? 3000;
    const body: any = {
      metadata: { name: spec.name, namespace: spec.namespace, labels: { app: spec.name } },
      spec: {
        replicas: spec.replicas ?? 1,
        selector: { matchLabels: { app: spec.name } },
        template: {
          metadata: { labels: { app: spec.name } },
          spec: {
            containers: [{
              name: spec.name,
              image: spec.image,
              ports: [{ containerPort: port }],
              env: Object.entries(spec.envVars).map(([name, value]) => ({ name, value })),
              resources: {
                requests: { cpu: spec.cpu, memory: spec.memory },
                limits: { cpu: spec.cpu, memory: spec.memory },
              },
            }],
          },
        },
      },
    };
    try {
      await this.apps.createNamespacedDeployment({ namespace: spec.namespace, body });
    } catch (e) {
      if (this.isConflict(e)) {
        await this.apps.replaceNamespacedDeployment({ name: spec.name, namespace: spec.namespace, body });
      } else throw e;
    }
  }

  async createService(namespace: string, name: string, port = 3000) {
    if (!this.enabled) return;
    const body: any = {
      metadata: { name, namespace, labels: { app: name } },
      spec: {
        selector: { app: name },
        ports: [{ port, targetPort: port, protocol: 'TCP', name: 'http' }],
        type: 'ClusterIP',
      },
    };
    try {
      await this.core.createNamespacedService({ namespace, body });
    } catch (e) { if (!this.isConflict(e)) throw e; }
  }

  async createIngress(namespace: string, name: string, hosts: string[], port = 3000) {
    if (!this.enabled || !hosts.length) return;
    const body: any = {
      metadata: {
        name, namespace,
        annotations: {
          'cert-manager.io/cluster-issuer': 'letsencrypt-prod',
          'traefik.ingress.kubernetes.io/router.tls': 'true',
        },
      },
      spec: {
        tls: [{ hosts, secretName: `${name}-tls` }],
        rules: hosts.map((host) => ({
          host,
          http: { paths: [{ path: '/', pathType: 'Prefix', backend: { service: { name, port: { number: port } } } }] },
        })),
      },
    };
    try {
      await this.net.createNamespacedIngress({ namespace, body });
    } catch (e) {
      if (this.isConflict(e)) {
        await this.net.replaceNamespacedIngress({ name, namespace, body });
      } else throw e;
    }
  }

  async restartDeployment(namespace: string, name: string) {
    if (!this.enabled) return;
    try {
      const patch = [{
        op: 'add', path: '/spec/template/metadata/annotations',
        value: { 'amercloud.io/restartedAt': new Date().toISOString() },
      }];
      await (this.apps as any).patchNamespacedDeployment({ name, namespace, body: patch });
    } catch (e: any) {
      this.logger.warn(`restart failed: ${e.message}`);
    }
  }

  async deleteNamespace(namespace: string) {
    if (!this.enabled) return;
    try { await this.core.deleteNamespace({ name: namespace }); } catch { /* ignore */ }
  }

  async getPodLogs(namespace: string, app: string, tailLines = 500): Promise<string> {
    if (!this.enabled) return '';
    const pods = await this.core.listNamespacedPod({ namespace, labelSelector: `app=${app}` });
    const pod = pods.items[0];
    if (!pod?.metadata?.name) return '';
    const out = await this.core.readNamespacedPodLog({
      name: pod.metadata.name, namespace, tailLines,
    });
    return typeof out === 'string' ? out : String(out);
  }

  async streamPodLogs(namespace: string, app: string, onLine: (line: string) => void): Promise<() => void> {
    if (!this.enabled) return () => undefined;
    const pods = await this.core.listNamespacedPod({ namespace, labelSelector: `app=${app}` });
    const pod = pods.items[0];
    if (!pod?.metadata?.name) return () => undefined;
    const log = new k8s.Log(this.kc);
    const { PassThrough } = await import('stream');
    const stream = new PassThrough();
    stream.on('data', (chunk: Buffer) => {
      chunk.toString('utf8').split(/\r?\n/).filter(Boolean).forEach(onLine);
    });
    const req: any = await (log as any).log(namespace, pod.metadata.name, '', stream, { follow: true, tailLines: 100 });
    return () => { try { req?.abort?.(); stream.destroy(); } catch { /* ignore */ } };
  }
}

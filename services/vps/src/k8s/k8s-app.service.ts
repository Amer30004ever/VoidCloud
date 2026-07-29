import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import * as k8s from '@kubernetes/client-node';

const MARKETPLACE_NAMESPACE = process.env.MARKETPLACE_NAMESPACE || 'voidcloud';

interface AppMetadata {
  id: string;
  name: string;
  image: string;
  ports: { port: number; targetPort: number; name: string }[];
  env?: { name: string; value: string }[];
}

const APP_CATALOG: AppMetadata[] = [
  {
    id: 'code-server',
    name: 'code-server',
    image: process.env.MARKETPLACE_CODE_SERVER_IMAGE || 'voidcloud/code-server:latest',
    ports: [{ port: 8080, targetPort: 8080, name: 'http' }],
    env: [{ name: 'AUTH_TYPE', value: 'none' }],
  },
  {
    id: 'gitea',
    name: 'gitea',
    image: process.env.MARKETPLACE_GITEA_IMAGE || 'voidcloud/gitea:latest',
    ports: [{ port: 3000, targetPort: 3000, name: 'http' }],
  },
  {
    id: 'portainer',
    name: 'portainer',
    image: process.env.MARKETPLACE_PORTAINER_IMAGE || 'voidcloud/portainer:latest',
    ports: [{ port: 9000, targetPort: 9000, name: 'http' }],
  },
  {
    id: 'umami',
    name: 'umami',
    image: process.env.MARKETPLACE_UMAMI_IMAGE || 'voidcloud/umami:latest',
    ports: [{ port: 3000, targetPort: 3000, name: 'http' }],
  },
  {
    id: 'wordpress',
    name: 'wordpress',
    image: process.env.MARKETPLACE_WORDPRESS_IMAGE || 'voidcloud/wordpress:latest',
    ports: [{ port: 80, targetPort: 80, name: 'http' }],
  },
  {
    id: 'docker',
    name: 'docker',
    image: process.env.MARKETPLACE_DOCKER_IMAGE || 'voidcloud/docker:latest',
    ports: [{ port: 2375, targetPort: 2375, name: 'tcp' }],
  },
  {
    id: 'lemp',
    name: 'lemp',
    image: process.env.MARKETPLACE_LEMP_IMAGE || 'voidcloud/lemp:latest',
    ports: [{ port: 80, targetPort: 80, name: 'http' }],
  },
  {
    id: 'lamp',
    name: 'lamp',
    image: process.env.MARKETPLACE_LAMP_IMAGE || 'voidcloud/lamp:latest',
    ports: [{ port: 80, targetPort: 80, name: 'http' }],
  },
];

@Injectable()
export class K8sAppService {
  private readonly logger = new Logger(K8sAppService.name);
  private readonly kc: k8s.KubeConfig;
  private readonly appsApi: k8s.AppsV1Api;
  private readonly coreApi: k8s.CoreV1Api;

  constructor() {
    this.kc = new k8s.KubeConfig();
    this.kc.loadFromDefault();
    this.appsApi = this.kc.makeApiClient(k8s.AppsV1Api);
    this.coreApi = this.kc.makeApiClient(k8s.CoreV1Api);
  }

  getAppMetadata(appId: string): AppMetadata {
    const meta = APP_CATALOG.find((a) => a.id === appId);
    if (!meta) throw new NotFoundException(`Unknown marketplace app: ${appId}`);
    return meta;
  }

  listCatalog() {
    return APP_CATALOG.map((a) => ({
      id: a.id,
      name: a.name,
      image: a.image,
      ports: a.ports,
    }));
  }

  deploymentName(vpsId: string, appId: string): string {
    return `vps-${vpsId}-${appId}`;
  }

  serviceName(vpsId: string, appId: string): string {
    return `vps-${vpsId}-${appId}`;
  }

  labels(vpsId: string, appId: string, tenantId: string) {
    return {
      'app.kubernetes.io/managed-by': 'voidcloud-marketplace',
      'voidcloud.cc.cd/tenant-id': tenantId,
      'voidcloud.cc.cd/vps-id': vpsId,
      'voidcloud.cc.cd/app-id': appId,
    };
  }

  async deploy(vpsId: string, tenantId: string, appId: string) {
    const meta = this.getAppMetadata(appId);
    const name = this.deploymentName(vpsId, appId);
    const svcName = this.serviceName(vpsId, appId);
    const labels = this.labels(vpsId, appId, tenantId);

    const deployment: k8s.V1Deployment = {
      apiVersion: 'apps/v1',
      kind: 'Deployment',
      metadata: { name, namespace: MARKETPLACE_NAMESPACE, labels },
      spec: {
        replicas: 1,
        selector: { matchLabels: { ...labels, app: name } },
        template: {
          metadata: { labels: { ...labels, app: name } },
          spec: {
            containers: [
              {
                name: appId,
                image: meta.image,
                ports: meta.ports.map((p) => ({ containerPort: p.targetPort })),
                ...(meta.env ? { env: meta.env } : {}),
              },
            ],
          },
        },
      },
    };

    const service: k8s.V1Service = {
      apiVersion: 'v1',
      kind: 'Service',
      metadata: { name: svcName, namespace: MARKETPLACE_NAMESPACE, labels },
      spec: {
        selector: { ...labels, app: name },
        ports: meta.ports.map((p) => ({ port: p.port, targetPort: p.targetPort, name: p.name })),
        type: 'ClusterIP',
      },
    };

    try {
      await (this.appsApi.createNamespacedDeployment as any)(
        MARKETPLACE_NAMESPACE,
        deployment,
        undefined,
        undefined,
        undefined,
        undefined,
      );
    } catch (e: any) {
      if (e?.response?.body?.reason === 'AlreadyExists') {
        this.logger.warn(`Deployment ${name} already exists, patching instead`);
        await (this.appsApi.patchNamespacedDeployment as any)(
          name,
          MARKETPLACE_NAMESPACE,
          deployment,
          undefined,
          undefined,
          undefined,
          undefined,
          undefined,
          { headers: { 'Content-Type': 'application/strategic-merge-patch+json' } },
        );
      } else {
        throw e;
      }
    }

    try {
      await (this.coreApi.createNamespacedService as any)(
        MARKETPLACE_NAMESPACE,
        service,
        undefined,
        undefined,
        undefined,
        undefined,
      );
    } catch (e: any) {
      if (e?.response?.body?.reason === 'AlreadyExists') {
        this.logger.warn(`Service ${svcName} already exists, patching instead`);
        await (this.coreApi.patchNamespacedService as any)(
          svcName,
          MARKETPLACE_NAMESPACE,
          service,
          undefined,
          undefined,
          undefined,
          undefined,
          undefined,
          { headers: { 'Content-Type': 'application/strategic-merge-patch+json' } },
        );
      } else {
        throw e;
      }
    }

    return {
      deploymentName: name,
      serviceName: svcName,
      namespace: MARKETPLACE_NAMESPACE,
    };
  }

  async remove(vpsId: string, appId: string) {
    const name = this.deploymentName(vpsId, appId);
    const svcName = this.serviceName(vpsId, appId);

    try {
      await (this.appsApi.deleteNamespacedDeployment as any)(
        name,
        MARKETPLACE_NAMESPACE,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        { propagationPolicy: 'Background' },
      );
    } catch (e: any) {
      if (e?.response?.body?.reason !== 'NotFound') {
        this.logger.warn(`Failed to delete deployment ${name}: ${e?.message ?? e}`);
      }
    }

    try {
      await (this.coreApi.deleteNamespacedService as any)(
        svcName,
        MARKETPLACE_NAMESPACE,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        { propagationPolicy: 'Background' },
      );
    } catch (e: any) {
      if (e?.response?.body?.reason !== 'NotFound') {
        this.logger.warn(`Failed to delete service ${svcName}: ${e?.message ?? e}`);
      }
    }
  }

  async getStatus(vpsId: string, appId: string): Promise<'running' | 'pending' | 'failed' | 'not_installed'> {
    const name = this.deploymentName(vpsId, appId);
    try {
      const res = await (this.appsApi.readNamespacedDeployment as any)(
        name,
        MARKETPLACE_NAMESPACE,
        undefined,
        undefined,
        undefined,
        undefined,
      );
      const deployment = res?.body;
      if (!deployment) return 'not_installed';

      const replicas = deployment.spec?.replicas ?? 0;
      const available = deployment.status?.availableReplicas ?? 0;
      const ready = deployment.status?.readyReplicas ?? 0;

      if (ready > 0) return 'running';
      if (available > 0 || ready > 0) return 'running';
      if (replicas > 0) return 'pending';

      return 'pending';
    } catch (e: any) {
      if (e?.response?.body?.reason === 'NotFound' || e?.response?.status === 404) {
        return 'not_installed';
      }
      this.logger.warn(`Failed to read deployment ${name}: ${e?.message ?? e}`);
      return 'failed';
    }
  }
}

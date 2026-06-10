import { Injectable, Logger } from '@nestjs/common';
import { StatsService } from '../stats/stats.service';
import { KubernetesService } from '../kubernetes/kubernetes.service';

type ServiceState = 'healthy' | 'warning' | 'critical';

@Injectable()
export class DashboardService {
  private readonly logger = new Logger(DashboardService.name);

  constructor(
    private readonly statsService: StatsService,
    private readonly kubernetesService: KubernetesService,
  ) {}

  async getSystemStatus() {
    const now = new Date().toISOString();
    const connected = this.kubernetesService.isKubernetesConnected();

    return {
      apiStatus: 'operational',
      databaseStatus: 'connected',
      uptime: process.uptime(),
      version: process.env.npm_package_version ?? 'v1.0.0',
      region: process.env.APP_REGION ?? 'Global',
      kubernetesConnected: connected,
      lastCheck: now,
      timestamp: now,
    };
  }

  async getRunningNamespaces() {
    try {
      const namespaces = await this.kubernetesService.getNamespaces();
      const pods = await this.kubernetesService.getPods();

      const namespaceMap = new Map<string, { namespace: string; podCount: number; status: ServiceState }>();
      namespaces.forEach((ns) => {
        namespaceMap.set(ns, { namespace: ns, podCount: 0, status: 'healthy' });
      });

      for (const pod of pods) {
        const namespace = pod.metadata?.namespace;
        if (!namespace || !namespaceMap.has(namespace)) {
          continue;
        }

        const existing = namespaceMap.get(namespace)!;
        const phase = pod.status?.phase;
        const podCount = existing.podCount + 1;
        let status: ServiceState = existing.status;
        if (phase === 'Failed') status = 'critical';
        if (phase === 'Pending' && status !== 'critical') status = 'warning';

        namespaceMap.set(namespace, { namespace, podCount, status });
      }

      return {
        namespaces: Array.from(namespaceMap.values()).sort((a, b) => a.namespace.localeCompare(b.namespace)),
      };
    } catch (error) {
      this.logger.error(`Error fetching running namespaces: ${error.message}`);
      return { namespaces: [] };
    }
  }

  async getDashboardMetrics() {
    return this.statsService.getStats();
  }

  getRealtimeConfig() {
    const wsUrl = process.env.METRICS_WS_URL ?? `ws://localhost:${process.env.PORT ?? 3001}/metrics`;
    return {
      enabled: true,
      transport: 'websocket',
      url: wsUrl,
      namespace: '/metrics',
      event: 'metrics',
      refreshIntervalMs: 5000,
      message: 'Live metrics available via WebSocket.',
    };
  }

  async getPods() {
    try {
      const pods = await this.kubernetesService.getPods();
      return {
        pods: pods.map((pod) => ({
          name: pod.metadata?.name,
          namespace: pod.metadata?.namespace,
          status: pod.status?.phase ?? 'Unknown',
          restarts: (pod.status?.containerStatuses || []).reduce(
            (total: number, c: { restartCount?: number }) => total + (c.restartCount ?? 0),
            0,
          ),
          age: pod.metadata?.creationTimestamp,
        })),
      };
    } catch (error) {
      this.logger.error(`Error fetching pods: ${error.message}`);
      return { pods: [] };
    }
  }

  async getServiceStatus() {
    try {
      const services = await this.kubernetesService.getServices();
      return {
        services: services.map((svc) => ({
          service: svc.metadata?.name,
          namespace: svc.metadata?.namespace,
          status: 'healthy' as ServiceState,
          responseTimeMs: null,
          uptimePercent: null,
          lastCheck: new Date().toISOString(),
        })),
      };
    } catch (error) {
      this.logger.error(`Error fetching service status: ${error.message}`);
      return { services: [] };
    }
  }

  async getRecentActivity() {
    try {
      const recentDeployments = await this.statsService.getRecentDeployments(10);
      const events = recentDeployments.deployments.map((dep) => ({
        type: 'deployment',
        title: `Deployed ${dep.name}`,
        namespace: dep.namespace,
        timestamp: dep.createdAt,
      }));

      return { activities: events };
    } catch (error) {
      this.logger.error(`Error fetching recent activity: ${error.message}`);
      return { activities: [] };
    }
  }
}

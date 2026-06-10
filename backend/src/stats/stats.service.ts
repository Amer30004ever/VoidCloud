import { Injectable, Logger } from '@nestjs/common';
import { KubernetesService } from '../kubernetes/kubernetes.service';

@Injectable()
export class StatsService {
  private readonly logger = new Logger(StatsService.name);

  constructor(private readonly kubernetesService: KubernetesService) {}

  async getStats() {
    try {
      const [
        activePipelines,
        deploymentsToday,
        runningPods,
        activeAlerts,
        runningNamespaces,
      ] = await Promise.all([
        this.getActivePipelines(),
        this.getDeploymentsToday(),
        this.getRunningPods(),
        this.getActiveAlerts(),
        this.getRunningNamespaces(),
      ]);

      return {
        activePipelines,
        deploymentsToday,
        runningPods,
        activeAlerts,
        runningNamespaces,
      };
    } catch (error) {
      this.logger.error(`Error fetching stats: ${error.message}`);
      throw error;
    }
  }

  async getActivePipelines(): Promise<number> {
    try {
      return await this.kubernetesService.getActivePipelines();
    } catch (error) {
      this.logger.error(`Error fetching active pipelines: ${error.message}`);
      return 0;
    }
  }

  async getDeploymentsToday(): Promise<number> {
    try {
      return await this.kubernetesService.getDeploymentsToday();
    } catch (error) {
      this.logger.error(`Error fetching deployments today: ${error.message}`);
      return 0;
    }
  }

  async getRunningPods(): Promise<number> {
    try {
      return await this.kubernetesService.getRunningPodsCount();
    } catch (error) {
      this.logger.error(`Error fetching running pods: ${error.message}`);
      return 0;
    }
  }

  async getActiveAlerts(): Promise<number> {
    try {
      return await this.kubernetesService.getActiveAlerts();
    } catch (error) {
      this.logger.error(`Error fetching active alerts: ${error.message}`);
      return 0;
    }
  }

  async getRunningNamespaces(): Promise<number> {
    try {
      return await this.kubernetesService.getRunningNamespacesCount();
    } catch (error) {
      this.logger.error(`Error fetching running namespaces: ${error.message}`);
      return 0;
    }
  }

  async getPipelines() {
    return { count: await this.getActivePipelines() };
  }

  async getDeployments() {
    return { count: await this.getDeploymentsToday() };
  }

  async getPods() {
    return { count: await this.getRunningPods() };
  }

  async getAlerts() {
    return { count: await this.getActiveAlerts() };
  }

  async getNamespaces() {
    return { count: await this.getRunningNamespaces() };
  }

  async getClusterHealth() {
    try {
      return await this.kubernetesService.getClusterMetrics();
    } catch (error) {
      this.logger.error(`Error fetching cluster health: ${error.message}`);
      return {
        nodes: [],
        totalPods: 0,
      };
    }
  }

  async getRecentDeployments(limit: number = 5) {
    try {
      const deployments = await this.kubernetesService.getRecentDeployments(limit);
      return { deployments };
    } catch (error) {
      this.logger.error(`Error fetching recent deployments: ${error.message}`);
      return { deployments: [] };
    }
  }

  async getFailedPods() {
    try {
      const failedPods = await this.kubernetesService.getFailedPods();
      return { failedPods };
    } catch (error) {
      this.logger.error(`Error fetching failed pods: ${error.message}`);
      return { failedPods: [] };
    }
  }

  async getServiceStatus() {
    try {
      const pods = await this.kubernetesService.getPods();
      const namespaceMap = new Map<string, { status: string; uptime: string; lastIssue: string }>();

      // Group pods by namespace
      const podsByNamespace = new Map<string, any[]>();
      for (const pod of pods) {
        const namespace = pod.metadata?.namespace;
        if (namespace) {
          if (!podsByNamespace.has(namespace)) {
            podsByNamespace.set(namespace, []);
          }
          podsByNamespace.get(namespace)!.push(pod);
        }
      }

      // Calculate health for each namespace
      for (const [namespace, namespacePods] of podsByNamespace.entries()) {
        if (namespacePods.length === 0) {
          namespaceMap.set(namespace, { status: 'Unknown', uptime: 'N/A', lastIssue: 'No pods' });
          continue;
        }

        let allRunning = true;
        let hasIssues = false;
        let maxAge = 0;
        let lastIssue = 'None';
        let totalRestarts = 0;

        for (const pod of namespacePods) {
          const podStatus = pod.status?.phase;
          const restarts = pod.status?.containerStatuses?.reduce((sum, cs) => sum + (cs.restartCount || 0), 0) || 0;
          const startTime = pod.status?.startTime;

          if (startTime) {
            const age = Date.now() - new Date(startTime).getTime();
            if (age > maxAge) maxAge = age;
          }

          if (podStatus !== 'Running') {
            allRunning = false;
            hasIssues = true;
            lastIssue = podStatus || 'Not Running';
          }

          if (restarts > 0) {
            hasIssues = true;
            totalRestarts += restarts;
            if (totalRestarts > 5) {
              lastIssue = `CrashLoop (${totalRestarts} restarts)`;
            }
          }
        }

        const uptime = this.formatUptime(maxAge);
        const status = allRunning ? 'Online' : 'Down';

        namespaceMap.set(namespace, {
          status,
          uptime,
          lastIssue: hasIssues ? lastIssue : 'None',
        });
      }

      return { services: Array.from(namespaceMap.entries()).map(([name, data]) => ({ name, ...data })) };
    } catch (error) {
      this.logger.error(`Error fetching service status: ${error.message}`);
      return { services: [] };
    }
  }

  private formatUptime(ms: number): string {
    const seconds = Math.floor(ms / 1000);
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);

    if (days > 0) {
      return hours > 0 ? `${days}d ${hours}h` : `${days}d`;
    } else if (hours > 0) {
      return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
    } else if (minutes > 0) {
      return `${minutes}m`;
    }
    return '< 1m';
  }

  async getPodsList() {
    try {
      const pods = await this.kubernetesService.getPods();
      return pods.map((pod) => ({
        name: pod.metadata?.name,
        namespace: pod.metadata?.namespace,
        status: pod.status?.phase ?? 'Unknown',
        restarts: (pod.status?.containerStatuses || []).reduce(
          (total: number, c: { restartCount?: number }) => total + (c.restartCount ?? 0),
          0,
        ),
        age: pod.metadata?.creationTimestamp,
      }));
    } catch (error) {
      this.logger.error(`Error fetching pod status list: ${error.message}`);
      return [];
    }
  }

  async getRecentActivityList() {
    try {
      const recentDeployments = await this.kubernetesService.getRecentDeployments(10);
      return recentDeployments.map((dep) => ({
        type: 'deployment',
        title: `Deployed ${dep.name}`,
        namespace: dep.namespace,
        timestamp: dep.createdAt,
      }));
    } catch (error) {
      this.logger.error(`Error fetching recent activity: ${error.message}`);
      return [];
    }
  }
}

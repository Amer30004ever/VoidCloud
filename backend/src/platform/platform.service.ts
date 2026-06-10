import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { KubernetesService } from '../kubernetes/kubernetes.service';
import { StatsService } from '../stats/stats.service';

@Injectable()
export class PlatformService {
  private readonly logger = new Logger(PlatformService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly kubernetesService: KubernetesService,
    private readonly statsService: StatsService,
  ) {}

  getObservabilityLinks() {
    const base = process.env.OBSERVABILITY_BASE_URL ?? '';
    return {
      links: [
        { id: 'prometheus', name: 'Prometheus', url: process.env.PROMETHEUS_URL ?? `${base}/prometheus`, category: 'metrics' },
        { id: 'grafana', name: 'Grafana', url: process.env.GRAFANA_URL ?? `${base}/grafana`, category: 'dashboards' },
        { id: 'jaeger', name: 'Jaeger', url: process.env.JAEGER_URL ?? `${base}/jaeger`, category: 'tracing' },
        { id: 'loki', name: 'Loki', url: process.env.LOKI_URL ?? `${base}/loki`, category: 'logs' },
      ],
    };
  }

  async getGitOpsStatus() {
    const repo = process.env.GITOPS_REPO ?? 'Amer30004ever/Amer-Devops-Poral';
    const branch = process.env.GITOPS_BRANCH ?? 'main';
    const recent = await this.prisma.deploymentHistory.findMany({
      orderBy: { createdAt: 'desc' },
      take: 5,
    });
    return {
      repository: repo,
      branch,
      provider: process.env.GITOPS_PROVIDER ?? 'github',
      syncStatus: recent[0]?.status === 'SUCCESS' || recent[0]?.status === 'TRIGGERED' ? 'healthy' : 'pending',
      lastSyncedAt: recent[0]?.createdAt ?? null,
      recentCommits: recent.map((item) => ({
        id: item.id,
        message: `${item.repo} @ ${item.ref ?? branch}`,
        status: item.status,
        at: item.createdAt,
      })),
    };
  }

  async forceGitOpsSync(initiatedBy?: string) {
    const repo = process.env.GITOPS_REPO ?? 'Amer30004ever/Amer-Devops-Poral';
    const [owner, name] = repo.includes('/') ? repo.split('/') : ['Amer30004ever', repo];
    const record = await this.prisma.deploymentHistory.create({
      data: {
        provider: 'gitops',
        owner,
        repo: name,
        ref: process.env.GITOPS_BRANCH ?? 'main',
        status: 'SYNC_REQUESTED',
        initiatedBy,
        details: { action: 'force_sync' },
      },
    });
    return { success: true, sync: record };
  }

  async getTopology() {
    const [services, pods] = await Promise.all([
      this.kubernetesService.getServices(),
      this.kubernetesService.getPods(),
    ]);

    const nodes = services.map((service) => {
      const namespace = service.metadata?.namespace ?? 'default';
      const name = service.metadata?.name ?? 'unknown';
      const selector = service.spec?.selector ?? {};
      const matchedPods = pods.filter((pod) => {
        if (pod.metadata?.namespace !== namespace) return false;
        const labels = pod.metadata?.labels ?? {};
        return Object.entries(selector).every(([key, value]) => labels[key] === value);
      });

      return {
        id: `service:${namespace}/${name}`,
        type: 'service',
        name,
        namespace,
        status: matchedPods.some((pod) => pod.status?.phase === 'Running') ? 'healthy' : 'warning',
        pods: matchedPods.map((pod) => ({
          id: `pod:${namespace}/${pod.metadata?.name}`,
          type: 'pod',
          name: pod.metadata?.name,
          namespace,
          status: pod.status?.phase ?? 'Unknown',
        })),
      };
    });

    return {
      ingress: [],
      services: nodes,
      generatedAt: new Date().toISOString(),
    };
  }

  async getCapacityForecast() {
    const metrics = await this.kubernetesService.getClusterMetrics();
    const cpu = metrics?.cpu?.usagePercent ?? 0;
    const memory = metrics?.memory?.usagePercent ?? 0;
    const disk = metrics?.disk?.usagePercent ?? 0;

    const forecast = (current: number) => ({
      current,
      in7Days: Math.min(100, Math.round(current * 1.08)),
      in30Days: Math.min(100, Math.round(current * 1.25)),
      recommendation:
        current > 80 ? 'Scale cluster or reduce workloads' : current > 60 ? 'Monitor closely' : 'Capacity healthy',
    });

    return {
      source: metrics?.source ?? {},
      cpu: forecast(cpu),
      memory: forecast(memory),
      disk: forecast(disk),
      nodes: metrics?.nodes?.length ?? 0,
      generatedAt: new Date().toISOString(),
    };
  }

  async getHeatmap() {
    const pods = await this.kubernetesService.getPods();
    const namespaceMap = new Map<string, { namespace: string; pods: number; running: number; failed: number; pending: number }>();

    for (const pod of pods) {
      const namespace = pod.metadata?.namespace ?? 'default';
      const existing = namespaceMap.get(namespace) ?? { namespace, pods: 0, running: 0, failed: 0, pending: 0 };
      existing.pods += 1;
      const phase = pod.status?.phase;
      if (phase === 'Running') existing.running += 1;
      if (phase === 'Failed') existing.failed += 1;
      if (phase === 'Pending') existing.pending += 1;
      namespaceMap.set(namespace, existing);
    }

    return {
      namespaces: Array.from(namespaceMap.values()).map((item) => ({
        ...item,
        intensity: Math.min(100, item.pods * 8 + item.failed * 20),
        status: item.failed > 0 ? 'critical' : item.pending > 0 ? 'warning' : 'healthy',
      })),
      generatedAt: new Date().toISOString(),
    };
  }

  async getClusters() {
    let clusters = await this.prisma.clusterConfig.findMany({ orderBy: { createdAt: 'asc' } });
    if (!clusters.length) {
      clusters = [
        {
          id: 'default',
          name: 'In-Cluster',
          context: 'in-cluster',
          environment: 'production',
          isDefault: true,
          kubeconfigPath: null,
          apiServer: null,
          active: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ] as typeof clusters;
    }
    return { clusters, activeClusterId: clusters.find((c) => c.isDefault)?.id ?? clusters[0]?.id };
  }

  async createCluster(data: {
    name: string;
    context: string;
    environment?: string;
    kubeconfigPath?: string;
    apiServer?: string;
    isDefault?: boolean;
  }) {
    if (data.isDefault) {
      await this.prisma.clusterConfig.updateMany({ data: { isDefault: false } });
    }
    const cluster = await this.prisma.clusterConfig.create({
      data: {
        name: data.name,
        context: data.context,
        environment: data.environment ?? 'production',
        kubeconfigPath: data.kubeconfigPath,
        apiServer: data.apiServer,
        isDefault: data.isDefault ?? false,
      },
    });
    return { success: true, cluster };
  }

  async activateCluster(id: string) {
    const cluster = await this.prisma.clusterConfig.findUnique({ where: { id } });
    if (!cluster) throw new NotFoundException('Cluster not found');
    await this.prisma.clusterConfig.updateMany({ data: { isDefault: false } });
    const updated = await this.prisma.clusterConfig.update({
      where: { id },
      data: { isDefault: true, active: true },
    });
    return { success: true, cluster: updated };
  }

  async getLiveMetricsSnapshot() {
    const [stats, clusterHealth] = await Promise.all([
      this.statsService.getStats(),
      this.kubernetesService.getClusterMetrics(),
    ]);
    return {
      timestamp: new Date().toISOString(),
      cpu: clusterHealth?.cpu?.usagePercent ?? 0,
      memory: clusterHealth?.memory?.usagePercent ?? 0,
      disk: clusterHealth?.disk?.usagePercent ?? 0,
      networkInMbps: 0,
      networkOutMbps: 0,
      runningPods: stats?.runningPods ?? 0,
      runningNamespaces: stats?.runningNamespaces ?? 0,
      source: clusterHealth?.source ?? {},
    };
  }
}

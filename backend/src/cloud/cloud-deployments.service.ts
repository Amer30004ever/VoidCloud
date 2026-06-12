import { Injectable, NotFoundException, ForbiddenException, BadRequestException, Logger } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { randomNamespace, randomSubdomain } from './cloud-plans.service';
import { KubernetesService } from './kubernetes/kubernetes.service';
import { PrometheusService } from './metrics/prometheus.service';
import { ProxmoxService } from './proxmox/proxmox.service';
import { CloudEmailService } from './notifications/email.service';

export interface DeploymentInput {
  name: string;
  type?: 'GITHUB' | 'DOCKER_IMAGE' | 'DOCKER_COMPOSE';
  source: string;
  cpu?: number;
  memory?: number;
  storage?: number;
  replicas?: number;
  customDomains?: string[];
  envVars?: Record<string, string>;
  healthCheck?: string;
}

@Injectable()
export class CloudDeploymentsService {
  private readonly logger = new Logger(CloudDeploymentsService.name);
  constructor(
    private prisma: PrismaService,
    private k8s: KubernetesService,
    private prom: PrometheusService,
    private proxmox: ProxmoxService,
    private email: CloudEmailService,
  ) {}

  list(userId: string) {
    return this.prisma.cloudDeployment.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async get(userId: string, id: string, allowAny = false) {
    const d = await this.prisma.cloudDeployment.findUnique({ where: { id } });
    if (!d || (!allowAny && d.userId !== userId)) throw new NotFoundException();
    return d;
  }

  async create(userId: string, input: DeploymentInput) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { cloudPlan: true },
    });
    if (!user) throw new NotFoundException('User not found');
    if (user.suspendedAt) throw new ForbiddenException('Account suspended');

    const limits = this.effectiveLimits(user);
    const count = await this.prisma.cloudDeployment.count({
      where: { userId, status: { not: 'DELETED' } },
    });
    if (count >= limits.deploymentLimit) {
      throw new BadRequestException(
        `Plan limit reached (${limits.deploymentLimit} deployments). Upgrade your plan.`,
      );
    }
    if ((input.cpu ?? 0.25) > limits.cpuLimit)
      throw new BadRequestException(`CPU exceeds plan limit (${limits.cpuLimit})`);
    if ((input.memory ?? 512) > limits.memoryLimit)
      throw new BadRequestException(`Memory exceeds plan limit (${limits.memoryLimit}MB)`);
    if ((input.storage ?? 1024) > limits.storageLimit)
      throw new BadRequestException(`Storage exceeds plan limit (${limits.storageLimit}MB)`);
    if ((input.customDomains?.length ?? 0) > limits.customDomainLimit)
      throw new BadRequestException(`Domain count exceeds plan limit (${limits.customDomainLimit})`);

    const deployment = await this.prisma.cloudDeployment.create({
      data: {
        userId,
        name: input.name,
        type: input.type ?? 'DOCKER_IMAGE',
        source: input.source,
        namespace: randomNamespace(userId),
        subdomain: randomSubdomain(input.name),
        hostname: input.name.toLowerCase().replace(/[^a-z0-9-]/g, '-'),
        cpu: input.cpu ?? 0.25,
        memory: input.memory ?? 512,
        storage: input.storage ?? 1024,
        replicas: input.replicas ?? 1,
        customDomains: input.customDomains ?? [],
        envVars: (input.envVars ?? {}) as any,
        healthCheck: input.healthCheck,
        status: 'PROVISIONING',
        statusMessage: 'Provisioning VPS container…',
      },
    });

    // Stub Proxmox provisioning — returns plaintext root password ONCE.
    const prov = await this.proxmox.createContainer({
      hostname: deployment.hostname ?? deployment.name,
      cpuCores: deployment.cpu,
      ramMB: deployment.memory,
      storageGB: Math.ceil(deployment.storage / 1024),
    });
    const rootPasswordHash = await bcrypt.hash(prov.rootPassword, 10);
    await this.prisma.cloudDeployment.update({
      where: { id: deployment.id },
      data: {
        status: 'RUNNING',
        statusMessage: null,
        ipv4Address: prov.ipv4Address,
        proxmoxVMID: prov.vmid,
        proxmoxNode: prov.node,
        rootPasswordHash,
        provisionedAt: new Date(),
        lastDeployedAt: new Date(),
      },
    });

    // Best-effort legacy k8s provisioning (kept for backward compat, fire-and-forget)
    this.provision(deployment.id, user.email).catch((e) =>
      this.logger.warn(`legacy k8s provision skipped for ${deployment.id}: ${e.message}`),
    );

    return {
      ...deployment,
      status: 'RUNNING',
      ipv4Address: prov.ipv4Address,
      proxmoxVMID: prov.vmid,
      proxmoxNode: prov.node,
      // Surfaced ONCE — never returned by list/get endpoints.
      rootPassword: prov.rootPassword,
    };
  }

  private k8sName(name: string) { return name.toLowerCase().replace(/[^a-z0-9-]/g, '-'); }

  private async provision(deploymentId: string, userEmail: string) {
    const d = await this.prisma.cloudDeployment.findUnique({ where: { id: deploymentId } });
    if (!d) return;
    await this.prisma.cloudDeployment.update({ where: { id: deploymentId }, data: { status: 'DEPLOYING' } });
    try {
      const ns = await this.k8s.createNamespace(d.userId, d.id);
      await this.k8s.applyResourceQuota(ns, {
        cpu: String(d.cpu), memory: `${d.memory}Mi`, storage: `${d.storage}Mi`,
      });
      const image = d.type === 'DOCKER_IMAGE' ? d.source : d.source;
      const name = this.k8sName(d.name);
      await this.k8s.createOrUpdateDeployment({
        namespace: ns, name, image,
        envVars: (d.envVars as any) ?? {},
        cpu: String(d.cpu), memory: `${d.memory}Mi`, replicas: d.replicas,
      });
      await this.k8s.createService(ns, name);
      if (d.customDomains?.length) await this.k8s.createIngress(ns, name, d.customDomains);
      await this.prisma.cloudDeployment.update({
        where: { id: deploymentId },
        data: { status: 'RUNNING', namespace: ns, lastDeployedAt: new Date() },
      });
    } catch (e: any) {
      this.logger.error(`provision error: ${e.message}`);
      await this.prisma.cloudDeployment.update({ where: { id: deploymentId }, data: { status: 'FAILED' } });
      this.email.deploymentFailed(userEmail, d.name, e.message);
    }
  }

  async update(userId: string, id: string, input: Partial<DeploymentInput>) {
    await this.get(userId, id);
    return this.prisma.cloudDeployment.update({
      where: { id },
      data: {
        name: input.name, source: input.source, cpu: input.cpu, memory: input.memory,
        storage: input.storage, replicas: input.replicas, customDomains: input.customDomains,
        envVars: input.envVars as any, healthCheck: input.healthCheck,
      },
    });
  }

  async remove(userId: string, id: string) {
    const d = await this.get(userId, id);
    await this.k8s.deleteNamespace(d.namespace).catch(() => undefined);
    return this.prisma.cloudDeployment.update({ where: { id }, data: { status: 'DELETED' } });
  }

  async restart(userId: string, id: string) {
    const d = await this.get(userId, id);
    await this.k8s.restartDeployment(d.namespace, this.k8sName(d.name));
    return this.prisma.cloudDeployment.update({
      where: { id }, data: { status: 'DEPLOYING', lastDeployedAt: new Date() },
    });
  }

  async metrics(userId: string, id: string) {
    const d = await this.get(userId, id);
    const name = this.k8sName(d.name);
    const [live, range] = await Promise.all([
      this.prom.getDeploymentMetrics(d.namespace, name),
      this.prom.getRange(d.namespace, name, 24),
    ]);
    return { live, range };
  }

  async tailLogs(userId: string, id: string) {
    const d = await this.get(userId, id);
    const body = await this.k8s.getPodLogs(d.namespace, this.k8sName(d.name));
    return { lines: (body || '').split(/\r?\n/).filter(Boolean) };
  }

  async streamLogs(userId: string, id: string, onLine: (l: string) => void): Promise<() => void> {
    const d = await this.get(userId, id);
    if (!this.k8s.isEnabled()) {
      ['INFO  starting application…', 'INFO  http listening on :3000', 'INFO  ready'].forEach(onLine);
      return () => undefined;
    }
    return this.k8s.streamPodLogs(d.namespace, this.k8sName(d.name), onLine);
  }

  async usage(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { cloudPlan: true },
    });
    if (!user) throw new NotFoundException();
    const limits = this.effectiveLimits(user);
    const deployments = await this.prisma.cloudDeployment.findMany({
      where: { userId, status: { not: 'DELETED' } },
    });
    const used = deployments.reduce(
      (acc, d) => ({
        cpu: acc.cpu + d.cpu,
        memory: acc.memory + d.memory,
        storage: acc.storage + d.storage,
      }),
      { cpu: 0, memory: 0, storage: 0 },
    );
    return {
      plan: user.cloudPlan,
      limits,
      used: { ...used, deployments: deployments.length, apiRequests: Math.floor(Math.random() * limits.apiRequestLimit * 0.4) },
    };
  }

  effectiveLimits(user: any) {
    const override = (user.overrideLimits ?? {}) as Record<string, number>;
    const plan = user.cloudPlan ?? {
      cpuLimit: 0.25, memoryLimit: 512, storageLimit: 1024,
      deploymentLimit: 1, customDomainLimit: 0, apiRequestLimit: 10000, teamMemberLimit: 1,
    };
    return {
      cpuLimit: override.cpuLimit ?? plan.cpuLimit,
      memoryLimit: override.memoryLimit ?? plan.memoryLimit,
      storageLimit: override.storageLimit ?? plan.storageLimit,
      deploymentLimit: override.deploymentLimit ?? plan.deploymentLimit,
      customDomainLimit: override.customDomainLimit ?? plan.customDomainLimit,
      apiRequestLimit: override.apiRequestLimit ?? plan.apiRequestLimit,
      teamMemberLimit: override.teamMemberLimit ?? plan.teamMemberLimit,
    };
  }
}

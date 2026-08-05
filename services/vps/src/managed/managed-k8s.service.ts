import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { encryptSecret, decryptSecret } from '../../../../shared/crypto/crypto.util';

const NAME_RE = /^[a-z][a-z0-9-]{2,30}$/;
const SUPPORTED_VERSIONS = ['1.29', '1.30', '1.31', '1.32'];

/**
 * Tier 9 — Managed Kubernetes control plane.
 * Clusters and node pools are modelled here; the provisioner reports back the
 * API endpoint and kubeconfig once the control plane nodes are up.
 */
@Injectable()
export class ManagedK8sService {
  private readonly logger = new Logger(ManagedK8sService.name);

  constructor(private readonly prisma: PrismaService) {}

  versions() {
    return SUPPORTED_VERSIONS;
  }

  async createCluster(
    userId: string,
    input: {
      name: string;
      k8sVersion?: string;
      region?: string;
      organizationId?: string;
      nodePool?: { name?: string; nodeCount?: number; cpuCores?: number; memoryMb?: number; storageGb?: number };
    },
  ) {
    const name = (input.name || '').trim().toLowerCase();
    if (!NAME_RE.test(name)) {
      throw new BadRequestException('Cluster name must be 3-31 lowercase chars');
    }
    const version = input.k8sVersion || '1.31';
    if (!SUPPORTED_VERSIONS.includes(version)) {
      throw new BadRequestException(`Unsupported version. Supported: ${SUPPORTED_VERSIONS.join(', ')}`);
    }
    const clash = await this.prisma.managedK8sCluster.findFirst({
      where: { userId, name, deletedAt: null },
    });
    if (clash) throw new ConflictException('Cluster name already used');

    const pool = input.nodePool ?? {};
    return this.prisma.managedK8sCluster.create({
      data: {
        userId,
        organizationId: input.organizationId ?? null,
        name,
        k8sVersion: version,
        region: input.region || 'eu-central',
        nodePools: {
          create: [
            {
              name: pool.name?.trim() || 'default',
              nodeCount: Math.min(Math.max(pool.nodeCount ?? 2, 1), 50),
              cpuCores: Math.min(Math.max(pool.cpuCores ?? 2, 1), 32),
              memoryMb: Math.min(Math.max(pool.memoryMb ?? 4096, 1024), 131072),
              storageGb: Math.min(Math.max(pool.storageGb ?? 40, 20), 2000),
            },
          ],
        },
      },
      include: { nodePools: true },
    });
  }

  async list(userId: string) {
    return this.prisma.managedK8sCluster.findMany({
      where: { userId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
      include: { nodePools: true },
    });
  }

  private async owned(userId: string, id: string) {
    const cluster = await this.prisma.managedK8sCluster.findFirst({
      where: { id, deletedAt: null },
      include: { nodePools: true },
    });
    if (!cluster) throw new NotFoundException('Cluster not found');
    if (cluster.userId !== userId) throw new ForbiddenException('Not your cluster');
    return cluster;
  }

  async get(userId: string, id: string) {
    return this.owned(userId, id);
  }

  async markReady(id: string, endpoint: string, kubeconfig: string) {
    await this.prisma.managedK8sNodePool.updateMany({
      where: { clusterId: id },
      data: { status: 'RUNNING' },
    });
    return this.prisma.managedK8sCluster.update({
      where: { id },
      data: {
        status: 'RUNNING',
        endpoint,
        kubeconfigCipher: encryptSecret(kubeconfig),
        errorMessage: null,
      },
    });
  }

  async kubeconfig(userId: string, id: string) {
    const cluster = await this.owned(userId, id);
    const config = decryptSecret((cluster as any).kubeconfigCipher);
    if (!config) throw new BadRequestException('Cluster is still provisioning');
    return { kubeconfig: config, endpoint: cluster.endpoint };
  }

  async addNodePool(
    userId: string,
    clusterId: string,
    input: { name: string; nodeCount?: number; cpuCores?: number; memoryMb?: number; storageGb?: number; autoscale?: boolean; minNodes?: number; maxNodes?: number },
  ) {
    const cluster = await this.owned(userId, clusterId);
    const name = (input.name || '').trim().toLowerCase();
    if (!NAME_RE.test(name)) throw new BadRequestException('Invalid node pool name');
    if (cluster.nodePools.some((p) => p.name === name)) {
      throw new ConflictException('Node pool already exists');
    }
    const minNodes = Math.max(input.minNodes ?? 1, 1);
    const maxNodes = Math.max(input.maxNodes ?? 3, minNodes);
    return this.prisma.managedK8sNodePool.create({
      data: {
        clusterId: cluster.id,
        name,
        nodeCount: Math.min(Math.max(input.nodeCount ?? minNodes, 1), 50),
        cpuCores: Math.min(Math.max(input.cpuCores ?? 2, 1), 32),
        memoryMb: Math.min(Math.max(input.memoryMb ?? 4096, 1024), 131072),
        storageGb: Math.min(Math.max(input.storageGb ?? 40, 20), 2000),
        autoscale: input.autoscale ?? false,
        minNodes,
        maxNodes,
      },
    });
  }

  async scaleNodePool(userId: string, clusterId: string, poolId: string, nodeCount: number) {
    const cluster = await this.owned(userId, clusterId);
    const pool = cluster.nodePools.find((p) => p.id === poolId);
    if (!pool) throw new NotFoundException('Node pool not found');
    const count = Math.floor(nodeCount);
    if (!Number.isFinite(count) || count < 1 || count > 50) {
      throw new BadRequestException('Node count must be between 1 and 50');
    }
    if (pool.autoscale && (count < pool.minNodes || count > pool.maxNodes)) {
      throw new BadRequestException(
        `Autoscaling pool accepts ${pool.minNodes}-${pool.maxNodes} nodes`,
      );
    }
    return this.prisma.managedK8sNodePool.update({
      where: { id: poolId },
      data: { nodeCount: count },
    });
  }

  async deleteNodePool(userId: string, clusterId: string, poolId: string) {
    const cluster = await this.owned(userId, clusterId);
    if (cluster.nodePools.length <= 1) {
      throw new BadRequestException('A cluster must keep at least one node pool');
    }
    await this.prisma.managedK8sNodePool.delete({ where: { id: poolId } });
    return { deleted: true, id: poolId };
  }

  async destroy(userId: string, id: string) {
    const cluster = await this.owned(userId, id);
    await this.prisma.managedK8sCluster.update({
      where: { id: cluster.id },
      data: { status: 'DELETED', deletedAt: new Date() },
    });
    this.logger.log(`Managed k8s cluster ${cluster.name} deleted by ${userId}`);
    return { deleted: true, id: cluster.id };
  }
}

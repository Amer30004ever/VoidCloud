import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { ClientProxy, ClientProxyFactory, Transport } from '@nestjs/microservices';
import { lastValueFrom } from 'rxjs';
import { BillingMode, CloudDeploymentStatus, Role, VpsProvisionJobStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ProxmoxService } from '../proxmox/proxmox.service';
import { ClustersService } from '../clusters/clusters.service';
import { CreditService } from '../../../billing/src/billing/credit.service';
import { CreateVpsDto } from './dto/vps.dto';
import { IsInProxmoxPoolConstraint } from './dto/static-ip.validator';
import {
  rabbitConfig,
  VPS_PROVISION_QUEUE,
  VPS_PROVISION_COMPLETE_EXCHANGE,
  VPS_PROVISION_COMPLETE_ROUTING,
} from './rabbitmq.config';
import { withCorrelationId } from '../../../shared/logging';

export interface ProvisionJobView {
  id: string;
  idempotencyKey: string;
  status: VpsProvisionJobStatus;
  vpsId: string | null;
  result: Record<string, unknown> | null;
  errorMessage: string | null;
  attempts: number;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Async VPS provisioning (Prompt 2.1).
 *
 * POST /vps returns a job immediately instead of holding the HTTP request open.
 * The actual Proxmox provisioning runs in a RabbitMQ consumer (processJob),
 * so a slow/cold Proxmox call never blocks the API. The frontend polls
 * GET /vps/jobs/:id to drive its pending → success/failure UI.
 *
 * Idempotency: the client sends a client-generated UUID (idempotencyKey). A
 * re-submit with the same key returns the existing job rather than spinning up
 * a second VM.
 *
 * On success the worker publishes a `vps.provisioned` event to the
 * vps.events exchange; the notification-service consumes it and creates the
 * in-app completion notification (the cross-service notify path).
 */
@Injectable()
export class VpsProvisionService {
  private readonly logger = new Logger(VpsProvisionService.name);
  private readonly client: ClientProxy;
  private readonly brokerUrls: string[];

  constructor(
    private readonly prisma: PrismaService,
    private readonly proxmox: ProxmoxService,
    private readonly clusters: ClustersService,
    private readonly creditService: CreditService,
  ) {
    const cfg = rabbitConfig(VPS_PROVISION_QUEUE);
    this.client = ClientProxyFactory.create(cfg);
    this.brokerUrls = (cfg.options as { urls: string[] }).urls;
  }

  /** Submit a provisioning job. Idempotent on idempotencyKey. Returns the job. */
  async enqueue(
    dto: CreateVpsDto,
    user: { id: string; role: Role },
    idempotencyKey: string,
  ): Promise<ProvisionJobView> {
    if (!idempotencyKey) {
      throw new BadRequestException('idempotencyKey is required');
    }

    const existing = await this.prisma.vpsProvisionJob.findUnique({
      where: { idempotencyKey },
    });
    if (existing) {
      return this.toView(existing);
    }

    const tenantId = await this.resolveTenantId(user);
    const billingMode = dto.billingMode ?? 'SUBSCRIPTION';
    await this.creditService.canProvisionVps(user.id, billingMode).then(r => {
      if (!r.allowed) throw new BadRequestException(r.reason);
    });
    await this.assertQuota(tenantId, dto);

    const job = await this.prisma.vpsProvisionJob.create({
      data: {
        idempotencyKey,
        userId: user.id,
        status: VpsProvisionJobStatus.QUEUED,
        payload: dto as unknown as never,
      },
    });

    lastValueFrom(this.client.emit(VPS_PROVISION_QUEUE, { jobId: job.id })).catch((e) =>
      this.logger.warn(`Failed to enqueue provision job ${job.id}: ${e}`),
    );

    return this.toView(job);
  }

  async getJob(
    id: string,
    user: { id: string; role: Role },
  ): Promise<ProvisionJobView> {
    const job = await this.prisma.vpsProvisionJob.findUnique({ where: { id } });
    if (!job) throw new NotFoundException('Provisioning job not found');
    if (user.role !== Role.SUPER_ADMIN && job.userId !== user.id) {
      throw new NotFoundException('Provisioning job not found');
    }
    return this.toView(job);
  }

  async listJobs(user: { id: string; role: Role }) {
    const where = user.role === Role.SUPER_ADMIN ? {} : { userId: user.id };
    const jobs = await this.prisma.vpsProvisionJob.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    return jobs.map((j) => this.toView(j));
  }

  /**
   * Consumer entry point — performs the real provisioning. Called by the RMQ
   * message handler in VpsModule. Never throws into the broker loop; records
   * FAILED on error so the job is inspectable and retryable.
   */
  async processJob(jobId: string): Promise<void> {
    const job = await this.prisma.vpsProvisionJob.findUnique({ where: { id: jobId } });
    if (!job) {
      this.logger.warn(`Provision job ${jobId} not found — skipping`);
      return;
    }
    if (job.status === VpsProvisionJobStatus.SUCCEEDED) {
      return; // already done (e.g. at-least-once redelivery)
    }

    await this.prisma.vpsProvisionJob.update({
      where: { id: jobId },
      data: { status: VpsProvisionJobStatus.PROCESSING, attempts: { increment: 1 } },
    });

    const dto = job.payload as unknown as CreateVpsDto;
    try {
      const deployment = await this.provisionSync(dto, job.userId, jobId);
      await this.prisma.vpsProvisionJob.update({
        where: { id: jobId },
        data: {
          status: VpsProvisionJobStatus.SUCCEEDED,
          vpsId: deployment.id,
          result: {
            vpsId: deployment.id,
            ipv4Address: deployment.ipv4Address,
            proxmoxVMID: deployment.proxmoxVMID,
            node: deployment.proxmoxNode,
          } as never,
        },
      });
      // Notify the tenant via the notification service (cross-service RMQ event).
      this.publishComplete({
        jobId,
        userId: job.userId,
        vpsId: deployment.id,
        name: deployment.name,
        ipv4Address: deployment.ipv4Address,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(`Provision job ${jobId} failed: ${message}`);
      await this.prisma.vpsProvisionJob.update({
        where: { id: jobId },
        data: { status: VpsProvisionJobStatus.FAILED, errorMessage: message },
      });
    }
  }

  /** Core provisioning logic, extracted from the prior synchronous create(). */
  private async provisionSync(
    dto: CreateVpsDto,
    userId: string,
    jobId: string,
  ) {
    const tenantId = await this.resolveTenantId({ id: userId, role: Role.USER });
    const billingMode = dto.billingMode ?? 'SUBSCRIPTION';
    await this.creditService.canProvisionVps(userId, billingMode).then(r => {
      if (!r.allowed) throw new BadRequestException(r.reason);
    });
    await this.assertQuota(tenantId, dto);

    // Defensive re-validation of the static IP on the async path: the worker
    // replays a persisted JSON payload, so the controller's DTO validation is
    // not in effect here. A tenant may only name an in-pool, non-reserved IP.
    if (dto.staticIp && !new IsInProxmoxPoolConstraint().validate(dto.staticIp)) {
      throw new BadRequestException(
        `staticIp ${dto.staticIp} is not a valid in-pool address`,
      );
    }

    const scheduled = await this.clusters
      .schedule({
        cpu: dto.cpu ?? 1,
        ramMB: dto.memory ?? 1024,
        diskGB: Math.ceil((dto.storage ?? 10240) / 1024),
      })
      .catch(() => ({ chosen: null, allocationId: null } as { chosen: unknown; allocationId: string | null }));

    let provision;
    try {
      provision = await this.proxmox.createContainer({
        hostname: dto.name,
        cpuCores: dto.cpu ?? 1,
        ramMB: dto.memory ?? 1024,
        storageGB: Math.ceil((dto.storage ?? 10240) / 1024),
        planSlug: dto.planSlug,
        tenantId: userId,
        ...(dto.staticIp ? { staticIp: dto.staticIp } : {}),
      });
    } catch (err) {
      if ((scheduled as any)?.allocationId) {
        await this.clusters
          .releaseAllocation((scheduled as any).allocationId)
          .catch(() => undefined);
      }
      throw err;
    }

    const chosenClusterId = (scheduled as { chosen?: { id?: string } } | null)?.chosen?.id ?? null;
    const deployment = await this.prisma.cloudDeployment.create({
      data: {
        userId,
        tenantId,
        name: dto.name,
        source: 'proxmox-lxc',
        namespace: `vps-${provision.vmid}`,
        hostname: dto.name,
        ipv4Address: provision.ipv4Address,
        proxmoxVMID: provision.vmid,
        proxmoxNode: provision.node,
        proxmoxClusterId: chosenClusterId,
        cpu: dto.cpu ?? 1,
        memory: dto.memory ?? 1024,
        storage: dto.storage ?? 10240,
        status: CloudDeploymentStatus.RUNNING,
        provisionedAt: new Date(),
        billingMode,
        metadata: scheduled?.chosen
          ? ({ scheduledCluster: (scheduled.chosen as { id: string; name: string }).name, provisionJobId: jobId } as never)
          : ({ provisionJobId: jobId } as never),
      } as never,
    });

    if ((scheduled as any)?.allocationId) {
      await this.clusters
        .commitAllocation((scheduled as any).allocationId)
        .catch(() => undefined);
    }

    await this.recomputeQuota(tenantId);
    return deployment;
  }

  private publishComplete(payload: {
    jobId: string;
    userId: string;
    vpsId: string;
    name: string;
    ipv4Address?: string | null;
  }) {
    const publisher = ClientProxyFactory.create({
      transport: Transport.RMQ,
      options: {
        urls: this.brokerUrls,
        exchange: VPS_PROVISION_COMPLETE_EXCHANGE,
        exchangeType: 'direct',
        routingKey: VPS_PROVISION_COMPLETE_ROUTING,
        queue: VPS_PROVISION_COMPLETE_ROUTING,
        queueOptions: { durable: true },
      } as Record<string, unknown>,
    });
    const message = withCorrelationId((payload as any).correlationId, payload);
    lastValueFrom(publisher.emit(VPS_PROVISION_COMPLETE_ROUTING, message)).catch((e) =>
      this.logger.warn(`Failed to publish vps.provisioned event: ${e}`),
    );
  }

  private toView(j: {
    id: string;
    idempotencyKey: string;
    status: VpsProvisionJobStatus;
    vpsId: string | null;
    result: unknown;
    errorMessage: string | null;
    attempts: number;
    createdAt: Date;
    updatedAt: Date;
  }): ProvisionJobView {
    return {
      id: j.id,
      idempotencyKey: j.idempotencyKey,
      status: j.status,
      vpsId: j.vpsId,
      result: (j.result as Record<string, unknown>) ?? null,
      errorMessage: j.errorMessage,
      attempts: j.attempts,
      createdAt: j.createdAt,
      updatedAt: j.updatedAt,
    };
  }

  private async resolveTenantId(user: { id: string; role: Role }): Promise<string> {
    if (user.role === Role.SUPER_ADMIN) {
      return user.id;
    }
    const userTenant = await this.prisma.userTenant.findFirst({
      where: { userId: user.id },
      select: { tenantId: true },
    });
    return userTenant?.tenantId ?? user.id;
  }

  private async assertQuota(tenantId: string, dto: CreateVpsDto) {
    const quota = await this.prisma.tenantQuota.findUnique({ where: { tenantId } });
    if (!quota) {
      await this.prisma.tenantQuota.create({ data: { tenantId } });
      return;
    }

    const cpu = dto.cpu ?? 1;
    const ramMb = dto.memory ?? 1024;
    const diskGb = Math.ceil((dto.storage ?? 10240) / 1024);

    const agg = await this.prisma.cloudDeployment.aggregate({
      where: { tenantId, status: { not: CloudDeploymentStatus.DELETED } },
      _sum: { cpu: true, memory: true, storage: true },
      _count: true,
    });

    const usedCpu = agg._sum.cpu ?? 0;
    const usedRam = agg._sum.memory ?? 0;
    const usedDisk = Math.ceil((agg._sum.storage ?? 0) / 1024);
    const usedVps = agg._count;

    if (usedVps >= quota.maxVpsCount) {
      throw new BadRequestException(
        `VPS quota exceeded: you have ${usedVps}/${quota.maxVpsCount} VPS instances`,
      );
    }
    if (usedCpu + cpu > quota.maxCpu) {
      throw new BadRequestException(
        `CPU quota exceeded: requested ${cpu}, used ${usedCpu}, limit ${quota.maxCpu}`,
      );
    }
    if (usedRam + ramMb > quota.maxRamMb) {
      throw new BadRequestException(
        `RAM quota exceeded: requested ${ramMb}MB, used ${usedRam}MB, limit ${quota.maxRamMb}MB`,
      );
    }
    if (usedDisk + diskGb > quota.maxDiskGb) {
      throw new BadRequestException(
        `Disk quota exceeded: requested ${diskGb}GB, used ${usedDisk}GB, limit ${quota.maxDiskGb}GB`,
      );
    }
  }

  private async recomputeQuota(tenantId: string) {
    const agg = await this.prisma.cloudDeployment.aggregate({
      where: { tenantId, status: { not: CloudDeploymentStatus.DELETED } },
      _sum: { cpu: true, memory: true, storage: true },
      _count: true,
    });
    await this.prisma.tenantQuota.update({
      where: { tenantId },
      data: {
        currentCpu: agg._sum.cpu ?? 0,
        currentRamMb: agg._sum.memory ?? 0,
        currentDiskGb: Math.ceil((agg._sum.storage ?? 0) / 1024),
        currentVpsCount: agg._count,
      },
    }).catch(() => undefined);
  }
}

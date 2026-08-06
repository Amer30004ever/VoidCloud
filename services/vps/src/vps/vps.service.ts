import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { CloudDeploymentStatus, Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ProxmoxService } from '../proxmox/proxmox.service';
import { ClustersService } from '../clusters/clusters.service';
import { CreditService } from '../../../billing/src/billing/credit.service';
import { CreateVpsDto, UpdateVpsDto } from './dto/vps.dto';
import { CreateBackupScheduleDto } from '../backup/backup.dto';
import { VpsBackupSchedulerService } from '../backup/backup-scheduler.service';
import { K8sAppService } from '../k8s/k8s-app.service';
import { randomBytes } from 'crypto';
import { withImpersonation } from '../common/audit-impersonation';


@Injectable()
export class VpsService {
  private readonly logger = new Logger(VpsService.name);
  constructor(
    private readonly prisma: PrismaService,
    private readonly proxmox: ProxmoxService,
    private readonly clusters: ClustersService,
    private readonly creditService: CreditService,
    private readonly backupSchedulerService: VpsBackupSchedulerService,
    private readonly k8sApp: K8sAppService,
  ) {}

  async list(user: { id: string; role: Role; impersonatedBy?: string }) {
    const where =
      user.role === Role.SUPER_ADMIN ? {} : { userId: user.id };
    return this.prisma.cloudDeployment.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
  }

  async get(id: string, user: { id: string; role: Role; impersonatedBy?: string }) {
    const vps = await this.findOwned(id, user);
    return vps;
  }

  async create(dto: CreateVpsDto, user: { id: string; role: Role; impersonatedBy?: string }) {
    const tenantId = await this.resolveTenantId(user);
    await this.assertQuota(tenantId, dto);

    const billingMode = dto.billingMode ?? 'SUBSCRIPTION';
    await this.creditService.canProvisionVps(user.id, billingMode).then(r => {
      if (!r.allowed) throw new BadRequestException(r.reason);
    });

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
        tenantId: user.id,
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
        userId: user.id,
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
          ? ({ scheduledCluster: (scheduled.chosen as { id: string; name: string }).name } as never)
          : undefined,
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

  async update(id: string, dto: UpdateVpsDto, user: { id: string; role: Role; impersonatedBy?: string }) {
    await this.findOwned(id, user);
    return this.prisma.cloudDeployment.update({
      where: { id },
      data: dto,
    });
  }

  async start(id: string, user: { id: string; role: Role; impersonatedBy?: string }) {
    const vps = await this.findOwned(id, user);
    if (vps.billingMode === 'PAY_AS_YOU_GO') {
      const canStart = await this.creditService.canStartPaygVps(user.id, 1);
      if (!canStart) {
        throw new BadRequestException(
          'Cannot start VPS: credit balance is zero or negative. Please top up your credits.',
        );
      }
    } else {
      const check = await this.creditService.canProvisionVps(user.id, 'SUBSCRIPTION');
      if (!check.allowed) {
        throw new BadRequestException(`Cannot start VPS: ${check.reason}`);
      }
    }
    if (vps.proxmoxVMID) {
      await this.proxmox.startContainer(vps.proxmoxVMID, vps.proxmoxNode ?? undefined);
    }
    return this.setStatus(id, CloudDeploymentStatus.RUNNING);
  }

  async stop(id: string, user: { id: string; role: Role; impersonatedBy?: string }) {
    const vps = await this.findOwned(id, user);
    if (vps.proxmoxVMID) {
      await this.proxmox.stopContainer(vps.proxmoxVMID, vps.proxmoxNode ?? undefined);
    }
    return this.setStatus(id, CloudDeploymentStatus.STOPPED);
  }

  async restart(id: string, user: { id: string; role: Role; impersonatedBy?: string }) {
    await this.stop(id, user);
    return this.start(id, user);
  }

  async remove(id: string, user: { id: string; role: Role; impersonatedBy?: string }) {
    const vps = await this.findOwned(id, user);
    const tenantId = vps.tenantId ?? user.id;
    if (vps.proxmoxVMID) {
      await this.proxmox.destroyContainer(vps.proxmoxVMID, vps.proxmoxNode ?? undefined);
    }
    await this.prisma.cloudDeployment.delete({ where: { id } });
    await this.recomputeQuota(tenantId);
    return { success: true };
  }

  async status(id: string, user: { id: string; role: Role; impersonatedBy?: string }) {
    const vps = await this.findOwned(id, user);
    if (!vps.proxmoxVMID) {
      return { status: vps.status, live: false };
    }
    const live = await this.proxmox.getStatus(
      vps.proxmoxVMID,
      vps.proxmoxNode ?? undefined,
    );
    return { status: vps.status, live };
  }

  async snapshot(id: string, user: { id: string; role: Role; impersonatedBy?: string }) {
    const vps = await this.findOwned(id, user);
    return {
      success: true,
      snapshot: {
        id: `snap-${Date.now()}`,
        vpsId: vps.id,
        vmid: vps.proxmoxVMID,
      },
    };
  }

  async backups(id: string, user: { id: string; role: Role; impersonatedBy?: string }) {
    const vps = await this.findOwned(id, user);
    return this.backupSchedulerService.getBackups(vps.id);
  }

  async getBackupSchedule(id: string, user: { id: string; role: Role; impersonatedBy?: string }) {
    const vps = await this.findOwned(id, user);
    return this.backupSchedulerService.getSchedule(vps.id);
  }

  async createBackupSchedule(id: string, dto: CreateBackupScheduleDto, user: { id: string; role: Role; impersonatedBy?: string }) {
    const vps = await this.findOwned(id, user);
    return this.backupSchedulerService.createSchedule(vps.id, dto);
  }

  async restoreBackup(backupId: string, user: { id: string; role: Role; impersonatedBy?: string }) {
    const backup = await this.prisma.cloudBackup.findUnique({
      where: { id: backupId },
      include: { deployment: true },
    });
    if (!backup) {
      throw new NotFoundException('Backup not found');
    }
    if (user.role !== Role.SUPER_ADMIN && backup.deployment.userId !== user.id) {
      throw new NotFoundException('Backup not found');
    }
    return this.backupSchedulerService.restoreBackup(backupId);
  }

  async resize(
    id: string,
    resources: { cpu?: number; memory?: number; storage?: number },
    user: { id: string; role: Role; impersonatedBy?: string },
  ) {
    const vps = await this.findOwned(id, user);
    const tenantId = vps.tenantId ?? user.id;
    await this.assertQuotaForResize(tenantId, resources);
    const updated = await this.prisma.cloudDeployment.update({
      where: { id },
      data: resources,
    });
    await this.recomputeQuota(tenantId);
    return updated;
  }

  async console(id: string, user: { id: string; role: Role; impersonatedBy?: string }) {
    const vps = await this.findOwned(id, user);
    if (!vps.proxmoxVMID) {
      throw new BadRequestException('Console unavailable');
    }
    const host = process.env.PROXMOX_HOST ?? '10.51.100.10';
    return {
      url: `https://${host}:8006/?console=lxc&vmid=${vps.proxmoxVMID}&node=${vps.proxmoxNode ?? process.env.PROXMOX_NODE}`,
    };
  }

  async clone(id: string, name: string, user: { id: string; role: Role; impersonatedBy?: string }) {
    const vps = await this.findOwned(id, user);
    return this.create(
      {
        name,
        cpu: vps.cpu,
        memory: vps.memory,
        storage: vps.storage,
      },
      user,
    );
  }

  async getQuota(user: { id: string; role: Role; impersonatedBy?: string }) {
    const tenantId = await this.resolveTenantId(user);
    const quota = await this.prisma.tenantQuota.findUnique({ where: { tenantId } });
    if (!quota) {
      const created = await this.prisma.tenantQuota.create({ data: { tenantId } });
      return { ...created, cpuUsed: 0, ramUsed: 0, diskUsed: 0, vpsCount: 0 };
    }
    const agg = await this.prisma.cloudDeployment.aggregate({
      where: { tenantId, status: { not: CloudDeploymentStatus.DELETED } },
      _sum: { cpu: true, memory: true, storage: true },
      _count: true,
    });
    return {
      ...quota,
      cpuUsed: agg._sum.cpu ?? 0,
      ramUsed: agg._sum.memory ?? 0,
      diskUsed: Math.ceil((agg._sum.storage ?? 0) / 1024),
      vpsCount: agg._count,
    };
  }

  async adminGetQuota(tenantId: string) {
    const quota = await this.prisma.tenantQuota.findUnique({ where: { tenantId } });
    if (!quota) {
      const created = await this.prisma.tenantQuota.create({ data: { tenantId } });
      return { ...created, cpuUsed: 0, ramUsed: 0, diskUsed: 0, vpsCount: 0 };
    }
    const agg = await this.prisma.cloudDeployment.aggregate({
      where: { tenantId, status: { not: CloudDeploymentStatus.DELETED } },
      _sum: { cpu: true, memory: true, storage: true },
      _count: true,
    });
    return {
      ...quota,
      cpuUsed: agg._sum.cpu ?? 0,
      ramUsed: agg._sum.memory ?? 0,
      diskUsed: Math.ceil((agg._sum.storage ?? 0) / 1024),
      vpsCount: agg._count,
    };
  }

  async adminSetQuota(tenantId: string, data: { maxCpu?: number; maxRamMb?: number; maxDiskGb?: number; maxVpsCount?: number }) {
    const quota = await this.prisma.tenantQuota.upsert({
      where: { tenantId },
      create: { tenantId, ...data },
      update: data,
    });
    await this.recomputeQuota(tenantId);
    return this.adminGetQuota(tenantId);
  }

  async reconcileAllQuotas() {
    const quotas = await this.prisma.tenantQuota.findMany();
    for (const quota of quotas) {
      await this.recomputeQuota(quota.tenantId);
    }
    return { reconciled: quotas.length };
  }

  async addDomain(vpsId: string, userId: string, domain: string) {
    const vps = await this.prisma.cloudDeployment.findUnique({ where: { id: vpsId } });
    if (!vps) throw new NotFoundException('VPS not found');
    if (vps.userId !== userId) {
      throw new NotFoundException('VPS not found');
    }

    const verifyToken = randomBytes(16).toString('hex');

    return this.prisma.domain.create({
      data: {
        vpsId,
        userId,
        domain,
        verifyToken,
        status: 'PENDING_VERIFICATION',
      },
    });
  }

  async listDomains(vpsId: string, user: { id: string; role: Role; impersonatedBy?: string }) {
    const vps = await this.findOwned(vpsId, user);
    return this.prisma.domain.findMany({
      where: { vpsId: vps.id },
      orderBy: { createdAt: 'desc' },
    });
  }

  async verifyDomain(domainId: string, dnsValue: string) {
    const domain = await this.prisma.domain.findUnique({
      where: { id: domainId },
      include: { vps: true },
    });
    if (!domain) throw new NotFoundException('Domain not found');

    if (domain.status === 'VERIFIED') {
      return domain;
    }

    if (domain.verifyToken !== dnsValue) {
      throw new BadRequestException('DNS verification failed: token mismatch');
    }

    const now = new Date();
    return this.prisma.domain.update({
      where: { id: domain.id },
      data: {
        status: 'VERIFIED',
        verifiedAt: now,
      },
    });
  }

  async getDomainStatus(domainId: string) {
    const domain = await this.prisma.domain.findUnique({
      where: { id: domainId },
    });
    if (!domain) throw new NotFoundException('Domain not found');
    return domain;
  }

  private async resolveTenantId(user: { id: string; role: Role; impersonatedBy?: string }): Promise<string> {
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

  private async assertQuotaForResize(
    tenantId: string,
    resources: { cpu?: number; memory?: number; storage?: number },
  ) {
    const quota = await this.prisma.tenantQuota.findUnique({ where: { tenantId } });
    if (!quota) return;

    const cpu = resources.cpu ?? 0;
    const ramMb = resources.memory ?? 0;
    const diskGb = Math.ceil((resources.storage ?? 0) / 1024);

    const agg = await this.prisma.cloudDeployment.aggregate({
      where: { tenantId, status: { not: CloudDeploymentStatus.DELETED } },
      _sum: { cpu: true, memory: true, storage: true },
    });

    const usedCpu = agg._sum.cpu ?? 0;
    const usedRam = agg._sum.memory ?? 0;
    const usedDisk = Math.ceil((agg._sum.storage ?? 0) / 1024);

    if (usedCpu + cpu > quota.maxCpu) {
      throw new BadRequestException(`CPU quota exceeded after resize: ${usedCpu + cpu}/${quota.maxCpu}`);
    }
    if (usedRam + ramMb > quota.maxRamMb) {
      throw new BadRequestException(`RAM quota exceeded after resize: ${usedRam + ramMb}MB/${quota.maxRamMb}MB`);
    }
    if (usedDisk + diskGb > quota.maxDiskGb) {
      throw new BadRequestException(`Disk quota exceeded after resize: ${usedDisk + diskGb}GB/${quota.maxDiskGb}GB`);
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

  private findOwned(id: string, user: { id: string; role: Role; impersonatedBy?: string }) {
    return this.prisma.cloudDeployment.findUnique({ where: { id } }).then((vps) => {
      if (!vps) throw new NotFoundException('VPS not found');
      if (user.role !== Role.SUPER_ADMIN && vps.userId !== user.id) {
        throw new NotFoundException('VPS not found');
      }
      return vps;
    });
  }

  private setStatus(id: string, status: CloudDeploymentStatus) {
    return this.prisma.cloudDeployment.update({
      where: { id },
      data: { status },
    });
  }

  appCatalog() {
    return [
      { id: 'wordpress', name: 'WordPress', description: 'Popular CMS', icon: 'W', category: 'CMS' },
      { id: 'docker', name: 'Docker', description: 'Container runtime', icon: 'D', category: 'Runtime' },
      { id: 'lemp', name: 'LEMP Stack', description: 'Linux + Nginx + MySQL + PHP', icon: 'L', category: 'Stack' },
      { id: 'lamp', name: 'LAMP Stack', description: 'Linux + Apache + MySQL + PHP', icon: 'L', category: 'Stack' },
      { id: 'code-server', name: 'code-server', description: 'VS Code in browser', icon: 'C', category: 'IDE' },
      { id: 'gitea', name: 'Gitea', description: 'Self-hosted Git', icon: 'G', category: 'Dev' },
      { id: 'portainer', name: 'Portainer', description: 'Container management', icon: 'P', category: 'Ops' },
      { id: 'umami', name: 'Umami', description: 'Privacy-friendly analytics', icon: 'U', category: 'Analytics' },
    ];
  }

  async installApp(vpsId: string, user: { id: string; role: Role; impersonatedBy?: string }, appId: string) {
    const vps = await this.findOwned(vpsId, user);
    const installed = (vps.installedApps as Record<string, any>[]) || [];
    if (installed.find((a) => a.id === appId)) {
      throw new BadRequestException('App already installed');
    }
    const catalog = this.appCatalog().find((a) => a.id === appId);
    if (!catalog) throw new BadRequestException('Unknown app');

    const tenantId = vps.tenantId ?? user.id;
    let k8sMeta: { deploymentName: string; serviceName: string; namespace: string } | undefined;
    try {
      k8sMeta = await this.k8sApp.deploy(vpsId, tenantId, appId);
    } catch (e: any) {
      this.logger.warn(`K8s deploy failed for ${appId} on ${vpsId}: ${e?.message ?? e}`);
      await this.writeAudit('app.install', user, vps, { appId, status: 'failed', error: e?.message ?? String(e) }, 'failed');
      throw new BadRequestException(`Failed to deploy ${appId}: ${e?.message ?? e}`);
    }

    const entry = {
      id: appId,
      name: catalog.name,
      status: 'installing',
      installedAt: new Date().toISOString(),
      ...(k8sMeta ? { k8sDeployment: k8sMeta.deploymentName, k8sService: k8sMeta.serviceName, namespace: k8sMeta.namespace } : {}),
    };
    const updated = [...installed, entry];
    await this.prisma.cloudDeployment.update({
      where: { id: vpsId },
      data: { installedApps: updated, apps: [...(vps.apps || []), appId] },
    });

    await this.writeAudit('app.install', user, vps, { appId, status: 'installing', ...(k8sMeta ?? {}) });
    return entry;
  }

  async uninstallApp(vpsId: string, user: { id: string; role: Role; impersonatedBy?: string }, appId: string) {
    const vps = await this.findOwned(vpsId, user);
    const installed = ((vps.installedApps as Record<string, any>[]) || []).filter((a) => a.id !== appId);

    try {
      await this.k8sApp.remove(vpsId, appId);
    } catch (e: any) {
      this.logger.warn(`K8s remove failed for ${appId} on ${vpsId}: ${e?.message ?? e}`);
    }

    await this.prisma.cloudDeployment.update({
      where: { id: vpsId },
      data: { installedApps: installed, apps: (vps.apps || []).filter((a) => a !== appId) },
    });

    await this.writeAudit('app.uninstall', user, vps, { appId, status: 'removed' });
    return { ok: true };
  }

  async getAppStatus(vpsId: string, user: { id: string; role: Role; impersonatedBy?: string }, appId: string) {
    const vps = await this.findOwned(vpsId, user);
    const installed = (vps.installedApps as Record<string, any>[]) || [];
    const entry = installed.find((a) => a.id === appId);
    if (!entry) {
      throw new NotFoundException('App not installed');
    }
    const liveStatus = await this.k8sApp.getStatus(vpsId, appId);
    return {
      appId: entry.id,
      name: entry.name,
      status: liveStatus,
      installedAt: entry.installedAt,
      k8sDeployment: entry.k8sDeployment,
      k8sService: entry.k8sService,
      namespace: entry.namespace,
    };
  }

  private async writeAudit(
    action: string,
    actor: { id: string; role: Role; impersonatedBy?: string },
    vps: { id: string; name?: string; tenantId?: string },
    details?: Record<string, unknown>,
    status: string = 'SUCCESS',
  ) {
    try {
      await this.prisma.auditLog.create({
        data: {
          action,
          userId: actor.id,
          resource: `vps:${vps.id}`,
          details: withImpersonation(
            {
              vpsId: vps.id,
              vpsName: vps.name,
              tenantId: vps.tenantId,
              ...(details ?? {}),
            },
            actor,
          ) as never,
          status,
        },
      });

    } catch (e: any) {
      this.logger.warn(`audit log failed (${action}): ${e?.message ?? e}`);
    }
  }
}

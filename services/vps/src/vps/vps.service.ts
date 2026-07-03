import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CloudDeploymentStatus, Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ProxmoxService } from '../proxmox/proxmox.service';
import { CreateVpsDto, UpdateVpsDto } from './dto/vps.dto';

@Injectable()
export class VpsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly proxmox: ProxmoxService,
  ) {}

  async list(user: { id: string; role: Role }) {
    const where =
      user.role === Role.SUPER_ADMIN ? {} : { userId: user.id };
    return this.prisma.cloudDeployment.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
  }

  async get(id: string, user: { id: string; role: Role }) {
    const vps = await this.findOwned(id, user);
    return vps;
  }

  async create(dto: CreateVpsDto, user: { id: string }) {
    const provision = await this.proxmox.createContainer({
      hostname: dto.name,
      cpuCores: dto.cpu ?? 1,
      ramMB: dto.memory ?? 1024,
      storageGB: Math.ceil((dto.storage ?? 10240) / 1024),
      planSlug: dto.planSlug,
    });

    return this.prisma.cloudDeployment.create({
      data: {
        userId: user.id,
        name: dto.name,
        source: 'proxmox-lxc',
        namespace: `vps-${provision.vmid}`,
        hostname: dto.name,
        ipv4Address: provision.ipv4Address,
        proxmoxVMID: provision.vmid,
        proxmoxNode: provision.node,
        cpu: dto.cpu ?? 1,
        memory: dto.memory ?? 1024,
        storage: dto.storage ?? 10240,
        status: CloudDeploymentStatus.RUNNING,
        provisionedAt: new Date(),
      },
    });
  }

  async update(id: string, dto: UpdateVpsDto, user: { id: string; role: Role }) {
    await this.findOwned(id, user);
    return this.prisma.cloudDeployment.update({
      where: { id },
      data: dto,
    });
  }

  async start(id: string, user: { id: string; role: Role }) {
    const vps = await this.findOwned(id, user);
    if (vps.proxmoxVMID) {
      await this.proxmox.startContainer(vps.proxmoxVMID, vps.proxmoxNode ?? undefined);
    }
    return this.setStatus(id, CloudDeploymentStatus.RUNNING);
  }

  async stop(id: string, user: { id: string; role: Role }) {
    const vps = await this.findOwned(id, user);
    if (vps.proxmoxVMID) {
      await this.proxmox.stopContainer(vps.proxmoxVMID, vps.proxmoxNode ?? undefined);
    }
    return this.setStatus(id, CloudDeploymentStatus.STOPPED);
  }

  async restart(id: string, user: { id: string; role: Role }) {
    await this.stop(id, user);
    return this.start(id, user);
  }

  async remove(id: string, user: { id: string; role: Role }) {
    const vps = await this.findOwned(id, user);
    if (vps.proxmoxVMID) {
      await this.proxmox.destroyContainer(vps.proxmoxVMID, vps.proxmoxNode ?? undefined);
    }
    await this.prisma.cloudDeployment.delete({ where: { id } });
    return { success: true };
  }

  async status(id: string, user: { id: string; role: Role }) {
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

  async snapshot(id: string, user: { id: string; role: Role }) {
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

  async backups(id: string, user: { id: string; role: Role }) {
    const vps = await this.findOwned(id, user);
    return this.prisma.cloudBackup.findMany({
      where: { deploymentId: vps.id },
      orderBy: { createdAt: 'desc' },
    });
  }

  async resize(
    id: string,
    resources: { cpu?: number; memory?: number; storage?: number },
    user: { id: string; role: Role },
  ) {
    await this.findOwned(id, user);
    return this.prisma.cloudDeployment.update({
      where: { id },
      data: resources,
    });
  }

  async console(id: string, user: { id: string; role: Role }) {
    const vps = await this.findOwned(id, user);
    if (!vps.proxmoxVMID) {
      throw new BadRequestException('Console unavailable');
    }
    const host = process.env.PROXMOX_HOST ?? '10.51.100.10';
    return {
      url: `https://${host}:8006/?console=lxc&vmid=${vps.proxmoxVMID}&node=${vps.proxmoxNode ?? process.env.PROXMOX_NODE}`,
    };
  }

  async clone(id: string, name: string, user: { id: string; role: Role }) {
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

  private async findOwned(id: string, user: { id: string; role: Role }) {
    const vps = await this.prisma.cloudDeployment.findUnique({ where: { id } });
    if (!vps) throw new NotFoundException('VPS not found');
    if (user.role !== Role.SUPER_ADMIN && vps.userId !== user.id) {
      throw new NotFoundException('VPS not found');
    }
    return vps;
  }

  private setStatus(id: string, status: CloudDeploymentStatus) {
    return this.prisma.cloudDeployment.update({
      where: { id },
      data: { status },
    });
  }
}

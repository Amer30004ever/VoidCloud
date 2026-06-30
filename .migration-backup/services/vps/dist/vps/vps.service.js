"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.VpsService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const prisma_service_1 = require("../prisma/prisma.service");
const proxmox_service_1 = require("../proxmox/proxmox.service");
let VpsService = class VpsService {
    constructor(prisma, proxmox) {
        this.prisma = prisma;
        this.proxmox = proxmox;
    }
    async list(user) {
        const where = user.role === client_1.Role.SUPER_ADMIN ? {} : { userId: user.id };
        return this.prisma.cloudDeployment.findMany({
            where,
            orderBy: { createdAt: 'desc' },
        });
    }
    async get(id, user) {
        const vps = await this.findOwned(id, user);
        return vps;
    }
    async create(dto, user) {
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
                status: client_1.CloudDeploymentStatus.RUNNING,
                provisionedAt: new Date(),
            },
        });
    }
    async update(id, dto, user) {
        await this.findOwned(id, user);
        return this.prisma.cloudDeployment.update({
            where: { id },
            data: dto,
        });
    }
    async start(id, user) {
        const vps = await this.findOwned(id, user);
        if (vps.proxmoxVMID) {
            await this.proxmox.startContainer(vps.proxmoxVMID, vps.proxmoxNode ?? undefined);
        }
        return this.setStatus(id, client_1.CloudDeploymentStatus.RUNNING);
    }
    async stop(id, user) {
        const vps = await this.findOwned(id, user);
        if (vps.proxmoxVMID) {
            await this.proxmox.stopContainer(vps.proxmoxVMID, vps.proxmoxNode ?? undefined);
        }
        return this.setStatus(id, client_1.CloudDeploymentStatus.STOPPED);
    }
    async restart(id, user) {
        await this.stop(id, user);
        return this.start(id, user);
    }
    async remove(id, user) {
        const vps = await this.findOwned(id, user);
        if (vps.proxmoxVMID) {
            await this.proxmox.destroyContainer(vps.proxmoxVMID, vps.proxmoxNode ?? undefined);
        }
        await this.prisma.cloudDeployment.delete({ where: { id } });
        return { success: true };
    }
    async status(id, user) {
        const vps = await this.findOwned(id, user);
        if (!vps.proxmoxVMID) {
            return { status: vps.status, live: false };
        }
        const live = await this.proxmox.getStatus(vps.proxmoxVMID, vps.proxmoxNode ?? undefined);
        return { status: vps.status, live };
    }
    async snapshot(id, user) {
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
    async backups(id, user) {
        const vps = await this.findOwned(id, user);
        return this.prisma.cloudBackup.findMany({
            where: { deploymentId: vps.id },
            orderBy: { createdAt: 'desc' },
        });
    }
    async resize(id, resources, user) {
        await this.findOwned(id, user);
        return this.prisma.cloudDeployment.update({
            where: { id },
            data: resources,
        });
    }
    async console(id, user) {
        const vps = await this.findOwned(id, user);
        if (!vps.proxmoxVMID) {
            throw new common_1.BadRequestException('Console unavailable');
        }
        const host = process.env.PROXMOX_HOST ?? '10.51.100.10';
        return {
            url: `https://${host}:8006/?console=lxc&vmid=${vps.proxmoxVMID}&node=${vps.proxmoxNode ?? process.env.PROXMOX_NODE}`,
        };
    }
    async clone(id, name, user) {
        const vps = await this.findOwned(id, user);
        return this.create({
            name,
            cpu: vps.cpu,
            memory: vps.memory,
            storage: vps.storage,
        }, user);
    }
    async findOwned(id, user) {
        const vps = await this.prisma.cloudDeployment.findUnique({ where: { id } });
        if (!vps)
            throw new common_1.NotFoundException('VPS not found');
        if (user.role !== client_1.Role.SUPER_ADMIN && vps.userId !== user.id) {
            throw new common_1.NotFoundException('VPS not found');
        }
        return vps;
    }
    setStatus(id, status) {
        return this.prisma.cloudDeployment.update({
            where: { id },
            data: { status },
        });
    }
};
exports.VpsService = VpsService;
exports.VpsService = VpsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        proxmox_service_1.ProxmoxService])
], VpsService);
//# sourceMappingURL=vps.service.js.map
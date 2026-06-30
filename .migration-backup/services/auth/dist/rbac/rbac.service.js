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
exports.RbacService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let RbacService = class RbacService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async hasPermission(userId, permission) {
        const userTenants = await this.prisma.userTenant.findMany({
            where: { userId },
            include: {
                role: {
                    include: {
                        permissions: {
                            include: {
                                permission: true,
                            },
                        },
                    },
                },
            },
        });
        for (const userTenant of userTenants) {
            const hasPermission = userTenant.role.permissions.some((rp) => rp.permission.name === permission);
            if (hasPermission)
                return true;
        }
        return false;
    }
    async getUserPermissions(userId) {
        const userTenants = await this.prisma.userTenant.findMany({
            where: { userId },
            include: {
                role: {
                    include: {
                        permissions: {
                            include: {
                                permission: true,
                            },
                        },
                    },
                },
            },
        });
        const permissions = new Set();
        for (const userTenant of userTenants) {
            userTenant.role.permissions.forEach((rp) => {
                permissions.add(rp.permission.name);
            });
        }
        return Array.from(permissions);
    }
    async getUserTenantRole(userId, tenantId) {
        const userTenant = await this.prisma.userTenant.findUnique({
            where: {
                userId_tenantId: {
                    userId,
                    tenantId,
                },
            },
            include: {
                role: true,
            },
        });
        if (!userTenant) {
            throw new common_1.NotFoundException('User is not a member of this tenant');
        }
        return userTenant;
    }
    async hasTenantPermission(userId, tenantId, permission) {
        const userTenant = await this.prisma.userTenant.findUnique({
            where: {
                userId_tenantId: {
                    userId,
                    tenantId,
                },
            },
            include: {
                role: {
                    include: {
                        permissions: {
                            include: {
                                permission: true,
                            },
                        },
                    },
                },
            },
        });
        if (!userTenant)
            return false;
        return userTenant.role.permissions.some((rp) => rp.permission.name === permission);
    }
    async createRole(data) {
        return this.prisma.rbacRole.create({
            data,
        });
    }
    async assignPermissionToRole(roleId, permissionId) {
        return this.prisma.rbacRolePermission.create({
            data: { roleId, permissionId },
        });
    }
    async removePermissionFromRole(roleId, permissionId) {
        await this.prisma.rbacRolePermission.delete({
            where: {
                roleId_permissionId: {
                    roleId,
                    permissionId,
                },
            },
        });
        return { success: true };
    }
    async createPermission(data) {
        return this.prisma.rbacPermission.create({
            data,
        });
    }
    async assignUserToTenant(userId, tenantId, roleId) {
        return this.prisma.userTenant.create({
            data: { userId, tenantId, roleId },
        });
    }
    async removeUserFromTenant(userId, tenantId) {
        await this.prisma.userTenant.delete({
            where: {
                userId_tenantId: {
                    userId,
                    tenantId,
                },
            },
        });
        return { success: true };
    }
    async getAllRoles() {
        return this.prisma.rbacRole.findMany({
            include: {
                permissions: {
                    include: {
                        permission: true,
                    },
                },
            },
        });
    }
    async getAllPermissions() {
        return this.prisma.rbacPermission.findMany();
    }
    async getAllTenants() {
        return this.prisma.tenant.findMany({
            include: {
                userTenants: {
                    include: {
                        user: {
                            select: {
                                id: true,
                                email: true,
                                name: true,
                            },
                        },
                        role: true,
                    },
                },
            },
        });
    }
    async createTenant(data) {
        return this.prisma.tenant.create({
            data,
        });
    }
};
exports.RbacService = RbacService;
exports.RbacService = RbacService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], RbacService);
//# sourceMappingURL=rbac.service.js.map
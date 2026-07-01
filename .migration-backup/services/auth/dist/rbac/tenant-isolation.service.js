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
exports.TenantIsolationService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let TenantIsolationService = class TenantIsolationService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async getUserTenantId(userId, userRole, requestedTenantId) {
        if (userRole === 'SUPER_ADMIN') {
            return requestedTenantId || null;
        }
        const userTenant = await this.prisma.userTenant.findFirst({
            where: { userId },
            include: { tenant: true },
        });
        if (!userTenant) {
            throw new common_1.ForbiddenException('User is not assigned to any tenant');
        }
        if (requestedTenantId && requestedTenantId !== userTenant.tenantId) {
            throw new common_1.ForbiddenException('You can only access your own tenant');
        }
        return userTenant.tenantId;
    }
    getTenantWhereClause(tenantId, userRole, tenantField = 'tenantId') {
        if (userRole === 'SUPER_ADMIN' && !tenantId) {
            return {};
        }
        if (!tenantId) {
            throw new common_1.ForbiddenException('Tenant context required');
        }
        return { [tenantField]: tenantId };
    }
    async canAccessResource(userId, userRole, resourceTenantId) {
        if (userRole === 'SUPER_ADMIN') {
            return true;
        }
        const userTenant = await this.prisma.userTenant.findFirst({
            where: { userId },
        });
        if (!userTenant) {
            return false;
        }
        return userTenant.tenantId === resourceTenantId;
    }
    async getUserAccessibleTenantIds(userId, userRole) {
        if (userRole === 'SUPER_ADMIN') {
            const tenants = await this.prisma.tenant.findMany({ select: { id: true } });
            return tenants.map((t) => t.id);
        }
        const userTenant = await this.prisma.userTenant.findFirst({
            where: { userId },
            select: { tenantId: true },
        });
        return userTenant ? [userTenant.tenantId] : [];
    }
};
exports.TenantIsolationService = TenantIsolationService;
exports.TenantIsolationService = TenantIsolationService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], TenantIsolationService);
//# sourceMappingURL=tenant-isolation.service.js.map
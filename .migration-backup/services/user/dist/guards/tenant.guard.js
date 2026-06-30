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
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.TenantGuard = void 0;
const common_1 = require("@nestjs/common");
const rbac_service_1 = require("../../rbac/rbac.service");
let TenantGuard = class TenantGuard {
    constructor(rbacService) {
        this.rbacService = rbacService;
    }
    async canActivate(context) {
        const { user, params } = context.switchToHttp().getRequest();
        if (!user) {
            throw new common_1.ForbiddenException('User not authenticated');
        }
        if (user.role === 'SUPER_ADMIN') {
            return true;
        }
        const tenantId = params.tenantId || user.tenantId;
        if (!tenantId) {
            throw new common_1.ForbiddenException('Tenant context required');
        }
        const userTenant = await this.rbacService.getUserTenantRole(user.id, tenantId);
        if (!userTenant) {
            throw new common_1.ForbiddenException('You do not have access to this tenant');
        }
        context.switchToHttp().getRequest().tenantContext = {
            tenantId,
            roleId: userTenant.roleId,
        };
        return true;
    }
};
exports.TenantGuard = TenantGuard;
exports.TenantGuard = TenantGuard = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [typeof (_a = typeof rbac_service_1.RbacService !== "undefined" && rbac_service_1.RbacService) === "function" ? _a : Object])
], TenantGuard);
//# sourceMappingURL=tenant.guard.js.map
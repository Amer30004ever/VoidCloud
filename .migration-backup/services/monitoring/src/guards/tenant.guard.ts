import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { RbacService } from '../../rbac/rbac.service';

@Injectable()
export class TenantGuard implements CanActivate {
  constructor(private rbacService: RbacService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const { user, params } = context.switchToHttp().getRequest();

    if (!user) {
      throw new ForbiddenException('User not authenticated');
    }

    // SUPER_ADMIN can access all tenants
    if (user.role === 'SUPER_ADMIN') {
      return true;
    }

    // For non-super-admin users, ensure they can only access their tenant's data
    const tenantId = params.tenantId || user.tenantId;

    if (!tenantId) {
      throw new ForbiddenException('Tenant context required');
    }

    // Check if user belongs to the requested tenant
    const userTenant = await this.rbacService.getUserTenantRole(
      user.id,
      tenantId,
    );

    if (!userTenant) {
      throw new ForbiddenException(
        'You do not have access to this tenant',
      );
    }

    // Attach tenant context to request for downstream use
    context.switchToHttp().getRequest().tenantContext = {
      tenantId,
      roleId: userTenant.roleId,
    };

    return true;
  }
}

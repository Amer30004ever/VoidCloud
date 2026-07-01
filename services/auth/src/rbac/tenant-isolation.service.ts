import { Injectable, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TenantIsolationService {
  constructor(private prisma: PrismaService) {}

  /**
   * Get tenant ID from user context
   * SUPER_ADMIN can access any tenant, others are restricted to their assigned tenant
   */
  async getUserTenantId(userId: string, userRole: string, requestedTenantId?: string): Promise<string | null> {
    // SUPER_ADMIN can access any tenant
    if (userRole === 'SUPER_ADMIN') {
      return requestedTenantId || null;
    }

    // For other roles, get their assigned tenant
    const userTenant = await this.prisma.userTenant.findFirst({
      where: { userId },
      include: { tenant: true },
    });

    if (!userTenant) {
      throw new ForbiddenException('User is not assigned to any tenant');
    }

    // If requesting a specific tenant, ensure it matches their assigned tenant
    if (requestedTenantId && requestedTenantId !== userTenant.tenantId) {
      throw new ForbiddenException('You can only access your own tenant');
    }

    return userTenant.tenantId;
  }

  /**
   * Apply tenant isolation to Prisma queries
   * Returns a where clause that filters by tenant_id
   */
  getTenantWhereClause(tenantId: string | null, userRole: string, tenantField: string = 'tenantId'): any {
    // SUPER_ADMIN can see all data (no tenant filter)
    if (userRole === 'SUPER_ADMIN' && !tenantId) {
      return {};
    }

    // Other users must have a tenant filter
    if (!tenantId) {
      throw new ForbiddenException('Tenant context required');
    }

    return { [tenantField]: tenantId };
  }

  /**
   * Check if user can access a specific resource
   */
  async canAccessResource(
    userId: string,
    userRole: string,
    resourceTenantId: string,
  ): Promise<boolean> {
    // SUPER_ADMIN can access all resources
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

  /**
   * Get all tenant IDs a user has access to
   * SUPER_ADMIN gets all tenants, others get only their assigned tenant
   */
  async getUserAccessibleTenantIds(userId: string, userRole: string): Promise<string[]> {
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
}

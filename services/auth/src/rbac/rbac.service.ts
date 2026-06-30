import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class RbacService {
  constructor(private prisma: PrismaService) {}

  /**
   * Check if a user has a specific permission
   */
  async hasPermission(userId: string, permission: string): Promise<boolean> {
    // Get all user's roles across all tenants
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

    // Check if any of the user's roles has the required permission
    for (const userTenant of userTenants) {
      const hasPermission = userTenant.role.permissions.some(
        (rp) => rp.permission.name === permission,
      );
      if (hasPermission) return true;
    }

    return false;
  }

  /**
   * Get all permissions for a user across all tenants
   */
  async getUserPermissions(userId: string): Promise<string[]> {
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

    const permissions = new Set<string>();
    for (const userTenant of userTenants) {
      userTenant.role.permissions.forEach((rp) => {
        permissions.add(rp.permission.name);
      });
    }

    return Array.from(permissions);
  }

  /**
   * Get user's role in a specific tenant
   */
  async getUserTenantRole(userId: string, tenantId: string) {
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
      throw new NotFoundException('User is not a member of this tenant');
    }

    return userTenant;
  }

  /**
   * Check if user has permission in a specific tenant
   */
  async hasTenantPermission(
    userId: string,
    tenantId: string,
    permission: string,
  ): Promise<boolean> {
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

    if (!userTenant) return false;

    return userTenant.role.permissions.some(
      (rp) => rp.permission.name === permission,
    );
  }

  /**
   * Create a new role
   */
  async createRole(data: { name: string; description?: string }) {
    return this.prisma.rbacRole.create({
      data,
    });
  }

  /**
   * Assign permission to a role
   */
  async assignPermissionToRole(roleId: string, permissionId: string) {
    return this.prisma.rbacRolePermission.create({
      data: { roleId, permissionId },
    });
  }

  /**
   * Remove permission from a role
   */
  async removePermissionFromRole(roleId: string, permissionId: string) {
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

  /**
   * Create a new permission
   */
  async createPermission(data: {
    name: string;
    resource: string;
    action: string;
    description?: string;
  }) {
    return this.prisma.rbacPermission.create({
      data,
    });
  }

  /**
   * Assign user to tenant with role
   */
  async assignUserToTenant(
    userId: string,
    tenantId: string,
    roleId: string,
  ) {
    return this.prisma.userTenant.create({
      data: { userId, tenantId, roleId },
    });
  }

  /**
   * Remove user from tenant
   */
  async removeUserFromTenant(userId: string, tenantId: string) {
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

  /**
   * Get all roles with their permissions
   */
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

  /**
   * Get all permissions
   */
  async getAllPermissions() {
    return this.prisma.rbacPermission.findMany();
  }

  /**
   * Get all tenants
   */
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

  /**
   * Create a new tenant
   */
  async createTenant(data: { name: string; subdomain: string; settings?: any }) {
    return this.prisma.tenant.create({
      data,
    });
  }
}

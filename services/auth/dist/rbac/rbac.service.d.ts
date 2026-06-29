import { PrismaService } from '../prisma/prisma.service';
export declare class RbacService {
    private prisma;
    constructor(prisma: PrismaService);
    hasPermission(userId: string, permission: string): Promise<boolean>;
    getUserPermissions(userId: string): Promise<string[]>;
    getUserTenantRole(userId: string, tenantId: string): Promise<{
        role: {
            name: string;
            id: string;
            description: string | null;
            createdAt: Date;
            updatedAt: Date;
        };
    } & {
        userId: string;
        tenantId: string;
        roleId: string;
        joinedAt: Date;
    }>;
    hasTenantPermission(userId: string, tenantId: string, permission: string): Promise<boolean>;
    createRole(data: {
        name: string;
        description?: string;
    }): Promise<{
        name: string;
        id: string;
        description: string | null;
        createdAt: Date;
        updatedAt: Date;
    }>;
    assignPermissionToRole(roleId: string, permissionId: string): Promise<{
        roleId: string;
        permissionId: string;
    }>;
    removePermissionFromRole(roleId: string, permissionId: string): Promise<{
        success: boolean;
    }>;
    createPermission(data: {
        name: string;
        resource: string;
        action: string;
        description?: string;
    }): Promise<{
        name: string;
        id: string;
        description: string | null;
        createdAt: Date;
        resource: string;
        action: string;
    }>;
    assignUserToTenant(userId: string, tenantId: string, roleId: string): Promise<{
        userId: string;
        tenantId: string;
        roleId: string;
        joinedAt: Date;
    }>;
    removeUserFromTenant(userId: string, tenantId: string): Promise<{
        success: boolean;
    }>;
    getAllRoles(): Promise<({
        permissions: ({
            permission: {
                name: string;
                id: string;
                description: string | null;
                createdAt: Date;
                resource: string;
                action: string;
            };
        } & {
            roleId: string;
            permissionId: string;
        })[];
    } & {
        name: string;
        id: string;
        description: string | null;
        createdAt: Date;
        updatedAt: Date;
    })[]>;
    getAllPermissions(): Promise<{
        name: string;
        id: string;
        description: string | null;
        createdAt: Date;
        resource: string;
        action: string;
    }[]>;
    getAllTenants(): Promise<({
        userTenants: ({
            user: {
                email: string;
                name: string;
                id: string;
            };
            role: {
                name: string;
                id: string;
                description: string | null;
                createdAt: Date;
                updatedAt: Date;
            };
        } & {
            userId: string;
            tenantId: string;
            roleId: string;
            joinedAt: Date;
        })[];
    } & {
        name: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        subdomain: string;
        settings: import("@prisma/client/runtime/client").JsonValue | null;
        status: string;
    })[]>;
    createTenant(data: {
        name: string;
        subdomain: string;
        settings?: any;
    }): Promise<{
        name: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        subdomain: string;
        settings: import("@prisma/client/runtime/client").JsonValue | null;
        status: string;
    }>;
}

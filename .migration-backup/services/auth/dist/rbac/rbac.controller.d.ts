import { RbacService } from './rbac.service';
export declare class RbacController {
    private readonly rbacService;
    constructor(rbacService: RbacService);
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
    getAllPermissions(): Promise<{
        name: string;
        id: string;
        description: string | null;
        createdAt: Date;
        resource: string;
        action: string;
    }[]>;
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
    assignPermissionToRole(roleId: string, permissionId: string): Promise<{
        roleId: string;
        permissionId: string;
    }>;
    removePermissionFromRole(roleId: string, permissionId: string): Promise<{
        success: boolean;
    }>;
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
    assignUserToTenant(tenantId: string, userId: string, data: {
        roleId: string;
    }): Promise<{
        userId: string;
        tenantId: string;
        roleId: string;
        joinedAt: Date;
    }>;
    removeUserFromTenant(tenantId: string, userId: string): Promise<{
        success: boolean;
    }>;
    getUserPermissions(userId: string): Promise<string[]>;
}

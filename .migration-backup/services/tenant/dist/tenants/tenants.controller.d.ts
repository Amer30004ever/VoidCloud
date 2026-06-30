import { TenantsService } from './tenants.service';
import { CreateTenantDto, UpdateTenantDto, UpdateTenantSettingsDto } from './dto/tenant.dto';
export declare class TenantsController {
    private readonly tenantsService;
    constructor(tenantsService: TenantsService);
    list(): import(".prisma/client").Prisma.PrismaPromise<({
        userTenants: ({
            user: {
                id: string;
                name: string;
                email: string;
            };
            role: {
                id: string;
                name: string;
                createdAt: Date;
                updatedAt: Date;
                description: string | null;
            };
        } & {
            userId: string;
            tenantId: string;
            roleId: string;
            joinedAt: Date;
        })[];
    } & {
        id: string;
        name: string;
        subdomain: string;
        settings: import("@prisma/client/runtime/client").JsonValue | null;
        status: string;
        createdAt: Date;
        updatedAt: Date;
    })[]>;
    create(dto: CreateTenantDto): Promise<{
        id: string;
        name: string;
        subdomain: string;
        settings: import("@prisma/client/runtime/client").JsonValue | null;
        status: string;
        createdAt: Date;
        updatedAt: Date;
    }>;
    get(id: string): Promise<{
        userTenants: {
            userId: string;
            tenantId: string;
            roleId: string;
            joinedAt: Date;
        }[];
    } & {
        id: string;
        name: string;
        subdomain: string;
        settings: import("@prisma/client/runtime/client").JsonValue | null;
        status: string;
        createdAt: Date;
        updatedAt: Date;
    }>;
    update(id: string, dto: UpdateTenantDto): Promise<{
        id: string;
        name: string;
        subdomain: string;
        settings: import("@prisma/client/runtime/client").JsonValue | null;
        status: string;
        createdAt: Date;
        updatedAt: Date;
    }>;
    delete(id: string): Promise<{
        success: boolean;
    }>;
    getSettings(id: string): Promise<{
        settings: import("@prisma/client/runtime/client").JsonValue;
    }>;
    updateSettings(id: string, dto: UpdateTenantSettingsDto): Promise<{
        settings: import("@prisma/client/runtime/client").JsonValue;
    }>;
}

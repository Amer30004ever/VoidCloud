import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTenantDto, UpdateTenantDto } from './dto/tenant.dto';
export declare class TenantsService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    listTenants(): Prisma.PrismaPromise<({
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
        settings: Prisma.JsonValue | null;
        status: string;
        createdAt: Date;
        updatedAt: Date;
    })[]>;
    getTenant(id: string): Promise<{
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
        settings: Prisma.JsonValue | null;
        status: string;
        createdAt: Date;
        updatedAt: Date;
    }>;
    createTenant(dto: CreateTenantDto): Promise<{
        id: string;
        name: string;
        subdomain: string;
        settings: Prisma.JsonValue | null;
        status: string;
        createdAt: Date;
        updatedAt: Date;
    }>;
    updateTenant(id: string, dto: UpdateTenantDto): Promise<{
        id: string;
        name: string;
        subdomain: string;
        settings: Prisma.JsonValue | null;
        status: string;
        createdAt: Date;
        updatedAt: Date;
    }>;
    deleteTenant(id: string): Promise<{
        success: boolean;
    }>;
    getSettings(id: string): Promise<{
        settings: Prisma.JsonValue;
    }>;
    updateSettings(id: string, settings: Record<string, unknown>): Promise<{
        settings: Prisma.JsonValue;
    }>;
}

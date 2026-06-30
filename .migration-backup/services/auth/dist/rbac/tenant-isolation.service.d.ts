import { PrismaService } from '../prisma/prisma.service';
export declare class TenantIsolationService {
    private prisma;
    constructor(prisma: PrismaService);
    getUserTenantId(userId: string, userRole: string, requestedTenantId?: string): Promise<string | null>;
    getTenantWhereClause(tenantId: string | null, userRole: string, tenantField?: string): any;
    canAccessResource(userId: string, userRole: string, resourceTenantId: string): Promise<boolean>;
    getUserAccessibleTenantIds(userId: string, userRole: string): Promise<string[]>;
}

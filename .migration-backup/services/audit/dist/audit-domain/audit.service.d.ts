import { PrismaService } from '../prisma/prisma.service';
interface AuditLogData {
    userId: string;
    userEmail: string;
    action: string;
    resource: string;
    details?: string;
    ipAddress?: string;
    userAgent?: string;
}
export declare class AuditService {
    private prisma;
    private readonly logger;
    constructor(prisma: PrismaService);
    log(data: AuditLogData): Promise<void>;
    getLogs(filters: {
        userId?: string;
        action?: string;
        resource?: string;
        startDate?: Date;
        endDate?: Date;
        limit?: number;
        offset?: number;
    }): Promise<{
        logs: {
            id: string;
            action: string;
            userId: string | null;
            adminId: string | null;
            userEmail: string | null;
            resource: string | null;
            details: import("@prisma/client/runtime/client").JsonValue | null;
            ipAddress: string | null;
            userAgent: string | null;
            status: string;
            createdAt: Date;
        }[];
        total: number;
    }>;
    getUserLogs(userId: string, limit?: number): Promise<{
        id: string;
        action: string;
        userId: string | null;
        adminId: string | null;
        userEmail: string | null;
        resource: string | null;
        details: import("@prisma/client/runtime/client").JsonValue | null;
        ipAddress: string | null;
        userAgent: string | null;
        status: string;
        createdAt: Date;
    }[]>;
    getRecentLogs(limit?: number): Promise<({
        user: {
            id: string;
            name: string;
            email: string;
        };
    } & {
        id: string;
        action: string;
        userId: string | null;
        adminId: string | null;
        userEmail: string | null;
        resource: string | null;
        details: import("@prisma/client/runtime/client").JsonValue | null;
        ipAddress: string | null;
        userAgent: string | null;
        status: string;
        createdAt: Date;
    })[]>;
}
export {};

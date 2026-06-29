import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
export declare class AuditService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    getLogs(filters: {
        userId?: string;
        action?: string;
        resource?: string;
        startDate?: Date;
        endDate?: Date;
        limit?: number;
        offset?: number;
    }): Prisma.PrismaPromise<{
        id: string;
        action: string;
        userId: string | null;
        adminId: string | null;
        userEmail: string | null;
        resource: string | null;
        details: Prisma.JsonValue | null;
        ipAddress: string | null;
        userAgent: string | null;
        status: string;
        createdAt: Date;
    }[]>;
    getUserLogs(userId: string, limit?: number): Prisma.PrismaPromise<{
        id: string;
        action: string;
        userId: string | null;
        adminId: string | null;
        userEmail: string | null;
        resource: string | null;
        details: Prisma.JsonValue | null;
        ipAddress: string | null;
        userAgent: string | null;
        status: string;
        createdAt: Date;
    }[]>;
    exportLogs(filters: Record<string, unknown>): Prisma.PrismaPromise<{
        id: string;
        action: string;
        userId: string | null;
        adminId: string | null;
        userEmail: string | null;
        resource: string | null;
        details: Prisma.JsonValue | null;
        ipAddress: string | null;
        userAgent: string | null;
        status: string;
        createdAt: Date;
    }[]>;
    createLog(data: {
        action: string;
        userId?: string;
        userEmail?: string;
        resource?: string;
        details?: unknown;
    }): Prisma.Prisma__AuditLogClient<{
        id: string;
        action: string;
        userId: string | null;
        adminId: string | null;
        userEmail: string | null;
        resource: string | null;
        details: Prisma.JsonValue | null;
        ipAddress: string | null;
        userAgent: string | null;
        status: string;
        createdAt: Date;
    }, never, import("@prisma/client/runtime/client").DefaultArgs, Prisma.PrismaClientOptions>;
}

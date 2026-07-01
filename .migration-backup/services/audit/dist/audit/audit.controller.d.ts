import { AuditService } from './audit.service';
export declare class AuditController {
    private readonly audit;
    constructor(audit: AuditService);
    logs(userId?: string, action?: string, resource?: string, limit?: string): import(".prisma/client").Prisma.PrismaPromise<{
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
    userLogs(id: string, limit?: string): import(".prisma/client").Prisma.PrismaPromise<{
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
    export(query: Record<string, string>): import(".prisma/client").Prisma.PrismaPromise<{
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
    create(body: Record<string, unknown>): import(".prisma/client").Prisma.Prisma__AuditLogClient<{
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
    }, never, import("@prisma/client/runtime/client").DefaultArgs, import(".prisma/client").Prisma.PrismaClientOptions>;
}

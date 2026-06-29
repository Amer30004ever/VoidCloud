import { AuditService } from './audit.service';
export declare class AuditController {
    private readonly auditService;
    constructor(auditService: AuditService);
    getLogs(userId?: string, action?: string, resource?: string, startDate?: string, endDate?: string, limit?: string, offset?: string): Promise<{
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
    getRecentLogs(limit?: string): Promise<({
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
    getUserLogs(userId: string, limit?: string): Promise<{
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
}

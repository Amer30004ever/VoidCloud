import { MonitoringService } from './monitoring.service';
export declare class MonitoringController {
    private readonly monitoring;
    constructor(monitoring: MonitoringService);
    nodes(): {
        nodes: {
            name: string;
            role: string;
            cpu: number;
            memoryGB: number;
        }[];
    };
    pods(): {
        pods: any[];
        note: string;
    };
    namespaces(): {
        namespaces: string[];
    };
    health(): {
        status: string;
    };
    metrics(): {
        uptime: number;
        timestamp: string;
    };
    alerts(): import(".prisma/client").Prisma.PrismaPromise<{
        id: string;
        ruleId: string;
        type: import(".prisma/client").$Enums.AlertType;
        severity: import(".prisma/client").$Enums.AlertSeverity;
        namespace: string;
        resourceName: string;
        resourceType: string;
        status: string;
        message: string;
        details: import("@prisma/client/runtime/client").JsonValue | null;
        firedAt: Date;
        resolvedAt: Date | null;
        acknowledgedAt: Date | null;
        notificationSent: boolean;
        createdAt: Date;
        updatedAt: Date;
    }[]>;
    createAlert(body: Record<string, unknown>): import(".prisma/client").Prisma.Prisma__AlertClient<{
        id: string;
        ruleId: string;
        type: import(".prisma/client").$Enums.AlertType;
        severity: import(".prisma/client").$Enums.AlertSeverity;
        namespace: string;
        resourceName: string;
        resourceType: string;
        status: string;
        message: string;
        details: import("@prisma/client/runtime/client").JsonValue | null;
        firedAt: Date;
        resolvedAt: Date | null;
        acknowledgedAt: Date | null;
        notificationSent: boolean;
        createdAt: Date;
        updatedAt: Date;
    }, never, import("@prisma/client/runtime/client").DefaultArgs, import(".prisma/client").Prisma.PrismaClientOptions>;
}

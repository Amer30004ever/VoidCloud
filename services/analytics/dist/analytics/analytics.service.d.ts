import { PrismaService } from '../prisma/prisma.service';
export declare class AnalyticsService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    usage(): Promise<{
        vpsCount: number;
        users: number;
        conversations: number;
    }>;
    revenue(): Promise<{
        totalUSD: number;
    }>;
    forecast(): Promise<{
        nextMonthUSD: number;
        confidence: number;
    }>;
    vpsUsage(): import(".prisma/client").Prisma.GetCloudDeploymentGroupByPayload<{
        by: "status"[];
        _count: {
            _all: true;
        };
    }>;
    whatsappUsage(): import(".prisma/client").Prisma.GetMessageGroupByPayload<{
        by: "direction"[];
        _count: {
            _all: true;
        };
    }>;
    exportCsv(): Promise<{
        csv: string;
    }>;
}

import { AnalyticsService } from './analytics.service';
export declare class AnalyticsController {
    private readonly analytics;
    constructor(analytics: AnalyticsService);
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
    export(): Promise<{
        csv: string;
    }>;
}

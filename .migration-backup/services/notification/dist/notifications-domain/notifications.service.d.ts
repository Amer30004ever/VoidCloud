import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
interface NotificationData {
    userId?: string;
    title: string;
    message: string;
    type: 'info' | 'success' | 'warning' | 'error';
    category?: string;
    link?: string;
    metadata?: any;
}
export declare class NotificationsService {
    private prisma;
    private configService;
    private readonly logger;
    constructor(prisma: PrismaService, configService: ConfigService);
    createNotification(data: NotificationData): Promise<{
        id: string;
        userId: string;
        title: string;
        message: string;
        type: string;
        category: string | null;
        link: string | null;
        metadata: import("@prisma/client/runtime/client").JsonValue | null;
        read: boolean;
        createdAt: Date;
    }>;
    createTenantNotification(tenantId: string, data: Omit<NotificationData, 'userId'>): Promise<{
        id: string;
        userId: string;
        title: string;
        message: string;
        type: string;
        category: string | null;
        link: string | null;
        metadata: import("@prisma/client/runtime/client").JsonValue | null;
        read: boolean;
        createdAt: Date;
    }[]>;
    createSystemNotification(data: Omit<NotificationData, 'userId'>): Promise<{
        id: string;
        userId: string;
        title: string;
        message: string;
        type: string;
        category: string | null;
        link: string | null;
        metadata: import("@prisma/client/runtime/client").JsonValue | null;
        read: boolean;
        createdAt: Date;
    }[]>;
    getUserNotifications(userId: string, unreadOnly?: boolean): Promise<{
        id: string;
        userId: string;
        title: string;
        message: string;
        type: string;
        category: string | null;
        link: string | null;
        metadata: import("@prisma/client/runtime/client").JsonValue | null;
        read: boolean;
        createdAt: Date;
    }[]>;
    markAsRead(notificationId: string, userId: string): Promise<import(".prisma/client").Prisma.BatchPayload>;
    markAllAsRead(userId: string): Promise<import(".prisma/client").Prisma.BatchPayload>;
    deleteNotification(notificationId: string, userId: string): Promise<import(".prisma/client").Prisma.BatchPayload>;
    getUnreadCount(userId: string): Promise<number>;
}
export {};

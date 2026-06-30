import { NotificationsService } from './notifications.service';
export declare class NotificationsController {
    private readonly notificationsService;
    constructor(notificationsService: NotificationsService);
    getUserNotifications(unreadOnly?: string): Promise<{
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
    getUnreadCount(): Promise<number>;
    markAsRead(id: string): Promise<import(".prisma/client").Prisma.BatchPayload>;
    markAllAsRead(): Promise<import(".prisma/client").Prisma.BatchPayload>;
    deleteNotification(id: string): Promise<import(".prisma/client").Prisma.BatchPayload>;
    createNotification(data: any): Promise<{
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
}

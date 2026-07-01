import { NotificationsService } from './notifications.service';
export declare class NotificationsController {
    private readonly notifications;
    constructor(notifications: NotificationsService);
    list(user: {
        id: string;
    }, unreadOnly?: string): import(".prisma/client").Prisma.PrismaPromise<{
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
    markRead(id: string, user: {
        id: string;
    }): import(".prisma/client").Prisma.PrismaPromise<import(".prisma/client").Prisma.BatchPayload>;
    create(body: {
        userId: string;
        title: string;
        message: string;
        type?: string;
    }): import(".prisma/client").Prisma.Prisma__NotificationClient<{
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
    }, never, import("@prisma/client/runtime/client").DefaultArgs, import(".prisma/client").Prisma.PrismaClientOptions>;
    wsInfo(): {
        endpoint: string;
        transport: string;
    };
}

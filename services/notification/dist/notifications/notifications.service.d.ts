import { PrismaService } from '../prisma/prisma.service';
export declare class NotificationsService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    list(userId: string, unreadOnly?: boolean): import(".prisma/client").Prisma.PrismaPromise<{
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
    unreadCount(userId: string): import(".prisma/client").Prisma.PrismaPromise<number>;
    markRead(id: string, userId: string): import(".prisma/client").Prisma.PrismaPromise<import(".prisma/client").Prisma.BatchPayload>;
    markAllRead(userId: string): import(".prisma/client").Prisma.PrismaPromise<import(".prisma/client").Prisma.BatchPayload>;
    delete(id: string, userId: string): import(".prisma/client").Prisma.PrismaPromise<import(".prisma/client").Prisma.BatchPayload>;
    create(data: {
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
}

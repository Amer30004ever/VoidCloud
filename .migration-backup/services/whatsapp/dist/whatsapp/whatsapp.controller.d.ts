import { PrismaService } from '../prisma/prisma.service';
import { WhatsAppService } from './whatsapp.service';
export declare class WhatsAppController {
    private readonly whatsapp;
    private readonly prisma;
    private readonly logger;
    constructor(whatsapp: WhatsAppService, prisma: PrismaService);
    verify(mode: string, token: string, challenge: string): string;
    receive(payload: unknown): Promise<{
        status: string;
        payload: unknown;
    }>;
    send(body: {
        to: string;
        text: string;
    }): Promise<any>;
    conversations(user: {
        id: string;
        role: string;
    }): import(".prisma/client").Prisma.PrismaPromise<{
        id: string;
        userId: string;
        tenantId: string | null;
        platform: string;
        contactId: string | null;
        platformId: string | null;
        title: string | null;
        status: import(".prisma/client").$Enums.ConversationStatus;
        assignedTo: string | null;
        createdAt: Date;
        updatedAt: Date;
    }[]>;
    conversation(id: string): import(".prisma/client").Prisma.Prisma__ConversationClient<{
        messages: {
            id: string;
            userId: string | null;
            createdAt: Date;
            conversationId: string | null;
            channelId: string | null;
            role: string;
            content: string;
            type: import(".prisma/client").$Enums.MessageType;
            mediaUrl: string | null;
            waMessageId: string | null;
            direction: string;
        }[];
    } & {
        id: string;
        userId: string;
        tenantId: string | null;
        platform: string;
        contactId: string | null;
        platformId: string | null;
        title: string | null;
        status: import(".prisma/client").$Enums.ConversationStatus;
        assignedTo: string | null;
        createdAt: Date;
        updatedAt: Date;
    }, null, import("@prisma/client/runtime/client").DefaultArgs, import(".prisma/client").Prisma.PrismaClientOptions>;
    assign(id: string, body: {
        agentId: string;
    }): import(".prisma/client").Prisma.Prisma__ConversationClient<{
        id: string;
        userId: string;
        tenantId: string | null;
        platform: string;
        contactId: string | null;
        platformId: string | null;
        title: string | null;
        status: import(".prisma/client").$Enums.ConversationStatus;
        assignedTo: string | null;
        createdAt: Date;
        updatedAt: Date;
    }, never, import("@prisma/client/runtime/client").DefaultArgs, import(".prisma/client").Prisma.PrismaClientOptions>;
    configureWebhook(body: {
        url: string;
    }): {
        ok: boolean;
        url: string;
    };
    settings(): {
        phoneNumberId: string;
        supportNumber: string;
        webhookUrl: string;
    };
    updateSettings(body: Record<string, unknown>): {
        ok: boolean;
        settings: Record<string, unknown>;
    };
}

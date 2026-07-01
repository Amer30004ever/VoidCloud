import { WhatsAppService } from './whatsapp.service';
import { PrismaService } from '../prisma/prisma.service';
export declare class WhatsAppController {
    private readonly whatsappService;
    private readonly prisma;
    private readonly logger;
    constructor(whatsappService: WhatsAppService, prisma: PrismaService);
    verifyWebhook(mode: string, token: string, challenge: string): string | null;
    handleWebhook(payload: any, signature: string): Promise<{
        status: string;
        message?: undefined;
    } | {
        status: string;
        message: any;
    }>;
    private processMessage;
}

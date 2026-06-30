import { ConfigService } from '@nestjs/config';
export declare class WhatsAppService {
    private configService;
    private readonly logger;
    private readonly apiVersion;
    private readonly baseUrl;
    private readonly phoneNumberId;
    private readonly accessToken;
    private readonly verifyToken;
    private readonly supportNumber;
    constructor(configService: ConfigService);
    verifyWebhook(mode: string, token: string, challenge: string): string | null;
    sendTextMessage(to: string, text: string): Promise<any>;
    sendTemplateMessage(to: string, templateName: string, languageCode?: string): Promise<any>;
    getAutoReply(message: string): string;
    routeMessage(message: string): string;
    private formatPhoneNumber;
    getSupportNumber(): string;
    getFormattedSupportNumber(): string;
}

import { MailerService } from '../mailer/mailer.service';
export declare class EmailController {
    private readonly mailer;
    constructor(mailer: MailerService);
    send(body: {
        to: string;
        subject: string;
        html: string;
        text?: string;
    }): Promise<{
        ok: boolean;
    }>;
    listTemplates(): {
        templates: string[];
    };
    createTemplate(body: Record<string, unknown>): {
        ok: boolean;
        template: Record<string, unknown>;
    };
    sendVerify(body: {
        to: string;
        name: string;
        url: string;
    }): Promise<{
        ok: boolean;
    }>;
    sendInvoice(body: {
        to: string;
        invoiceId: string;
    }): Promise<{
        ok: boolean;
    }>;
    sendNotification(body: {
        to: string;
        subject: string;
        message: string;
    }): Promise<{
        ok: boolean;
    }>;
    sendWelcome(body: {
        to: string;
        name: string;
        dashboardUrl: string;
    }): Promise<{
        ok: boolean;
    }>;
    smtpHealth(): Promise<{
        ok: boolean;
        transport: string;
        error?: string;
    }>;
}

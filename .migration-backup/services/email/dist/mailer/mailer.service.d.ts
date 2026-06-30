export declare class MailerService {
    private readonly logger;
    private transporter;
    private resend;
    readonly from: string;
    constructor();
    send(to: string, subject: string, html: string, text?: string): Promise<void>;
    status(): {
        transport: string;
        from: string;
        host: string;
        port: number;
        user: string;
        configured: boolean;
    };
    verify(): Promise<{
        ok: boolean;
        transport: string;
        error?: string;
    }>;
    sendTest(to: string): Promise<{
        ok: boolean;
    }>;
}

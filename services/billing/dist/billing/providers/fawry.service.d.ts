export declare class FawryService {
    private readonly logger;
    private readonly url;
    createPayment(args: {
        userEmail: string;
        userPhone?: string;
        planName: string;
        amountEGP: number;
        invoiceId: string;
    }): Promise<{
        paymentUrl: any;
        referenceId: string;
        qrCode: string;
        merchantPhone: string;
        amountEGP: number;
        sandbox: boolean;
        error?: undefined;
    } | {
        paymentUrl: any;
        referenceId: string;
        qrCode: any;
        error: any;
        merchantPhone?: undefined;
        amountEGP?: undefined;
        sandbox?: undefined;
    } | {
        paymentUrl: any;
        referenceId: string;
        qrCode: any;
        merchantPhone: string;
        amountEGP: number;
        sandbox?: undefined;
        error?: undefined;
    }>;
    private mockQrDataUri;
    verifyWebhook(body: any, signature: string | undefined): boolean;
}

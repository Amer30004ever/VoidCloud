export declare class StripeService {
    private readonly logger;
    private stripe;
    constructor();
    isLive(): boolean;
    createCheckoutSession(args: {
        userEmail: string;
        planName: string;
        priceUSD: number;
        invoiceId: string;
        userId: string;
        planId: string;
        successUrl: string;
        cancelUrl: string;
    }): Promise<{
        sessionId: any;
        url: any;
    }>;
    verifyWebhook(body: Buffer, signature: string): any;
}

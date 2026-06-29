export declare class InstapayService {
    private readonly logger;
    private readonly url;
    createPayment(args: {
        userName: string;
        userEmail: string;
        userPhone?: string;
        payerInstapayId?: string;
        amountEGP: number;
        invoiceId: string;
    }): Promise<{
        paymentUrl: string;
        referenceId: string;
        merchantInstapayId: string;
        amountEGP: number;
        instructions: string;
        sandbox: boolean;
        error?: undefined;
    } | {
        paymentUrl: any;
        referenceId: string;
        error: string;
        merchantInstapayId?: undefined;
        amountEGP?: undefined;
        instructions?: undefined;
        sandbox?: undefined;
    } | {
        paymentUrl: any;
        referenceId: string;
        merchantInstapayId: string;
        amountEGP: number;
        instructions?: undefined;
        sandbox?: undefined;
        error?: undefined;
    }>;
}

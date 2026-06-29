export declare function invoicePaidEmail(opts: {
    name: string;
    invoiceNumber: string;
    amount: number;
    currency: string;
    invoiceUrl: string;
}): {
    html: string;
    text: string;
};

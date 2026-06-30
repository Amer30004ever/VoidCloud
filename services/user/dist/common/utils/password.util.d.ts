export declare function generateRandomPassword(length?: number): string;
export declare function hashPassword(password: string): Promise<string>;
export declare function encryptSecret(value: string): string;
export declare function decryptSecret(payload: string): string;

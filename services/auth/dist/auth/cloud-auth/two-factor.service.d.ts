import { PrismaService } from '../../prisma/prisma.service';
export declare class TwoFactorService {
    private prisma;
    constructor(prisma: PrismaService);
    status(userId: string): Promise<{
        enabled: boolean;
        recoveryCodesRemaining: number;
    }>;
    beginEnable(userId: string, userEmail: string): Promise<{
        otpauthUrl: string;
        base32: string;
        qrCode: string;
    }>;
    verifyAndActivate(userId: string, token: string): Promise<{
        enabled: boolean;
        recoveryCodes: string[];
    }>;
    regenerateRecoveryCodes(userId: string): Promise<{
        recoveryCodes: string[];
    }>;
    disableWithProof(userId: string, password?: string, recoveryCode?: string): Promise<{
        enabled: boolean;
    }>;
    adminReset(userId: string): Promise<{
        ok: boolean;
    }>;
    verifyForLogin(userId: string, token: string): Promise<boolean>;
}

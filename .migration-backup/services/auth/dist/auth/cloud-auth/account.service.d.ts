import { PrismaService } from '../../prisma/prisma.service';
import { MailerService } from '../../mailer/mailer.service';
export declare class CloudAccountService {
    private prisma;
    private mailer;
    private readonly logger;
    private pending;
    constructor(prisma: PrismaService, mailer: MailerService);
    private get frontend();
    requestEmailChange(userId: string, currentPassword: string, newEmail: string): Promise<{
        ok: boolean;
        message: string;
    }>;
    confirmEmailChange(token: string): Promise<{
        ok: boolean;
        email: string;
    }>;
    changePassword(userId: string, currentPassword: string, newPassword: string): Promise<{
        ok: boolean;
    }>;
    getProfile(userId: string): Promise<{
        id: string;
        email: string;
        name: string;
        phone: string;
        emailVerified: boolean;
        twoFactorEnabled: boolean;
        avatar: string;
        createdAt: Date;
    }>;
    updateProfile(userId: string, data: {
        displayName?: string;
        phone?: string | null;
    }): Promise<{
        ok: boolean;
        user: {
            id: string;
            name: string;
            phone: string;
        };
    }>;
    deleteAccount(userId: string, password: string): Promise<{
        ok: boolean;
    }>;
    private readonly defaultPrefs;
    getNotificationPreferences(userId: string): Promise<{
        vpsAlerts: boolean;
        usageAlerts: boolean;
        trialReminders: boolean;
        paymentAlerts: boolean;
        securityAlerts: boolean;
    }>;
    updateNotificationPreferences(userId: string, prefs: Partial<Record<keyof typeof this.defaultPrefs, boolean>>): Promise<Record<string, boolean>>;
}

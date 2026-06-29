import { Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
declare const JwtStrategy_base: new (...args: [opt: import("passport-jwt").StrategyOptionsWithRequest] | [opt: import("passport-jwt").StrategyOptionsWithoutRequest]) => Strategy & {
    validate(...args: any[]): unknown;
};
export declare class JwtStrategy extends JwtStrategy_base {
    private configService;
    private prisma;
    constructor(configService: ConfigService, prisma: PrismaService);
    validate(payload: any): Promise<{
        email: string;
        name: string;
        phone: string | null;
        role: import(".prisma/client").$Enums.Role;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        isActive: boolean;
        mustChangePassword: boolean;
        avatar: string | null;
        emailVerified: boolean;
        emailVerifyTokenHash: string | null;
        emailVerifyExpires: Date | null;
        twoFactorSecret: string | null;
        twoFactorEnabled: boolean;
        recoveryCodes: string[];
        webhookUrl: string | null;
        githubId: string | null;
        googleId: string | null;
        cloudPlanId: string | null;
        trialEndsAt: Date | null;
        subscriptionStatus: import(".prisma/client").$Enums.CloudSubscriptionStatus;
        overrideLimits: import("@prisma/client/runtime/client").JsonValue | null;
        notificationPrefs: import("@prisma/client/runtime/client").JsonValue | null;
        suspendedAt: Date | null;
        suspendedReason: string | null;
        lastLoginAt: Date | null;
        referralPayoutMethod: import("@prisma/client/runtime/client").JsonValue | null;
    }>;
}
export {};

import { Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
declare const JwtStrategy_base: new (...args: [opt: import("passport-jwt").StrategyOptionsWithRequest] | [opt: import("passport-jwt").StrategyOptionsWithoutRequest]) => Strategy & {
    validate(...args: any[]): unknown;
};
export declare class JwtStrategy extends JwtStrategy_base {
    private configService;
    private prisma;
    constructor(configService: ConfigService, prisma: PrismaService);
    validate(payload: any): Promise<{
        id: string;
        email: string;
        emailVerifyTokenHash: string | null;
        githubId: string | null;
        googleId: string | null;
        name: string;
        role: import(".prisma/client").$Enums.Role;
        isActive: boolean;
        mustChangePassword: boolean;
        avatar: string | null;
        emailVerified: boolean;
        emailVerifyExpires: Date | null;
        phone: string | null;
        twoFactorSecret: string | null;
        twoFactorEnabled: boolean;
        recoveryCodes: string[];
        webhookUrl: string | null;
        cloudPlanId: string | null;
        trialEndsAt: Date | null;
        subscriptionStatus: import(".prisma/client").$Enums.CloudSubscriptionStatus;
        overrideLimits: import("@prisma/client/runtime/client").JsonValue | null;
        notificationPrefs: import("@prisma/client/runtime/client").JsonValue | null;
        suspendedAt: Date | null;
        suspendedReason: string | null;
        lastLoginAt: Date | null;
        createdAt: Date;
        updatedAt: Date;
        referralPayoutMethod: import("@prisma/client/runtime/client").JsonValue | null;
    }>;
}
export {};

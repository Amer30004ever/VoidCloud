import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { TwoFactorService } from './cloud-auth/two-factor.service';
export declare class AuthController {
    private readonly authService;
    private readonly twoFactorService;
    constructor(authService: AuthService, twoFactorService: TwoFactorService);
    register(dto: RegisterDto): Promise<{
        user: any;
        requiresVerification: boolean;
    }>;
    login(dto: LoginDto): Promise<{
        requires2FA: boolean;
        userId: string;
        access_token?: undefined;
        user?: undefined;
    } | {
        access_token: string;
        user: {
            id: string;
            email: string;
            name: string;
            role: import(".prisma/client").$Enums.Role;
            permissions: string[];
            mustChangePassword: boolean;
        };
        requires2FA?: undefined;
        userId?: undefined;
    }>;
    forgotPassword(dto: ForgotPasswordDto): Promise<{
        ok: true;
    }>;
    resetPassword(dto: ResetPasswordDto): Promise<{
        ok: true;
    }>;
    verifyEmail(body: {
        token: string;
    }): Promise<{
        ok: true;
    }>;
    resendVerification(body: {
        email: string;
    }): Promise<{
        ok: true;
    }>;
    me(user: {
        id: string;
    }): Promise<{
        email: string;
        name: string;
        role: import(".prisma/client").$Enums.Role;
        id: string;
        isActive: boolean;
        mustChangePassword: boolean;
        createdAt: Date;
        updatedAt: Date;
    }>;
    changePassword(dto: ChangePasswordDto, user: {
        id: string;
    }): Promise<{
        success: true;
        message: string;
    }>;
    enableTwoFactor(user: {
        id: string;
        email: string;
    }): Promise<{
        otpauthUrl: string;
        base32: string;
        qrCode: string;
    }>;
    verifyTwoFactor(user: {
        id: string;
    }, body: {
        token: string;
    }): Promise<{
        enabled: boolean;
        recoveryCodes: string[];
    }>;
}

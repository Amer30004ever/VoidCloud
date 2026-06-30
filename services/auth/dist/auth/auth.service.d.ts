import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { MailerService } from '../mailer/mailer.service';
import { RbacService } from '../rbac/rbac.service';
export declare class AuthService {
    private prisma;
    private jwtService;
    private mailer;
    private rbacService;
    private readonly logger;
    constructor(prisma: PrismaService, jwtService: JwtService, mailer: MailerService, rbacService: RbacService);
    validateUser(email: string, password: string): Promise<any>;
    login(loginDto: LoginDto): Promise<{
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
    register(registerDto: RegisterDto): Promise<{
        user: any;
        requiresVerification: boolean;
    }>;
    verifyEmail(token: string): Promise<{
        ok: true;
    }>;
    resendVerification(email: string): Promise<{
        ok: true;
    }>;
    getMe(userId: string): Promise<{
        email: string;
        name: string;
        role: import(".prisma/client").$Enums.Role;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        isActive: boolean;
        mustChangePassword: boolean;
    }>;
    forgotPassword(email: string): Promise<{
        ok: true;
    }>;
    resetPassword(token: string, newPassword: string): Promise<{
        ok: true;
    }>;
    changePassword(userId: string, currentPassword: string, newPassword: string): Promise<{
        success: true;
        message: string;
    }>;
}

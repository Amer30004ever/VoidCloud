"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var AuthService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const jwt_1 = require("@nestjs/jwt");
const bcrypt = __importStar(require("bcryptjs"));
const crypto = __importStar(require("crypto"));
const speakeasy = __importStar(require("speakeasy"));
const prisma_service_1 = require("../prisma/prisma.service");
const mailer_service_1 = require("../mailer/mailer.service");
const password_reset_1 = require("../mailer/templates/password-reset");
const rbac_service_1 = require("../rbac/rbac.service");
const RESET_TTL_MINUTES = 30;
let AuthService = AuthService_1 = class AuthService {
    constructor(prisma, jwtService, mailer, rbacService) {
        this.prisma = prisma;
        this.jwtService = jwtService;
        this.mailer = mailer;
        this.rbacService = rbacService;
        this.logger = new common_1.Logger(AuthService_1.name);
    }
    async validateUser(email, password) {
        const user = await this.prisma.user.findUnique({ where: { email } });
        if (user && (await bcrypt.compare(password, user.password))) {
            const { password: _, ...result } = user;
            return result;
        }
        return null;
    }
    async login(loginDto) {
        const normalizedEmail = (loginDto.email ?? '').trim().toLowerCase();
        const user = await this.prisma.user.findUnique({
            where: { email: normalizedEmail },
        });
        if (!user || !(await bcrypt.compare(loginDto.password, user.password))) {
            throw new common_1.UnauthorizedException('Invalid credentials');
        }
        if (user.twoFactorEnabled && user.twoFactorSecret) {
            const token = (loginDto.twoFactorToken ?? '').trim();
            if (!token) {
                return { requires2FA: true, userId: user.id };
            }
            const totpOk = speakeasy.totp.verify({
                secret: user.twoFactorSecret,
                encoding: 'base32',
                token,
                window: 1,
            });
            let ok = totpOk;
            if (!ok && user.recoveryCodes?.length) {
                for (const hash of user.recoveryCodes) {
                    if (await bcrypt.compare(token, hash)) {
                        ok = true;
                        await this.prisma.user.update({
                            where: { id: user.id },
                            data: {
                                recoveryCodes: user.recoveryCodes.filter((c) => c !== hash),
                            },
                        });
                        break;
                    }
                }
            }
            if (!ok)
                throw new common_1.UnauthorizedException('Invalid 2FA code');
        }
        const payload = { email: user.email, sub: user.id, role: user.role };
        const userPermissions = await this.rbacService.getUserPermissions(user.id);
        return {
            access_token: this.jwtService.sign(payload),
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                role: user.role,
                permissions: userPermissions,
                mustChangePassword: user.mustChangePassword ?? false,
            },
        };
    }
    async register(registerDto) {
        const email = registerDto.email.toLowerCase().trim();
        const existingUser = await this.prisma.user.findUnique({
            where: { email },
        });
        if (existingUser)
            throw new common_1.ConflictException('Email is already registered');
        const hashedPassword = await bcrypt.hash(registerDto.password, 12);
        let cloudPlanId;
        let trialEndsAt;
        let subscriptionStatus = 'TRIALING';
        if (registerDto.planSlug) {
            const plan = await this.prisma.cloudPlan.findUnique({
                where: { slug: registerDto.planSlug },
            });
            if (plan && plan.isActive) {
                cloudPlanId = plan.id;
                if (plan.trialDays > 0) {
                    trialEndsAt = new Date(Date.now() + plan.trialDays * 24 * 60 * 60 * 1000);
                    subscriptionStatus = 'TRIALING';
                }
                else if (plan.priceUSD === 0 && plan.priceEGP === 0) {
                    subscriptionStatus = 'ACTIVE';
                }
                else {
                    subscriptionStatus = 'INCOMPLETE';
                }
            }
        }
        const rawVerifyToken = crypto.randomBytes(32).toString('hex');
        const verifyTokenHash = crypto
            .createHash('sha256')
            .update(rawVerifyToken)
            .digest('hex');
        const verifyExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);
        const user = await this.prisma.user.create({
            data: {
                email,
                name: registerDto.name.trim(),
                password: hashedPassword,
                role: registerDto.role || 'USER',
                isActive: true,
                phone: registerDto.phone,
                cloudPlanId,
                trialEndsAt,
                subscriptionStatus,
                emailVerified: false,
                emailVerifyTokenHash: verifyTokenHash,
                emailVerifyExpires: verifyExpires,
            },
        });
        const frontend = (process.env.FRONTEND_URL || 'https://voidcloud.cc.cd').replace(/\/$/, '');
        const verifyUrl = `${frontend}/amercloud/verify-email?token=${rawVerifyToken}`;
        try {
            const { welcomeEmail } = await Promise.resolve().then(() => __importStar(require('../mailer/templates/welcome')));
            const { verifyEmailTemplate } = await Promise.resolve().then(() => __importStar(require('../mailer/templates/verify-email')));
            const w = welcomeEmail(user.name, `${frontend}/amercloud/dashboard`);
            const v = verifyEmailTemplate(user.name, verifyUrl);
            this.mailer
                .send(user.email, 'Welcome to Void Cloud 🚀', w.html, w.text)
                .catch((e) => this.logger.warn(`welcome email failed for ${user.email}: ${e?.message ?? e}`));
            this.mailer
                .send(user.email, 'Verify your Void Cloud email', v.html, v.text)
                .catch((e) => this.logger.warn(`verify email failed for ${user.email}: ${e?.message ?? e}`));
        }
        catch (e) {
            this.logger.warn(`registration emails skipped: ${e?.message ?? e}`);
        }
        const { password: _p, emailVerifyTokenHash: _t, ...result } = user;
        return { user: result, requiresVerification: true };
    }
    async verifyEmail(token) {
        if (!token || token.length < 20)
            throw new common_1.BadRequestException('Invalid token');
        const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
        const user = await this.prisma.user.findUnique({
            where: { emailVerifyTokenHash: tokenHash },
        });
        if (!user ||
            !user.emailVerifyExpires ||
            user.emailVerifyExpires < new Date()) {
            throw new common_1.BadRequestException('Verification link is invalid or has expired');
        }
        await this.prisma.user.update({
            where: { id: user.id },
            data: {
                emailVerified: true,
                emailVerifyTokenHash: null,
                emailVerifyExpires: null,
            },
        });
        return { ok: true };
    }
    async resendVerification(email) {
        const user = await this.prisma.user.findUnique({
            where: { email: email.toLowerCase().trim() },
        });
        if (!user || user.emailVerified)
            return { ok: true };
        const rawToken = crypto.randomBytes(32).toString('hex');
        const tokenHash = crypto
            .createHash('sha256')
            .update(rawToken)
            .digest('hex');
        const expires = new Date(Date.now() + 24 * 60 * 60 * 1000);
        await this.prisma.user.update({
            where: { id: user.id },
            data: { emailVerifyTokenHash: tokenHash, emailVerifyExpires: expires },
        });
        const frontend = (process.env.FRONTEND_URL || 'https://voidcloud.cc.cd').replace(/\/$/, '');
        const verifyUrl = `${frontend}/amercloud/verify-email?token=${rawToken}`;
        try {
            const { verifyEmailTemplate } = await Promise.resolve().then(() => __importStar(require('../mailer/templates/verify-email')));
            const { html, text } = verifyEmailTemplate(user.name, verifyUrl);
            await this.mailer.send(user.email, 'Verify your Void Cloud email', html, text);
        }
        catch (e) {
            this.logger.warn(`resend verify failed for ${user.email}: ${e?.message ?? e}`);
        }
        return { ok: true };
    }
    async getMe(userId) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                email: true,
                name: true,
                role: true,
                isActive: true,
                mustChangePassword: true,
                createdAt: true,
                updatedAt: true,
            },
        });
        if (!user)
            throw new common_1.UnauthorizedException('User not found');
        return user;
    }
    async forgotPassword(email) {
        const user = await this.prisma.user.findUnique({
            where: { email: email.toLowerCase() },
        });
        if (!user) {
            this.logger.log(`forgot-password requested for unknown email=${email}`);
            return { ok: true };
        }
        await this.prisma.passwordResetToken.updateMany({
            where: { userId: user.id, usedAt: null, expiresAt: { gt: new Date() } },
            data: { usedAt: new Date() },
        });
        const rawToken = crypto.randomBytes(32).toString('hex');
        const tokenHash = crypto
            .createHash('sha256')
            .update(rawToken)
            .digest('hex');
        const expiresAt = new Date(Date.now() + RESET_TTL_MINUTES * 60 * 1000);
        await this.prisma.passwordResetToken.create({
            data: { userId: user.id, tokenHash, expiresAt },
        });
        const frontend = (process.env.FRONTEND_URL || 'https://voidcloud.cc.cd').replace(/\/$/, '');
        const resetUrl = `${frontend}/amercloud/reset-password?token=${rawToken}`;
        const { html, text } = (0, password_reset_1.passwordResetEmail)(user.name, resetUrl, RESET_TTL_MINUTES);
        try {
            await this.mailer.send(user.email, 'Reset your Void Cloud password', html, text);
        }
        catch (e) {
            this.logger.error(`Failed to send reset email to ${user.email}: ${e?.message ?? e}`);
        }
        return { ok: true };
    }
    async resetPassword(token, newPassword) {
        if (!token || token.length < 20)
            throw new common_1.BadRequestException('Invalid token');
        if (!newPassword || newPassword.length < 8) {
            throw new common_1.BadRequestException('Password must be at least 8 characters');
        }
        const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
        const record = await this.prisma.passwordResetToken.findUnique({
            where: { tokenHash },
        });
        if (!record || record.usedAt || record.expiresAt < new Date()) {
            throw new common_1.BadRequestException('Reset link is invalid or has expired');
        }
        const hashed = await bcrypt.hash(newPassword, 12);
        await this.prisma.$transaction([
            this.prisma.user.update({
                where: { id: record.userId },
                data: { password: hashed, mustChangePassword: false },
            }),
            this.prisma.passwordResetToken.update({
                where: { id: record.id },
                data: { usedAt: new Date() },
            }),
        ]);
        return { ok: true };
    }
    async changePassword(userId, currentPassword, newPassword) {
        const user = await this.prisma.user.findUnique({ where: { id: userId } });
        if (!user)
            throw new common_1.UnauthorizedException('User not found');
        const valid = await bcrypt.compare(currentPassword, user.password);
        if (!valid)
            throw new common_1.BadRequestException('Current password is incorrect');
        const hashed = await bcrypt.hash(newPassword, 12);
        await this.prisma.user.update({
            where: { id: userId },
            data: { password: hashed, mustChangePassword: false },
        });
        return { success: true, message: 'Password updated successfully' };
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = AuthService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        jwt_1.JwtService,
        mailer_service_1.MailerService,
        rbac_service_1.RbacService])
], AuthService);
//# sourceMappingURL=auth.service.js.map
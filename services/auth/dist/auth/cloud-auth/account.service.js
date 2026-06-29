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
var CloudAccountService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.CloudAccountService = void 0;
const common_1 = require("@nestjs/common");
const bcrypt = __importStar(require("bcryptjs"));
const crypto = __importStar(require("crypto"));
const prisma_service_1 = require("../../prisma/prisma.service");
const mailer_service_1 = require("../../mailer/mailer.service");
let CloudAccountService = CloudAccountService_1 = class CloudAccountService {
    constructor(prisma, mailer) {
        this.prisma = prisma;
        this.mailer = mailer;
        this.logger = new common_1.Logger(CloudAccountService_1.name);
        this.pending = new Map();
        this.defaultPrefs = {
            vpsAlerts: true,
            usageAlerts: true,
            trialReminders: true,
            paymentAlerts: true,
            securityAlerts: true,
        };
    }
    get frontend() {
        return (process.env.FRONTEND_URL || 'https://voidcloud.cc.cd').replace(/\/$/, '');
    }
    async requestEmailChange(userId, currentPassword, newEmail) {
        const user = await this.prisma.user.findUnique({ where: { id: userId } });
        if (!user)
            throw new common_1.UnauthorizedException();
        if (!(await bcrypt.compare(currentPassword, user.password))) {
            throw new common_1.UnauthorizedException('Current password is incorrect');
        }
        const normalized = (newEmail || '').trim().toLowerCase();
        if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(normalized)) {
            throw new common_1.BadRequestException('Invalid email');
        }
        if (normalized === user.email.toLowerCase()) {
            throw new common_1.BadRequestException('New email is the same as current email');
        }
        const existing = await this.prisma.user.findUnique({
            where: { email: normalized },
        });
        if (existing)
            throw new common_1.BadRequestException('Email already in use');
        const token = crypto.randomBytes(32).toString('hex');
        this.pending.set(token, {
            userId,
            newEmail: normalized,
            expiresAt: Date.now() + 30 * 60_000,
        });
        const url = `${this.frontend}/amercloud/dashboard/settings?confirmEmail=${token}`;
        const html = `<p>Hi ${user.name},</p>
      <p>We received a request to change your Void Cloud account email to <b>${normalized}</b>.</p>
      <p>If this was you, click the link below within 30 minutes to confirm:</p>
      <p><a href="${url}">Confirm email change</a></p>
      <p>If you did not request this, you can ignore this email — your address will not change.</p>`;
        try {
            await this.mailer.send(user.email, 'Confirm your Void Cloud email change', html);
        }
        catch (e) {
            this.logger.warn(`email-change confirmation send failed: ${e?.message ?? e}`);
        }
        return { ok: true, message: 'Confirmation sent to your current email.' };
    }
    async confirmEmailChange(token) {
        const entry = this.pending.get(token);
        if (!entry || entry.expiresAt < Date.now()) {
            this.pending.delete(token);
            throw new common_1.BadRequestException('Token expired or invalid');
        }
        this.pending.delete(token);
        const taken = await this.prisma.user.findUnique({
            where: { email: entry.newEmail },
        });
        if (taken)
            throw new common_1.BadRequestException('Email already in use');
        const updated = await this.prisma.user.update({
            where: { id: entry.userId },
            data: { email: entry.newEmail, emailVerified: true },
        });
        return { ok: true, email: updated.email };
    }
    async changePassword(userId, currentPassword, newPassword) {
        if (!newPassword || newPassword.length < 8) {
            throw new common_1.BadRequestException('New password must be at least 8 characters');
        }
        const user = await this.prisma.user.findUnique({ where: { id: userId } });
        if (!user)
            throw new common_1.UnauthorizedException();
        if (!(await bcrypt.compare(currentPassword, user.password))) {
            throw new common_1.UnauthorizedException('Current password is incorrect');
        }
        const hashed = await bcrypt.hash(newPassword, 12);
        await this.prisma.user.update({
            where: { id: userId },
            data: { password: hashed, mustChangePassword: false },
        });
        const html = `<p>Hi ${user.name},</p>
      <p>This is a notification that your Void Cloud password was just changed.</p>
      <p>If you did not make this change, please reset your password immediately and contact support.</p>`;
        try {
            await this.mailer.send(user.email, 'Your Void Cloud password was changed', html);
        }
        catch (e) {
            this.logger.warn(`password-change notification failed: ${e?.message ?? e}`);
        }
        return { ok: true };
    }
    async getProfile(userId) {
        const u = await this.prisma.user.findUnique({ where: { id: userId } });
        if (!u)
            throw new common_1.UnauthorizedException();
        return {
            id: u.id,
            email: u.email,
            name: u.name,
            phone: u.phone ?? '',
            emailVerified: u.emailVerified,
            twoFactorEnabled: u.twoFactorEnabled,
            avatar: u.avatar ?? null,
            createdAt: u.createdAt,
        };
    }
    async updateProfile(userId, data) {
        const patch = {};
        if (typeof data.displayName === 'string') {
            const name = data.displayName.trim();
            if (name.length < 1 || name.length > 80)
                throw new common_1.BadRequestException('Name must be 1-80 chars');
            patch.name = name;
        }
        if (data.phone !== undefined) {
            const phone = (data.phone ?? '').trim();
            if (phone && !/^01[0-9]{9}$/.test(phone)) {
                throw new common_1.BadRequestException('Phone must be Egyptian format: 01XXXXXXXXX');
            }
            patch.phone = phone || null;
        }
        const updated = await this.prisma.user.update({
            where: { id: userId },
            data: patch,
        });
        return {
            ok: true,
            user: { id: updated.id, name: updated.name, phone: updated.phone },
        };
    }
    async deleteAccount(userId, password) {
        const user = await this.prisma.user.findUnique({ where: { id: userId } });
        if (!user)
            throw new common_1.UnauthorizedException();
        if (!(await bcrypt.compare(password || '', user.password))) {
            throw new common_1.UnauthorizedException('Password is incorrect');
        }
        await this.prisma.user.delete({ where: { id: userId } });
        return { ok: true };
    }
    async getNotificationPreferences(userId) {
        const u = await this.prisma.user.findUnique({ where: { id: userId } });
        if (!u)
            throw new common_1.UnauthorizedException();
        const stored = u.notificationPrefs ?? {};
        return { ...this.defaultPrefs, ...stored };
    }
    async updateNotificationPreferences(userId, prefs) {
        const current = await this.getNotificationPreferences(userId);
        const next = { ...current };
        for (const k of Object.keys(this.defaultPrefs)) {
            if (typeof prefs[k] === 'boolean')
                next[k] = prefs[k];
        }
        await this.prisma.user.update({
            where: { id: userId },
            data: { notificationPrefs: next },
        });
        return next;
    }
};
exports.CloudAccountService = CloudAccountService;
exports.CloudAccountService = CloudAccountService = CloudAccountService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        mailer_service_1.MailerService])
], CloudAccountService);
//# sourceMappingURL=account.service.js.map
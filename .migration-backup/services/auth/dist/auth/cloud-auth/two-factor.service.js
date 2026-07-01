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
Object.defineProperty(exports, "__esModule", { value: true });
exports.TwoFactorService = void 0;
const common_1 = require("@nestjs/common");
const speakeasy = __importStar(require("speakeasy"));
const QRCode = __importStar(require("qrcode"));
const crypto = __importStar(require("crypto"));
const bcrypt = __importStar(require("bcryptjs"));
const prisma_service_1 = require("../../prisma/prisma.service");
let TwoFactorService = class TwoFactorService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async status(userId) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            select: { twoFactorEnabled: true, recoveryCodes: true },
        });
        return {
            enabled: !!user?.twoFactorEnabled,
            recoveryCodesRemaining: user?.recoveryCodes?.length ?? 0,
        };
    }
    async beginEnable(userId, userEmail) {
        const secret = speakeasy.generateSecret({
            name: `Void Cloud (${userEmail})`,
            length: 20,
        });
        await this.prisma.user.update({
            where: { id: userId },
            data: { twoFactorSecret: secret.base32, twoFactorEnabled: false },
        });
        const qr = await QRCode.toDataURL(secret.otpauth_url);
        return {
            otpauthUrl: secret.otpauth_url,
            base32: secret.base32,
            qrCode: qr,
        };
    }
    async verifyAndActivate(userId, token) {
        const user = await this.prisma.user.findUnique({ where: { id: userId } });
        if (!user?.twoFactorSecret)
            throw new common_1.BadRequestException('2FA not initialised');
        const ok = speakeasy.totp.verify({
            secret: user.twoFactorSecret,
            encoding: 'base32',
            token,
            window: 1,
        });
        if (!ok)
            throw new common_1.BadRequestException('Invalid code');
        const raw = Array.from({ length: 8 }, () => `${crypto.randomBytes(2).toString('hex')}-${crypto.randomBytes(3).toString('hex')}`);
        const hashed = await Promise.all(raw.map((c) => bcrypt.hash(c, 10)));
        await this.prisma.user.update({
            where: { id: userId },
            data: { twoFactorEnabled: true, recoveryCodes: hashed },
        });
        return { enabled: true, recoveryCodes: raw };
    }
    async regenerateRecoveryCodes(userId) {
        const user = await this.prisma.user.findUnique({ where: { id: userId } });
        if (!user?.twoFactorEnabled)
            throw new common_1.BadRequestException('2FA not enabled');
        const raw = Array.from({ length: 8 }, () => `${crypto.randomBytes(2).toString('hex')}-${crypto.randomBytes(3).toString('hex')}`);
        const hashed = await Promise.all(raw.map((c) => bcrypt.hash(c, 10)));
        await this.prisma.user.update({
            where: { id: userId },
            data: { recoveryCodes: hashed },
        });
        return { recoveryCodes: raw };
    }
    async disableWithProof(userId, password, recoveryCode) {
        const user = await this.prisma.user.findUnique({ where: { id: userId } });
        if (!user)
            throw new common_1.BadRequestException('User not found');
        let authorised = false;
        if (password) {
            authorised = await bcrypt.compare(password, user.password);
        }
        else if (recoveryCode) {
            for (const hash of user.recoveryCodes ?? []) {
                if (await bcrypt.compare(recoveryCode, hash)) {
                    authorised = true;
                    break;
                }
            }
        }
        if (!authorised)
            throw new common_1.UnauthorizedException('Password or recovery code is incorrect');
        await this.prisma.user.update({
            where: { id: userId },
            data: {
                twoFactorEnabled: false,
                twoFactorSecret: null,
                recoveryCodes: [],
            },
        });
        return { enabled: false };
    }
    async adminReset(userId) {
        await this.prisma.user.update({
            where: { id: userId },
            data: {
                twoFactorEnabled: false,
                twoFactorSecret: null,
                recoveryCodes: [],
            },
        });
        return { ok: true };
    }
    async verifyForLogin(userId, token) {
        const user = await this.prisma.user.findUnique({ where: { id: userId } });
        if (!user?.twoFactorEnabled || !user.twoFactorSecret)
            return true;
        const cleaned = (token ?? '').trim();
        if (!cleaned)
            return false;
        if (speakeasy.totp.verify({
            secret: user.twoFactorSecret,
            encoding: 'base32',
            token: cleaned,
            window: 1,
        })) {
            return true;
        }
        for (const hash of user.recoveryCodes ?? []) {
            if (await bcrypt.compare(cleaned, hash)) {
                await this.prisma.user.update({
                    where: { id: userId },
                    data: {
                        recoveryCodes: (user.recoveryCodes ?? []).filter((c) => c !== hash),
                    },
                });
                return true;
            }
        }
        return false;
    }
};
exports.TwoFactorService = TwoFactorService;
exports.TwoFactorService = TwoFactorService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], TwoFactorService);
//# sourceMappingURL=two-factor.service.js.map
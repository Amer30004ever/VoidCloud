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
var MailerService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.MailerService = void 0;
const common_1 = require("@nestjs/common");
const nodemailer = __importStar(require("nodemailer"));
const resend_1 = require("resend");
let MailerService = MailerService_1 = class MailerService {
    constructor() {
        this.logger = new common_1.Logger(MailerService_1.name);
        this.transporter = null;
        this.resend = null;
        this.from =
            process.env.EMAIL_FROM ||
                (process.env.SMTP_USER
                    ? `VoidCloud <${process.env.SMTP_USER}>`
                    : 'VoidCloud <support.voidcloud@gmail.com>');
        if (process.env.SMTP_HOST &&
            process.env.SMTP_USER &&
            process.env.SMTP_PASS) {
            const port = Number(process.env.SMTP_PORT || 587);
            this.transporter = nodemailer.createTransport({
                host: process.env.SMTP_HOST,
                port,
                secure: port === 465,
                requireTLS: port === 587,
                auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
                tls: { ciphers: 'TLSv1.2' },
            });
            this.logger.log(`SMTP transport ready (${process.env.SMTP_HOST}:${port})`);
        }
        else if (process.env.RESEND_API_KEY) {
            this.resend = new resend_1.Resend(process.env.RESEND_API_KEY);
            this.logger.log('Resend transport ready');
        }
        else {
            this.logger.warn('No SMTP_* or RESEND_API_KEY configured; emails will be logged only.');
        }
    }
    async send(to, subject, html, text) {
        if (this.transporter) {
            try {
                const info = await this.transporter.sendMail({
                    from: this.from,
                    to,
                    subject,
                    html,
                    text: text ?? html.replace(/<[^>]+>/g, ''),
                });
                this.logger.log(`email sent via SMTP to=${to} messageId=${info.messageId}`);
                return;
            }
            catch (e) {
                this.logger.error(`SMTP send failed: ${e?.message ?? e}`);
                throw e;
            }
        }
        if (this.resend) {
            try {
                await this.resend.emails.send({ from: this.from, to, subject, html });
                return;
            }
            catch (e) {
                this.logger.error(`Resend send failed: ${e?.message ?? e}`);
                throw e;
            }
        }
        this.logger.log(`[email/stub] to=${to} subject=${subject}\n${text ?? html}`);
    }
    status() {
        return {
            transport: this.transporter ? 'smtp' : this.resend ? 'resend' : 'stub',
            from: this.from,
            host: process.env.SMTP_HOST ?? null,
            port: process.env.SMTP_HOST ? Number(process.env.SMTP_PORT || 587) : null,
            user: process.env.SMTP_USER ?? null,
            configured: !!(this.transporter || this.resend),
        };
    }
    async verify() {
        if (this.transporter) {
            try {
                await this.transporter.verify();
                return { ok: true, transport: 'smtp' };
            }
            catch (e) {
                return { ok: false, transport: 'smtp', error: e?.message ?? String(e) };
            }
        }
        if (this.resend)
            return { ok: true, transport: 'resend' };
        return {
            ok: false,
            transport: 'stub',
            error: 'No SMTP_* or RESEND_API_KEY configured',
        };
    }
    async sendTest(to) {
        const subject = 'VoidCloud SMTP test email';
        const html = `<p>This is a test from VoidCloud admin (${new Date().toISOString()}).</p><p>Transport: <b>${this.transporter ? 'SMTP' : this.resend ? 'Resend' : 'stub'}</b></p>`;
        await this.send(to, subject, html);
        return { ok: true };
    }
};
exports.MailerService = MailerService;
exports.MailerService = MailerService = MailerService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [])
], MailerService);
//# sourceMappingURL=mailer.service.js.map
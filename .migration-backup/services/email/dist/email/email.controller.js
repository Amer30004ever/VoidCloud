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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmailController = void 0;
const common_1 = require("@nestjs/common");
const mailer_service_1 = require("../mailer/mailer.service");
const public_decorator_1 = require("../decorators/public.decorator");
const jwt_auth_guard_1 = require("../guards/jwt-auth.guard");
let EmailController = class EmailController {
    constructor(mailer) {
        this.mailer = mailer;
    }
    async send(body) {
        await this.mailer.send(body.to, body.subject, body.html, body.text);
        return { ok: true };
    }
    listTemplates() {
        return {
            templates: ['welcome', 'verify-email', 'password-reset', 'invoice-paid', 'vps-ready'],
        };
    }
    createTemplate(body) {
        return { ok: true, template: body };
    }
    async sendVerify(body) {
        const { verifyEmailTemplate } = await Promise.resolve().then(() => __importStar(require('../mailer/templates/verify-email')));
        const { html, text } = verifyEmailTemplate(body.name, body.url);
        await this.mailer.send(body.to, 'Verify your Void Cloud email', html, text);
        return { ok: true };
    }
    async sendInvoice(body) {
        await this.mailer.send(body.to, 'Your Void Cloud invoice', `<p>Invoice ${body.invoiceId}</p>`);
        return { ok: true };
    }
    async sendNotification(body) {
        await this.mailer.send(body.to, body.subject, `<p>${body.message}</p>`);
        return { ok: true };
    }
    async sendWelcome(body) {
        const { welcomeEmail } = await Promise.resolve().then(() => __importStar(require('../mailer/templates/welcome')));
        const { html, text } = welcomeEmail(body.name, body.dashboardUrl);
        await this.mailer.send(body.to, 'Welcome to Void Cloud', html, text);
        return { ok: true };
    }
    async smtpHealth() {
        return this.mailer.verify();
    }
};
exports.EmailController = EmailController;
__decorate([
    (0, common_1.Post)('send'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], EmailController.prototype, "send", null);
__decorate([
    (0, common_1.Get)('templates'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], EmailController.prototype, "listTemplates", null);
__decorate([
    (0, common_1.Post)('templates'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], EmailController.prototype, "createTemplate", null);
__decorate([
    (0, common_1.Post)('verify/send'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], EmailController.prototype, "sendVerify", null);
__decorate([
    (0, common_1.Post)('invoice/send'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], EmailController.prototype, "sendInvoice", null);
__decorate([
    (0, common_1.Post)('notification/send'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], EmailController.prototype, "sendNotification", null);
__decorate([
    (0, common_1.Post)('welcome/send'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], EmailController.prototype, "sendWelcome", null);
__decorate([
    (0, public_decorator_1.Public)(),
    (0, common_1.Get)('health/smtp'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], EmailController.prototype, "smtpHealth", null);
exports.EmailController = EmailController = __decorate([
    (0, common_1.Controller)('email'),
    __metadata("design:paramtypes", [mailer_service_1.MailerService])
], EmailController);
//# sourceMappingURL=email.controller.js.map
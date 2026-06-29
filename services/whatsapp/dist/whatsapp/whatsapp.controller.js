"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var WhatsAppController_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.WhatsAppController = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const public_decorator_1 = require("../decorators/public.decorator");
const jwt_auth_guard_1 = require("../guards/jwt-auth.guard");
const current_user_decorator_1 = require("../decorators/current-user.decorator");
const whatsapp_service_1 = require("./whatsapp.service");
let WhatsAppController = WhatsAppController_1 = class WhatsAppController {
    constructor(whatsapp, prisma) {
        this.whatsapp = whatsapp;
        this.prisma = prisma;
        this.logger = new common_1.Logger(WhatsAppController_1.name);
    }
    verify(mode, token, challenge) {
        return this.whatsapp.verifyWebhook(mode, token, challenge);
    }
    async receive(payload) {
        this.logger.log('Webhook received');
        return { status: 'ok', payload };
    }
    send(body) {
        return this.whatsapp.sendTextMessage(body.to, body.text);
    }
    conversations(user) {
        const where = user.role === 'SUPER_ADMIN' ? {} : { userId: user.id };
        return this.prisma.conversation.findMany({ where, orderBy: { updatedAt: 'desc' } });
    }
    conversation(id) {
        return this.prisma.conversation.findUnique({
            where: { id },
            include: { messages: { orderBy: { createdAt: 'asc' } } },
        });
    }
    assign(id, body) {
        return this.prisma.conversation.update({
            where: { id },
            data: { userId: body.agentId },
        });
    }
    configureWebhook(body) {
        return { ok: true, url: body.url };
    }
    settings() {
        return {
            phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID,
            supportNumber: process.env.WHATSAPP_SUPPORT_NUMBER_FORMATTED,
            webhookUrl: process.env.WHATSAPP_WEBHOOK_URL,
        };
    }
    updateSettings(body) {
        return { ok: true, settings: body };
    }
};
exports.WhatsAppController = WhatsAppController;
__decorate([
    (0, public_decorator_1.Public)(),
    (0, common_1.Get)('webhooks/whatsapp'),
    __param(0, (0, common_1.Query)('hub.mode')),
    __param(1, (0, common_1.Query)('hub.verify_token')),
    __param(2, (0, common_1.Query)('hub.challenge')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", void 0)
], WhatsAppController.prototype, "verify", null);
__decorate([
    (0, public_decorator_1.Public)(),
    (0, common_1.Post)('webhooks/whatsapp'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], WhatsAppController.prototype, "receive", null);
__decorate([
    (0, common_1.Post)('whatsapp/send'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], WhatsAppController.prototype, "send", null);
__decorate([
    (0, common_1.Get)('whatsapp/conversations'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], WhatsAppController.prototype, "conversations", null);
__decorate([
    (0, common_1.Get)('whatsapp/conversations/:id'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], WhatsAppController.prototype, "conversation", null);
__decorate([
    (0, common_1.Put)('whatsapp/conversations/:id/assign'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], WhatsAppController.prototype, "assign", null);
__decorate([
    (0, common_1.Post)('whatsapp/webhook/configure'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], WhatsAppController.prototype, "configureWebhook", null);
__decorate([
    (0, common_1.Get)('whatsapp/settings'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], WhatsAppController.prototype, "settings", null);
__decorate([
    (0, common_1.Put)('whatsapp/settings'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], WhatsAppController.prototype, "updateSettings", null);
exports.WhatsAppController = WhatsAppController = WhatsAppController_1 = __decorate([
    (0, common_1.Controller)(),
    __metadata("design:paramtypes", [whatsapp_service_1.WhatsAppService,
        prisma_service_1.PrismaService])
], WhatsAppController);
//# sourceMappingURL=whatsapp.controller.js.map
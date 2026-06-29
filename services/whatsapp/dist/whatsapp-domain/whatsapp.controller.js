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
const swagger_1 = require("@nestjs/swagger");
const whatsapp_service_1 = require("./whatsapp.service");
const prisma_service_1 = require("../prisma/prisma.service");
let WhatsAppController = WhatsAppController_1 = class WhatsAppController {
    constructor(whatsappService, prisma) {
        this.whatsappService = whatsappService;
        this.prisma = prisma;
        this.logger = new common_1.Logger(WhatsAppController_1.name);
    }
    verifyWebhook(mode, token, challenge) {
        return this.whatsappService.verifyWebhook(mode, token, challenge);
    }
    async handleWebhook(payload, signature) {
        this.logger.log(`Received webhook event: ${JSON.stringify(payload).substring(0, 200)}...`);
        try {
            if (payload.entry) {
                for (const entry of payload.entry) {
                    if (entry.changes) {
                        for (const change of entry.changes) {
                            if (change.field === 'messages') {
                                await this.processMessage(change.value);
                            }
                        }
                    }
                }
            }
            return { status: 'ok' };
        }
        catch (error) {
            this.logger.error(`Error processing webhook: ${error.message}`);
            return { status: 'error', message: error.message };
        }
    }
    async processMessage(value) {
        if (!value.messages || value.messages.length === 0) {
            return;
        }
        const message = value.messages[0];
        const from = message.from;
        const text = message.text?.body || '';
        this.logger.log(`Processing message from ${from}: ${text}`);
        let conversation = await this.prisma.conversation.findFirst({
            where: {
                platform: 'whatsapp',
                contactId: from,
            },
        });
        if (!conversation) {
            conversation = await this.prisma.conversation.create({
                data: {
                    userId: 'system',
                    platform: 'whatsapp',
                    contactId: from,
                    platformId: message.id,
                    status: 'OPEN',
                    title: `WhatsApp: ${from}`,
                },
            });
            this.logger.log(`Created new conversation: ${conversation.id}`);
        }
        await this.prisma.message.create({
            data: {
                conversationId: conversation.id,
                role: 'user',
                content: text,
                type: 'TEXT',
                waMessageId: message.id,
                direction: 'INBOUND',
            },
        });
        const autoReply = this.whatsappService.getAutoReply(text);
        await this.whatsappService.sendTextMessage(from, autoReply);
        await this.prisma.message.create({
            data: {
                conversationId: conversation.id,
                role: 'assistant',
                content: autoReply,
                type: 'TEXT',
                direction: 'OUTBOUND',
            },
        });
        const team = this.whatsappService.routeMessage(text);
        this.logger.log(`Message routed to ${team} team`);
    }
};
exports.WhatsAppController = WhatsAppController;
__decorate([
    (0, common_1.Get)(),
    (0, swagger_1.ApiOperation)({ summary: 'Verify WhatsApp webhook' }),
    __param(0, (0, common_1.Query)('hub.mode')),
    __param(1, (0, common_1.Query)('hub.verify_token')),
    __param(2, (0, common_1.Query)('hub.challenge')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", String)
], WhatsAppController.prototype, "verifyWebhook", null);
__decorate([
    (0, common_1.Post)(),
    (0, swagger_1.ApiOperation)({ summary: 'Receive WhatsApp webhook events' }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Headers)('x-hub-signature')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], WhatsAppController.prototype, "handleWebhook", null);
exports.WhatsAppController = WhatsAppController = WhatsAppController_1 = __decorate([
    (0, swagger_1.ApiTags)('WhatsApp'),
    (0, common_1.Controller)('webhooks/whatsapp'),
    __metadata("design:paramtypes", [whatsapp_service_1.WhatsAppService,
        prisma_service_1.PrismaService])
], WhatsAppController);
//# sourceMappingURL=whatsapp.controller.js.map
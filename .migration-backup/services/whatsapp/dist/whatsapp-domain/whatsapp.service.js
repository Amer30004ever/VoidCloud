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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var WhatsAppService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.WhatsAppService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const axios_1 = __importDefault(require("axios"));
let WhatsAppService = WhatsAppService_1 = class WhatsAppService {
    constructor(configService) {
        this.configService = configService;
        this.logger = new common_1.Logger(WhatsAppService_1.name);
        this.apiVersion = 'v18.0';
        this.phoneNumberId = this.configService.get('WHATSAPP_PHONE_NUMBER_ID') || '1251629638023277';
        this.accessToken = this.configService.get('WHATSAPP_ACCESS_TOKEN') || '';
        this.verifyToken = this.configService.get('WHATSAPP_VERIFY_TOKEN') || 'voidcloud_secure_2026';
        this.supportNumber = this.configService.get('WHATSAPP_SUPPORT_NUMBER') || '201061365444';
        this.baseUrl = `https://graph.facebook.com/${this.apiVersion}`;
    }
    verifyWebhook(mode, token, challenge) {
        if (mode === 'subscribe' && token === this.verifyToken) {
            this.logger.log('Webhook verified successfully');
            return challenge;
        }
        this.logger.warn('Webhook verification failed');
        return null;
    }
    async sendTextMessage(to, text) {
        try {
            const url = `${this.baseUrl}/${this.phoneNumberId}/messages`;
            const response = await axios_1.default.post(url, {
                messaging_product: 'whatsapp',
                to: this.formatPhoneNumber(to),
                type: 'text',
                text: { body: text },
            }, {
                headers: {
                    Authorization: `Bearer ${this.accessToken}`,
                    'Content-Type': 'application/json',
                },
            });
            this.logger.log(`Message sent to ${to}: ${text.substring(0, 50)}...`);
            return response.data;
        }
        catch (error) {
            this.logger.error(`Failed to send message: ${error.message}`);
            throw error;
        }
    }
    async sendTemplateMessage(to, templateName, languageCode = 'en_US') {
        try {
            const url = `${this.baseUrl}/${this.phoneNumberId}/messages`;
            const response = await axios_1.default.post(url, {
                messaging_product: 'whatsapp',
                to: this.formatPhoneNumber(to),
                type: 'template',
                template: {
                    name: templateName,
                    language: { code: languageCode },
                },
            }, {
                headers: {
                    Authorization: `Bearer ${this.accessToken}`,
                    'Content-Type': 'application/json',
                },
            });
            this.logger.log(`Template message sent to ${to}: ${templateName}`);
            return response.data;
        }
        catch (error) {
            this.logger.error(`Failed to send template message: ${error.message}`);
            throw error;
        }
    }
    getAutoReply(message) {
        const lowerMessage = message.toLowerCase();
        const now = new Date();
        const cairoTime = new Date(now.toLocaleString('en-US', { timeZone: 'Africa/Cairo' }));
        const hour = cairoTime.getHours();
        const day = cairoTime.getDay();
        const isBusinessHours = hour >= 9 && hour < 18;
        if (lowerMessage.includes('subscribe') || lowerMessage.includes('subscription') || lowerMessage.includes('plan') || lowerMessage.includes('pricing')) {
            return "Interested in our VPS hosting? Let me help you find the perfect plan! 🚀\n\nWe offer:\n- Starter: $5/month\n- Pro: $15/month\n- Business: $30/month\n\nWould you like more details about any plan?";
        }
        if (lowerMessage.includes('support') || lowerMessage.includes('help') || lowerMessage.includes('issue') || lowerMessage.includes('problem')) {
            return "I'll connect you with our technical support team right away. ⚙️\n\nOur support team is available 24/7. Please describe your issue and we'll assist you shortly.";
        }
        if (lowerMessage.includes('billing') || lowerMessage.includes('invoice') || lowerMessage.includes('payment')) {
            return "For billing inquiries, please contact our billing team. 💳\n\nYou can:\n- View invoices in your dashboard\n- Update payment methods\n- Request refunds\n\nHow can I help with your billing?";
        }
        if (lowerMessage.includes('vps') || lowerMessage.includes('server') || lowerMessage.includes('hosting')) {
            return "Welcome to Void Cloud! 🚀 How can I help you with your cloud hosting today?\n\nI can assist with:\n- Creating new VPS instances\n- Managing existing servers\n- Technical support\n- Plan upgrades";
        }
        if (!isBusinessHours) {
            return "Thank you for contacting Void Cloud! We're currently offline. We'll respond within 2 hours during business hours (9AM - 6PM Cairo time). 🌙";
        }
        return "Welcome to Void Cloud! 🚀 How can I help you with your cloud hosting today?";
    }
    routeMessage(message) {
        const lowerMessage = message.toLowerCase();
        if (lowerMessage.includes('subscribe') || lowerMessage.includes('subscription') || lowerMessage.includes('plan') || lowerMessage.includes('pricing')) {
            return 'SALES';
        }
        if (lowerMessage.includes('support') || lowerMessage.includes('help') || lowerMessage.includes('issue') || lowerMessage.includes('problem')) {
            return 'SUPPORT';
        }
        if (lowerMessage.includes('billing') || lowerMessage.includes('invoice') || lowerMessage.includes('payment')) {
            return 'BILLING';
        }
        if (lowerMessage.includes('vps') || lowerMessage.includes('server') || lowerMessage.includes('hosting')) {
            return 'TECHNICAL';
        }
        return 'GENERAL';
    }
    formatPhoneNumber(phone) {
        const cleaned = phone.replace(/\D/g, '');
        if (cleaned.length >= 12) {
            return cleaned;
        }
        if (cleaned.length === 10) {
            return `2${cleaned}`;
        }
        return cleaned;
    }
    getSupportNumber() {
        return this.supportNumber;
    }
    getFormattedSupportNumber() {
        return `+${this.supportNumber}`;
    }
};
exports.WhatsAppService = WhatsAppService;
exports.WhatsAppService = WhatsAppService = WhatsAppService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], WhatsAppService);
//# sourceMappingURL=whatsapp.service.js.map
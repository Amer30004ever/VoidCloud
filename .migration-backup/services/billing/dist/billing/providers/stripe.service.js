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
var StripeService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.StripeService = void 0;
const common_1 = require("@nestjs/common");
const stripe_1 = __importDefault(require("stripe"));
let StripeService = StripeService_1 = class StripeService {
    constructor() {
        this.logger = new common_1.Logger(StripeService_1.name);
        this.stripe = null;
        const key = process.env.STRIPE_SECRET_KEY;
        if (key) {
            this.stripe = new stripe_1.default(key);
        }
        else {
            this.logger.warn('STRIPE_SECRET_KEY not set; running in stub mode');
        }
    }
    isLive() {
        return !!this.stripe;
    }
    async createCheckoutSession(args) {
        if (!this.stripe) {
            return {
                sessionId: `stub_${args.invoiceId}`,
                url: `${args.successUrl}?stub=1`,
            };
        }
        const session = await this.stripe.checkout.sessions.create({
            customer_email: args.userEmail,
            payment_method_types: ['card'],
            line_items: [
                {
                    price_data: {
                        currency: 'usd',
                        product_data: { name: args.planName },
                        unit_amount: Math.round(args.priceUSD * 100),
                        recurring: { interval: 'month' },
                    },
                    quantity: 1,
                },
            ],
            mode: 'subscription',
            success_url: args.successUrl,
            cancel_url: args.cancelUrl,
            metadata: {
                userId: args.userId,
                planId: args.planId,
                invoiceId: args.invoiceId,
            },
        });
        return { sessionId: session.id, url: session.url };
    }
    verifyWebhook(body, signature) {
        if (!this.stripe)
            throw new common_1.BadRequestException('Stripe not configured');
        const secret = process.env.STRIPE_WEBHOOK_SECRET;
        if (!secret)
            throw new common_1.BadRequestException('STRIPE_WEBHOOK_SECRET not set');
        return this.stripe.webhooks.constructEvent(body, signature, secret);
    }
};
exports.StripeService = StripeService;
exports.StripeService = StripeService = StripeService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [])
], StripeService);
//# sourceMappingURL=stripe.service.js.map
"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var InstapayService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.InstapayService = void 0;
const common_1 = require("@nestjs/common");
const axios_1 = __importDefault(require("axios"));
const MERCHANT_INSTAPAY = process.env.MERCHANT_INSTAPAY_ID || 'amer3000@instapay';
let InstapayService = InstapayService_1 = class InstapayService {
    constructor() {
        this.logger = new common_1.Logger(InstapayService_1.name);
        this.url = process.env.INSTAPAY_BASE_URL || 'https://api.instapay.app/v1/payments';
    }
    async createPayment(args) {
        const apiKey = process.env.INSTAPAY_API_KEY;
        const referenceId = `AMP_${args.invoiceId}`;
        if (!apiKey) {
            this.logger.warn(`[SANDBOX] InstaPay would transfer ${args.amountEGP} EGP from ${args.payerInstapayId ?? 'unknown'}, ref=${referenceId}`);
            return {
                paymentUrl: `https://sandbox.instapay.app/pay/test-${Date.now()}`,
                referenceId,
                merchantInstapayId: MERCHANT_INSTAPAY,
                amountEGP: args.amountEGP,
                instructions: `Send ${args.amountEGP} EGP via InstaPay to ${MERCHANT_INSTAPAY} and include reference ${referenceId} in the note.`,
                sandbox: true,
            };
        }
        const res = await axios_1.default
            .post(this.url, {
            amount: args.amountEGP,
            currency: 'EGP',
            customer_name: args.userName,
            customer_email: args.userEmail,
            customer_mobile: args.userPhone,
            payer_instapay_id: args.payerInstapayId,
            receiver_instapay_id: MERCHANT_INSTAPAY,
            reference_id: referenceId,
            webhook_url: `${process.env.BACKEND_URL}/api/v1/cloud/webhooks/instapay`,
            success_url: `${process.env.FRONTEND_URL}/amercloud/dashboard/billing?success=1`,
            cancel_url: `${process.env.FRONTEND_URL}/amercloud/dashboard/billing?canceled=1`,
        }, { headers: { Authorization: `Bearer ${apiKey}` }, timeout: 8000 })
            .catch((e) => {
            this.logger.error(`InstaPay error: ${e.message}`);
            return null;
        });
        if (!res)
            return { paymentUrl: null, referenceId, error: 'gateway_error' };
        return {
            paymentUrl: res.data.payment_url,
            referenceId,
            merchantInstapayId: MERCHANT_INSTAPAY,
            amountEGP: args.amountEGP,
        };
    }
};
exports.InstapayService = InstapayService;
exports.InstapayService = InstapayService = InstapayService_1 = __decorate([
    (0, common_1.Injectable)()
], InstapayService);
//# sourceMappingURL=instapay.service.js.map
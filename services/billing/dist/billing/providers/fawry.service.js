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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var FawryService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.FawryService = void 0;
const common_1 = require("@nestjs/common");
const axios_1 = __importDefault(require("axios"));
const crypto = __importStar(require("crypto"));
const MERCHANT_VODAFONE_CASH = process.env.VODAFONE_CASH_NUMBER || '01001984255';
let FawryService = FawryService_1 = class FawryService {
    constructor() {
        this.logger = new common_1.Logger(FawryService_1.name);
        this.url = process.env.FAWRY_BASE_URL || 'https://www.atfawry.com/api/v2/charge';
    }
    async createPayment(args) {
        const merchant = process.env.FAWRY_MERCHANT_ID;
        const secKey = process.env.FAWRY_SECURITY_KEY;
        const referenceId = `FAWRY_TEST_${Date.now()}_${args.invoiceId.slice(0, 8)}`;
        if (!merchant || !secKey) {
            this.logger.warn(`[SANDBOX] Fawry would charge ${args.amountEGP} EGP, ref=${referenceId}`);
            return {
                paymentUrl: null,
                referenceId,
                qrCode: this.mockQrDataUri(referenceId),
                merchantPhone: MERCHANT_VODAFONE_CASH,
                amountEGP: args.amountEGP,
                sandbox: true,
            };
        }
        const liveRef = `amercloud_${args.invoiceId}`;
        const signature = crypto
            .createHash('sha256')
            .update(`${merchant}${liveRef}${args.amountEGP}${secKey}`)
            .digest('hex');
        const payload = {
            merchantCode: merchant,
            referenceId: liveRef,
            amount: args.amountEGP,
            currency: 'EGP',
            description: `${args.planName} subscription`,
            customer: { email: args.userEmail, mobile: args.userPhone ?? '' },
            signature,
        };
        const res = await axios_1.default
            .post(this.url, payload, { timeout: 8000 })
            .catch((e) => {
            this.logger.error(`Fawry error: ${e.message}`);
            return null;
        });
        if (!res || res.data?.statusCode !== 200) {
            return {
                paymentUrl: null,
                referenceId: liveRef,
                qrCode: null,
                error: res?.data?.statusDescription,
            };
        }
        return {
            paymentUrl: res.data.paymentUrl,
            referenceId: liveRef,
            qrCode: res.data.qrCode,
            merchantPhone: MERCHANT_VODAFONE_CASH,
            amountEGP: args.amountEGP,
        };
    }
    mockQrDataUri(ref) {
        const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="220" height="220" viewBox="0 0 220 220">
      <rect width="220" height="220" fill="#fff"/>
      <rect x="10" y="10" width="200" height="200" fill="none" stroke="#0f172a" stroke-width="2"/>
      ${Array.from({ length: 18 }, (_, i) => Array.from({ length: 18 }, (_, j) => {
            const seed = (ref.charCodeAt((i * 18 + j) % ref.length) + i * 3 + j * 7) % 7;
            return seed < 3
                ? `<rect x="${15 + j * 11}" y="${15 + i * 11}" width="10" height="10" fill="#0f172a"/>`
                : '';
        }).join('')).join('')}
      <rect x="80" y="95" width="60" height="30" fill="#fff"/>
      <text x="110" y="115" text-anchor="middle" font-family="monospace" font-size="11" font-weight="700" fill="#0f172a">TEST</text>
    </svg>`;
        return `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
    }
    verifyWebhook(body, signature) {
        const secKey = process.env.FAWRY_SECURITY_KEY;
        if (!secKey || !signature)
            return false;
        const expected = crypto
            .createHash('sha256')
            .update(`${body.merchantRefNumber}${body.fawryRefNumber}${body.paymentAmount}${secKey}`)
            .digest('hex');
        return expected === signature;
    }
};
exports.FawryService = FawryService;
exports.FawryService = FawryService = FawryService_1 = __decorate([
    (0, common_1.Injectable)()
], FawryService);
//# sourceMappingURL=fawry.service.js.map
import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import * as crypto from 'crypto';

// Vodafone Cash receiving number (also accepted via Fawry network)
const MERCHANT_VODAFONE_CASH = process.env.VODAFONE_CASH_NUMBER || '01001984255';

@Injectable()
export class FawryService {
  private readonly logger = new Logger(FawryService.name);
  private readonly url = process.env.FAWRY_BASE_URL || 'https://www.atfawry.com/api/v2/charge';

  async createPayment(args: {
    userEmail: string; userPhone?: string; planName: string;
    amountEGP: number; invoiceId: string;
  }) {
    const merchant = process.env.FAWRY_MERCHANT_ID;
    const secKey = process.env.FAWRY_SECURITY_KEY;
    const referenceId = `FAWRY_TEST_${Date.now()}_${args.invoiceId.slice(0, 8)}`;

    // SANDBOX MODE: return mock reference + QR data URI so the UI flow works end-to-end.
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
    const signature = crypto.createHash('sha256')
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
    const res = await axios.post(this.url, payload, { timeout: 8000 }).catch((e) => {
      this.logger.error(`Fawry error: ${e.message}`);
      return null;
    });
    if (!res || res.data?.statusCode !== 200) {
      return { paymentUrl: null, referenceId: liveRef, qrCode: null, error: res?.data?.statusDescription };
    }
    return {
      paymentUrl: res.data.paymentUrl,
      referenceId: liveRef,
      qrCode: res.data.qrCode,
      merchantPhone: MERCHANT_VODAFONE_CASH,
      amountEGP: args.amountEGP,
    };
  }

  /** Minimal "TEST PAYMENT" SVG → data URI for sandbox QR placeholder. */
  private mockQrDataUri(ref: string): string {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="220" height="220" viewBox="0 0 220 220">
      <rect width="220" height="220" fill="#fff"/>
      <rect x="10" y="10" width="200" height="200" fill="none" stroke="#0f172a" stroke-width="2"/>
      ${Array.from({ length: 18 }, (_, i) =>
        Array.from({ length: 18 }, (_, j) => {
          const seed = (ref.charCodeAt((i * 18 + j) % ref.length) + i * 3 + j * 7) % 7;
          return seed < 3 ? `<rect x="${15 + j * 11}" y="${15 + i * 11}" width="10" height="10" fill="#0f172a"/>` : '';
        }).join(''),
      ).join('')}
      <rect x="80" y="95" width="60" height="30" fill="#fff"/>
      <text x="110" y="115" text-anchor="middle" font-family="monospace" font-size="11" font-weight="700" fill="#0f172a">TEST</text>
    </svg>`;
    return `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
  }

  verifyWebhook(body: any, signature: string | undefined): boolean {
    const secKey = process.env.FAWRY_SECURITY_KEY;
    if (!secKey || !signature) return false;
    const expected = crypto.createHash('sha256')
      .update(`${body.merchantRefNumber}${body.fawryRefNumber}${body.paymentAmount}${secKey}`)
      .digest('hex');
    return expected === signature;
  }
}

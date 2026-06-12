import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import * as crypto from 'crypto';

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
    const referenceId = `amercloud_${args.invoiceId}`;
    if (!merchant || !secKey) {
      this.logger.warn('FAWRY_* not set; returning stub reference');
      return { paymentUrl: null, referenceId, qrCode: null, stub: true };
    }
    const signature = crypto.createHash('sha256')
      .update(`${merchant}${referenceId}${args.amountEGP}${secKey}`)
      .digest('hex');
    const payload = {
      merchantCode: merchant,
      referenceId,
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
      return { paymentUrl: null, referenceId, qrCode: null, error: res?.data?.statusDescription };
    }
    return { paymentUrl: res.data.paymentUrl, referenceId, qrCode: res.data.qrCode };
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

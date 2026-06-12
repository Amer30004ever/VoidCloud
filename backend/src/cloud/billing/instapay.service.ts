import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';

const MERCHANT_INSTAPAY = process.env.MERCHANT_INSTAPAY_ID || 'amer3000@instapay';

@Injectable()
export class InstapayService {
  private readonly logger = new Logger(InstapayService.name);
  private readonly url = process.env.INSTAPAY_BASE_URL || 'https://api.instapay.app/v1/payments';

  async createPayment(args: {
    userName: string; userEmail: string; userPhone?: string;
    payerInstapayId?: string;
    amountEGP: number; invoiceId: string;
  }) {
    const apiKey = process.env.INSTAPAY_API_KEY;
    const referenceId = `AMP_${args.invoiceId}`;

    // SANDBOX MODE
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

    const res = await axios.post(this.url, {
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
      .catch((e) => { this.logger.error(`InstaPay error: ${e.message}`); return null; });
    if (!res) return { paymentUrl: null, referenceId, error: 'gateway_error' };
    return {
      paymentUrl: res.data.payment_url,
      referenceId,
      merchantInstapayId: MERCHANT_INSTAPAY,
      amountEGP: args.amountEGP,
    };
  }
}

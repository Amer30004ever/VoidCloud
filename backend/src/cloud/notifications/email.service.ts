import { Injectable, Logger } from '@nestjs/common';
import { Resend } from 'resend';

@Injectable()
export class CloudEmailService {
  private readonly logger = new Logger(CloudEmailService.name);
  private resend: Resend | null = null;
  private readonly from = process.env.EMAIL_FROM || 'AmerCloud <noreply@amer-portal.cc.cd>';

  constructor() {
    const key = process.env.RESEND_API_KEY;
    if (key) this.resend = new Resend(key);
    else this.logger.warn('RESEND_API_KEY not set; emails will be logged only');
  }

  private async send(to: string, subject: string, html: string) {
    if (!this.resend) {
      this.logger.log(`[email/stub] to=${to} subject=${subject}`);
      return;
    }
    try {
      await this.resend.emails.send({ from: this.from, to, subject, html });
    } catch (e: any) {
      this.logger.error(`email send failed: ${e.message}`);
    }
  }

  welcome(email: string, name: string) {
    return this.send(email, 'Welcome to AmerCloud 🚀',
      `<h2>Welcome, ${name}!</h2><p>Your 7-day free trial is now active.</p>
       <p><a href="${process.env.FRONTEND_URL}/amercloud/dashboard">Open dashboard →</a></p>`);
  }

  invoice(email: string, amount: number, currency: string, invoiceId: string) {
    return this.send(email, `Invoice ${invoiceId} is ready`,
      `<p>Your invoice for <b>${amount} ${currency}</b> is ready.</p>
       <p><a href="${process.env.FRONTEND_URL}/amercloud/dashboard/billing/invoices/${invoiceId}">View invoice →</a></p>`);
  }

  trialReminder(email: string, daysLeft: number) {
    return this.send(email, `Your free trial ends in ${daysLeft} days`,
      `<p>Upgrade now to keep your deployments running after your trial.</p>
       <p><a href="${process.env.FRONTEND_URL}/amercloud/dashboard/billing">Upgrade →</a></p>`);
  }

  deploymentFailed(email: string, name: string, reason: string) {
    return this.send(email, `Deployment "${name}" failed`,
      `<p>Deployment <b>${name}</b> failed.</p><pre>${reason}</pre>`);
  }
}

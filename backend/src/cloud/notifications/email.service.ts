import { Injectable, Logger } from '@nestjs/common';
import { MailerService } from '../../mailer/mailer.service';
import { welcomeEmail } from '../../mailer/templates/welcome';
import { invoicePaidEmail } from '../../mailer/templates/invoice-paid';
import { vpsReadyEmail } from '../../mailer/templates/vps-ready';

/**
 * Branded transactional emails for Cloud features.
 * All sends go through the shared MailerService (SMTP → Resend → stub).
 */
@Injectable()
export class CloudEmailService {
  private readonly logger = new Logger(CloudEmailService.name);
  constructor(private mailer: MailerService) {}

  private get frontend() {
    return (process.env.FRONTEND_URL || 'https://voidcloud.cc.cd').replace(
      /\/$/,
      '',
    );
  }

  private async safeSend(
    to: string,
    subject: string,
    html: string,
    text?: string,
  ) {
    try {
      await this.mailer.send(to, subject, html, text);
    } catch (e: any) {
      this.logger.warn(
        `Email send failed to=${to} subject="${subject}": ${e?.message ?? e}`,
      );
    }
  }

  welcome(email: string, name: string) {
    const { html, text } = welcomeEmail(
      name,
      `${this.frontend}/amercloud/dashboard`,
    );
    return this.safeSend(email, 'Welcome to AmerCloud 🚀', html, text);
  }

  invoice(email: string, amount: number, currency: string, invoiceId: string) {
    const url = `${this.frontend}/amercloud/dashboard/billing/invoices/${invoiceId}`;
    const html = `<p>Your invoice for <b>${amount.toFixed(2)} ${currency}</b> is ready.</p>
       <p><a href="${url}">View invoice →</a></p>`;
    return this.safeSend(email, `Invoice ${invoiceId} is ready`, html);
  }

  invoicePaid(
    email: string,
    name: string,
    opts: {
      invoiceNumber: string;
      amount: number;
      currency: string;
      invoiceId: string;
    },
  ) {
    const { html, text } = invoicePaidEmail({
      name,
      invoiceNumber: opts.invoiceNumber,
      amount: opts.amount,
      currency: opts.currency,
      invoiceUrl: `${this.frontend}/amercloud/dashboard/billing/invoices/${opts.invoiceId}`,
    });
    return this.safeSend(
      email,
      `Payment received — invoice ${opts.invoiceNumber}`,
      html,
      text,
    );
  }

  vpsReady(
    email: string,
    name: string,
    opts: { vpsName: string; ipv4: string; rootPassword?: string },
  ) {
    const { html, text } = vpsReadyEmail({
      name,
      vpsName: opts.vpsName,
      ipv4: opts.ipv4,
      rootPassword: opts.rootPassword,
      dashboardUrl: `${this.frontend}/amercloud/dashboard/vps`,
    });
    return this.safeSend(
      email,
      `Your VPS "${opts.vpsName}" is ready`,
      html,
      text,
    );
  }

  trialReminder(email: string, daysLeft: number) {
    const url = `${this.frontend}/amercloud/dashboard/billing`;
    return this.safeSend(
      email,
      `Your free trial ends in ${daysLeft} days`,
      `<p>Upgrade now to keep your deployments running after your trial.</p><p><a href="${url}">Upgrade →</a></p>`,
    );
  }

  deploymentFailed(email: string, name: string, reason: string) {
    return this.safeSend(
      email,
      `Deployment "${name}" failed`,
      `<p>Deployment <b>${name}</b> failed.</p><pre>${reason}</pre>`,
    );
  }

  maintenance(email: string, subject: string, body: string) {
    const html = `<div style="font-family:system-ui,Arial,sans-serif;line-height:1.6;color:#0f172a">
      <h2 style="margin:0 0 12px">${subject}</h2>
      <pre style="white-space:pre-wrap;background:#f1f5f9;padding:12px;border-radius:8px">${body}</pre>
      <p style="font-size:12px;color:#64748b">Follow live status at <a href="${this.frontend}/status">${this.frontend}/status</a>.</p>
    </div>`;
    return this.safeSend(email, subject, html, body);
  }
}

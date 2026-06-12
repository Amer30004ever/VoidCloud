import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { Resend } from 'resend';

/**
 * MailerService — sends transactional emails.
 *
 * Prefers SMTP (Outlook / Office 365 / any SMTP) when SMTP_HOST + SMTP_USER + SMTP_PASS are set.
 * Outlook example:
 *   SMTP_HOST=smtp.office365.com
 *   SMTP_PORT=587
 *   SMTP_USER=nova-cloud-2026@outlook.com
 *   SMTP_PASS=<app password>          # generate at account.live.com/proofs/AppPassword
 *   EMAIL_FROM="AmerCloud <nova-cloud-2026@outlook.com>"
 *
 * Falls back to Resend (RESEND_API_KEY) when SMTP is not configured.
 * Falls back to logging when neither is configured.
 */
@Injectable()
export class MailerService {
  private readonly logger = new Logger(MailerService.name);
  private transporter: nodemailer.Transporter | null = null;
  private resend: Resend | null = null;
  readonly from: string;

  constructor() {
    this.from =
      process.env.EMAIL_FROM ||
      (process.env.SMTP_USER
        ? `AmerCloud <${process.env.SMTP_USER}>`
        : 'AmerCloud <nova-cloud-2026@outlook.com>');

    if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
      const port = Number(process.env.SMTP_PORT || 587);
      this.transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port,
        secure: port === 465, // STARTTLS for 587 (Outlook), TLS for 465
        requireTLS: port === 587,
        auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
        tls: { ciphers: 'TLSv1.2' },
      });
      this.logger.log(`SMTP transport ready (${process.env.SMTP_HOST}:${port})`);
    } else if (process.env.RESEND_API_KEY) {
      this.resend = new Resend(process.env.RESEND_API_KEY);
      this.logger.log('Resend transport ready');
    } else {
      this.logger.warn(
        'No SMTP_* or RESEND_API_KEY configured; emails will be logged only.',
      );
    }
  }

  async send(to: string, subject: string, html: string, text?: string): Promise<void> {
    if (this.transporter) {
      try {
        const info = await this.transporter.sendMail({
          from: this.from,
          to,
          subject,
          html,
          text: text ?? html.replace(/<[^>]+>/g, ''),
        });
        this.logger.log(`email sent via SMTP to=${to} messageId=${info.messageId}`);
        return;
      } catch (e: any) {
        this.logger.error(`SMTP send failed: ${e?.message ?? e}`);
        throw e;
      }
    }

    if (this.resend) {
      try {
        await this.resend.emails.send({ from: this.from, to, subject, html });
        return;
      } catch (e: any) {
        this.logger.error(`Resend send failed: ${e?.message ?? e}`);
        throw e;
      }
    }

    this.logger.log(`[email/stub] to=${to} subject=${subject}\n${text ?? html}`);
  }
}

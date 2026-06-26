import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { Resend } from 'resend';

/**
 * MailerService — sends transactional emails.
 *
 * Prefers SMTP (Gmail / any SMTP) when SMTP_HOST + SMTP_USER + SMTP_PASS are set.
 * Gmail example:
 *   SMTP_HOST=smtp.gmail.com
 *   SMTP_PORT=587
 *   SMTP_USER=support.voidcloud@gmail.com
 *   SMTP_PASS=<app password>          # generate at https://myaccount.google.com/apppasswords
 *   EMAIL_FROM="VoidCloud <support.voidcloud@gmail.com>"
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
        ? `VoidCloud <${process.env.SMTP_USER}>`
        : 'VoidCloud <support.voidcloud@gmail.com>');

    if (
      process.env.SMTP_HOST &&
      process.env.SMTP_USER &&
      process.env.SMTP_PASS
    ) {
      const port = Number(process.env.SMTP_PORT || 587);
      this.transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port,
        secure: port === 465, // STARTTLS for 587 (Outlook), TLS for 465
        requireTLS: port === 587,
        auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
        tls: { ciphers: 'TLSv1.2' },
      });
      this.logger.log(
        `SMTP transport ready (${process.env.SMTP_HOST}:${port})`,
      );
    } else if (process.env.RESEND_API_KEY) {
      this.resend = new Resend(process.env.RESEND_API_KEY);
      this.logger.log('Resend transport ready');
    } else {
      this.logger.warn(
        'No SMTP_* or RESEND_API_KEY configured; emails will be logged only.',
      );
    }
  }

  async send(
    to: string,
    subject: string,
    html: string,
    text?: string,
  ): Promise<void> {
    if (this.transporter) {
      try {
        const info = await this.transporter.sendMail({
          from: this.from,
          to,
          subject,
          html,
          text: text ?? html.replace(/<[^>]+>/g, ''),
        });
        this.logger.log(
          `email sent via SMTP to=${to} messageId=${info.messageId}`,
        );
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

    this.logger.log(
      `[email/stub] to=${to} subject=${subject}\n${text ?? html}`,
    );
  }

  /** Returns transport status for admin diagnostics. */
  status() {
    return {
      transport: this.transporter ? 'smtp' : this.resend ? 'resend' : 'stub',
      from: this.from,
      host: process.env.SMTP_HOST ?? null,
      port: process.env.SMTP_HOST ? Number(process.env.SMTP_PORT || 587) : null,
      user: process.env.SMTP_USER ?? null,
      configured: !!(this.transporter || this.resend),
    };
  }

  /** Verify SMTP connectivity (no email sent). */
  async verify(): Promise<{ ok: boolean; transport: string; error?: string }> {
    if (this.transporter) {
      try {
        await this.transporter.verify();
        return { ok: true, transport: 'smtp' };
      } catch (e: any) {
        return { ok: false, transport: 'smtp', error: e?.message ?? String(e) };
      }
    }
    if (this.resend) return { ok: true, transport: 'resend' };
    return {
      ok: false,
      transport: 'stub',
      error: 'No SMTP_* or RESEND_API_KEY configured',
    };
  }

  /** Send a test email to the admin's own address. */
  async sendTest(to: string) {
    const subject = 'VoidCloud SMTP test email';
    const html = `<p>This is a test from VoidCloud admin (${new Date().toISOString()}).</p><p>Transport: <b>${this.transporter ? 'SMTP' : this.resend ? 'Resend' : 'stub'}</b></p>`;
    await this.send(to, subject, html);
    return { ok: true };
  }
}

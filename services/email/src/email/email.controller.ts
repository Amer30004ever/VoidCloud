import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { MailerService } from '../mailer/mailer.service';
import { Public } from '../decorators/public.decorator';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';

@Controller('email')
export class EmailController {
  constructor(private readonly mailer: MailerService) {}

  @Post('send')
  @UseGuards(JwtAuthGuard)
  async send(@Body() body: { to: string; subject: string; html: string; text?: string }) {
    await this.mailer.send(body.to, body.subject, body.html, body.text);
    return { ok: true };
  }

  @Get('templates')
  listTemplates() {
    return {
      templates: ['welcome', 'verify-email', 'password-reset', 'invoice-paid', 'vps-ready'],
    };
  }

  @Post('templates')
  createTemplate(@Body() body: Record<string, unknown>) {
    return { ok: true, template: body };
  }

  @Post('verify/send')
  async sendVerify(@Body() body: { to: string; name: string; url: string }) {
    const { verifyEmailTemplate } = await import('../mailer/templates/verify-email');
    const { html, text } = verifyEmailTemplate(body.name, body.url);
    await this.mailer.send(body.to, 'Verify your Void Cloud email', html, text);
    return { ok: true };
  }

  @Post('invoice/send')
  async sendInvoice(@Body() body: { to: string; invoiceId: string }) {
    await this.mailer.send(body.to, 'Your Void Cloud invoice', `<p>Invoice ${body.invoiceId}</p>`);
    return { ok: true };
  }

  @Post('notification/send')
  async sendNotification(@Body() body: { to: string; subject: string; message: string }) {
    await this.mailer.send(body.to, body.subject, `<p>${body.message}</p>`);
    return { ok: true };
  }

  @Post('welcome/send')
  async sendWelcome(@Body() body: { to: string; name: string; dashboardUrl: string }) {
    const { welcomeEmail } = await import('../mailer/templates/welcome');
    const { html, text } = welcomeEmail(body.name, body.dashboardUrl);
    await this.mailer.send(body.to, 'Welcome to Void Cloud', html, text);
    return { ok: true };
  }

  @Public()
  @Get('health/smtp')
  async smtpHealth() {
    return this.mailer.verify();
  }
}

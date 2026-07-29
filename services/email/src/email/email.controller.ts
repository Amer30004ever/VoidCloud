import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { MailerService } from '../mailer/mailer.service';
import { Public } from '../decorators/public.decorator';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { RolesGuard } from '../guards/roles.guard';
import { Roles } from '../decorators/roles.decorator';

@Controller('email')
@UseGuards(JwtAuthGuard, RolesGuard)
export class EmailController {
  constructor(private readonly mailer: MailerService) {}

  @Post('send')
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  async send(@Body() body: { to: string; subject: string; html: string; text?: string }) {
    await this.mailer.send(body.to, body.subject, body.html, body.text);
    return { ok: true };
  }

  @Get('templates')
  @Roles(Role.USER, Role.AGENT, Role.ADMIN, Role.SUPER_ADMIN)
  listTemplates() {
    return {
      templates: ['welcome', 'verify-email', 'password-reset', 'invoice-paid', 'vps-ready'],
    };
  }

  @Post('templates')
  @Roles(Role.SUPER_ADMIN)
  createTemplate(@Body() body: Record<string, unknown>) {
    return { ok: true, template: body };
  }

  @Post('verify/send')
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  async sendVerify(@Body() body: { to: string; name: string; url: string }) {
    const { verifyEmailTemplate } = await import('../mailer/templates/verify-email');
    const { html, text } = verifyEmailTemplate(body.name, body.url);
    await this.mailer.send(body.to, 'Verify your Void Cloud email', html, text);
    return { ok: true };
  }

  @Post('invoice/send')
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  async sendInvoice(@Body() body: { to: string; invoiceId: string }) {
    await this.mailer.send(body.to, 'Your Void Cloud invoice', `<p>Invoice ${body.invoiceId}</p>`);
    return { ok: true };
  }

  @Post('notification/send')
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  async sendNotification(@Body() body: { to: string; subject: string; message: string }) {
    await this.mailer.send(body.to, body.subject, `<p>${body.message}</p>`);
    return { ok: true };
  }

  @Post('welcome/send')
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
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

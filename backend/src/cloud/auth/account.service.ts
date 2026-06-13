import { BadRequestException, Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { MailerService } from '../../mailer/mailer.service';

type PendingChange = { userId: string; newEmail: string; expiresAt: number };

/**
 * Account changes: email change (with confirmation to OLD email) and
 * password change (requires current password + sends notification email).
 *
 * Email-change tokens are kept in-memory; restarting the backend invalidates
 * pending requests, which is an acceptable trade-off for this UX.
 */
@Injectable()
export class CloudAccountService {
  private readonly logger = new Logger(CloudAccountService.name);
  private pending = new Map<string, PendingChange>();

  constructor(private prisma: PrismaService, private mailer: MailerService) {}

  private get frontend() {
    return (process.env.FRONTEND_URL || 'https://amer-portal.cc.cd').replace(/\/$/, '');
  }

  async requestEmailChange(userId: string, currentPassword: string, newEmail: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException();
    if (!(await bcrypt.compare(currentPassword, user.password))) {
      throw new UnauthorizedException('Current password is incorrect');
    }
    const normalized = (newEmail || '').trim().toLowerCase();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(normalized)) {
      throw new BadRequestException('Invalid email');
    }
    if (normalized === user.email.toLowerCase()) {
      throw new BadRequestException('New email is the same as current email');
    }
    const existing = await this.prisma.user.findUnique({ where: { email: normalized } });
    if (existing) throw new BadRequestException('Email already in use');

    const token = crypto.randomBytes(32).toString('hex');
    this.pending.set(token, { userId, newEmail: normalized, expiresAt: Date.now() + 30 * 60_000 });

    const url = `${this.frontend}/amercloud/dashboard/settings?confirmEmail=${token}`;
    const html = `<p>Hi ${user.name},</p>
      <p>We received a request to change your AmerCloud account email to <b>${normalized}</b>.</p>
      <p>If this was you, click the link below within 30 minutes to confirm:</p>
      <p><a href="${url}">Confirm email change</a></p>
      <p>If you did not request this, you can ignore this email — your address will not change.</p>`;
    try {
      await this.mailer.send(user.email, 'Confirm your AmerCloud email change', html);
    } catch (e: any) {
      this.logger.warn(`email-change confirmation send failed: ${e?.message ?? e}`);
    }
    return { ok: true, message: 'Confirmation sent to your current email.' };
  }

  async confirmEmailChange(token: string) {
    const entry = this.pending.get(token);
    if (!entry || entry.expiresAt < Date.now()) {
      this.pending.delete(token);
      throw new BadRequestException('Token expired or invalid');
    }
    this.pending.delete(token);
    const taken = await this.prisma.user.findUnique({ where: { email: entry.newEmail } });
    if (taken) throw new BadRequestException('Email already in use');
    const updated = await this.prisma.user.update({
      where: { id: entry.userId },
      data: { email: entry.newEmail, emailVerified: true },
    });
    return { ok: true, email: updated.email };
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    if (!newPassword || newPassword.length < 8) {
      throw new BadRequestException('New password must be at least 8 characters');
    }
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException();
    if (!(await bcrypt.compare(currentPassword, user.password))) {
      throw new UnauthorizedException('Current password is incorrect');
    }
    const hashed = await bcrypt.hash(newPassword, 12);
    await this.prisma.user.update({ where: { id: userId }, data: { password: hashed, mustChangePassword: false } });

    const html = `<p>Hi ${user.name},</p>
      <p>This is a notification that your AmerCloud password was just changed.</p>
      <p>If you did not make this change, please reset your password immediately and contact support.</p>`;
    try {
      await this.mailer.send(user.email, 'Your AmerCloud password was changed', html);
    } catch (e: any) {
      this.logger.warn(`password-change notification failed: ${e?.message ?? e}`);
    }
    return { ok: true };
  }
}

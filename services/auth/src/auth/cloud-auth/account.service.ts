import {
  BadRequestException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
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

  constructor(
    private prisma: PrismaService,
    private mailer: MailerService,
  ) { }

  private get frontend() {
    return (process.env.FRONTEND_URL || 'https://voidcloud.cc.cd').replace(
      /\/$/,
      '',
    );
  }

  async requestEmailChange(
    userId: string,
    currentPassword: string,
    newEmail: string,
  ) {
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
    const existing = await this.prisma.user.findUnique({
      where: { email: normalized },
    });
    if (existing) throw new BadRequestException('Email already in use');

    const token = crypto.randomBytes(32).toString('hex');
    this.pending.set(token, {
      userId,
      newEmail: normalized,
      expiresAt: Date.now() + 30 * 60_000,
    });

    const url = `${this.frontend}/dashboard/settings?confirmEmail=${token}`;
    const html = `<p>Hi ${user.name},</p>
      <p>We received a request to change your Void Cloud account email to <b>${normalized}</b>.</p>
      <p>If this was you, click the link below within 30 minutes to confirm:</p>
      <p><a href="${url}">Confirm email change</a></p>
      <p>If you did not request this, you can ignore this email — your address will not change.</p>`;
    try {
      await this.mailer.send(
        user.email,
        'Confirm your Void Cloud email change',
        html,
      );
    } catch (e: any) {
      this.logger.warn(
        `email-change confirmation send failed: ${e?.message ?? e}`,
      );
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
    const taken = await this.prisma.user.findUnique({
      where: { email: entry.newEmail },
    });
    if (taken) throw new BadRequestException('Email already in use');
    const updated = await this.prisma.user.update({
      where: { id: entry.userId },
      data: { email: entry.newEmail, emailVerified: true },
    });
    return { ok: true, email: updated.email };
  }

  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
  ) {
    if (!newPassword || newPassword.length < 8) {
      throw new BadRequestException(
        'New password must be at least 8 characters',
      );
    }
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException();
    if (!(await bcrypt.compare(currentPassword, user.password))) {
      throw new UnauthorizedException('Current password is incorrect');
    }
    const hashed = await bcrypt.hash(newPassword, 12);
    await this.prisma.user.update({
      where: { id: userId },
      data: { password: hashed, mustChangePassword: false },
    });

    const html = `<p>Hi ${user.name},</p>
      <p>This is a notification that your Void Cloud password was just changed.</p>
      <p>If you did not make this change, please reset your password immediately and contact support.</p>`;
    try {
      await this.mailer.send(
        user.email,
        'Your Void Cloud password was changed',
        html,
      );
    } catch (e: any) {
      this.logger.warn(
        `password-change notification failed: ${e?.message ?? e}`,
      );
    }
    return { ok: true };
  }

  async getProfile(userId: string) {
    const u = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!u) throw new UnauthorizedException();
    return {
      id: u.id,
      email: u.email,
      name: u.name,
      phone: u.phone ?? '',
      emailVerified: u.emailVerified,
      twoFactorEnabled: u.twoFactorEnabled,
      avatar: u.avatar ?? null,
      createdAt: u.createdAt,
    };
  }

  async updateProfile(
    userId: string,
    data: { displayName?: string; phone?: string | null },
  ) {
    const patch: { name?: string; phone?: string | null } = {};
    if (typeof data.displayName === 'string') {
      const name = data.displayName.trim();
      if (name.length < 1 || name.length > 80)
        throw new BadRequestException('Name must be 1-80 chars');
      patch.name = name;
    }
    if (data.phone !== undefined) {
      const phone = (data.phone ?? '').trim();
      if (phone && !/^01[0-9]{9}$/.test(phone)) {
        throw new BadRequestException(
          'Phone must be Egyptian format: 01XXXXXXXXX',
        );
      }
      patch.phone = phone || null;
    }
    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: patch,
    });
    return {
      ok: true,
      user: { id: updated.id, name: updated.name, phone: updated.phone },
    };
  }

  async deleteAccount(userId: string, password: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException();
    if (!(await bcrypt.compare(password || '', user.password))) {
      throw new UnauthorizedException('Password is incorrect');
    }
    // Cascade via Prisma onDelete where configured; otherwise best-effort cleanup.
    await this.prisma.user.delete({ where: { id: userId } });
    return { ok: true };
  }

  private readonly defaultPrefs = {
    vpsAlerts: true,
    usageAlerts: true,
    trialReminders: true,
    paymentAlerts: true,
    securityAlerts: true,
  };

  async getNotificationPreferences(userId: string) {
    const u = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!u) throw new UnauthorizedException();
    const stored =
      (u.notificationPrefs as Record<string, boolean> | null) ?? {};
    return { ...this.defaultPrefs, ...stored };
  }

  async updateNotificationPreferences(
    userId: string,
    prefs: Partial<Record<keyof typeof this.defaultPrefs, boolean>>,
  ) {
    const current = await this.getNotificationPreferences(userId);
    const next: Record<string, boolean> = { ...current };
    for (const k of Object.keys(this.defaultPrefs) as Array<
      keyof typeof this.defaultPrefs
    >) {
      if (typeof prefs[k] === 'boolean') next[k] = prefs[k] as boolean;
    }
    await this.prisma.user.update({
      where: { id: userId },
      data: { notificationPrefs: next },
    });
    return next;
  }
}

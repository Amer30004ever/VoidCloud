import { Injectable, BadRequestException, UnauthorizedException } from '@nestjs/common';
import * as speakeasy from 'speakeasy';
import * as QRCode from 'qrcode';
import * as crypto from 'crypto';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class TwoFactorService {
  constructor(private prisma: PrismaService) {}

  async status(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { twoFactorEnabled: true, recoveryCodes: true },
    });
    return {
      enabled: !!user?.twoFactorEnabled,
      recoveryCodesRemaining: user?.recoveryCodes?.length ?? 0,
    };
  }

  async beginEnable(userId: string, userEmail: string) {
    const secret = speakeasy.generateSecret({ name: `AmerCloud (${userEmail})`, length: 20 });
    await this.prisma.user.update({
      where: { id: userId },
      data: { twoFactorSecret: secret.base32, twoFactorEnabled: false },
    });
    const qr = await QRCode.toDataURL(secret.otpauth_url!);
    return { otpauthUrl: secret.otpauth_url, base32: secret.base32, qrCode: qr };
  }

  async verifyAndActivate(userId: string, token: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user?.twoFactorSecret) throw new BadRequestException('2FA not initialised');
    const ok = speakeasy.totp.verify({ secret: user.twoFactorSecret, encoding: 'base32', token, window: 1 });
    if (!ok) throw new BadRequestException('Invalid code');

    // Generate 8 recovery codes; show raw once, store bcrypt hashes.
    const raw = Array.from({ length: 8 }, () =>
      `${crypto.randomBytes(2).toString('hex')}-${crypto.randomBytes(3).toString('hex')}`,
    );
    const hashed = await Promise.all(raw.map((c) => bcrypt.hash(c, 10)));
    await this.prisma.user.update({
      where: { id: userId },
      data: { twoFactorEnabled: true, recoveryCodes: hashed },
    });
    return { enabled: true, recoveryCodes: raw };
  }

  async regenerateRecoveryCodes(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user?.twoFactorEnabled) throw new BadRequestException('2FA not enabled');
    const raw = Array.from({ length: 8 }, () =>
      `${crypto.randomBytes(2).toString('hex')}-${crypto.randomBytes(3).toString('hex')}`,
    );
    const hashed = await Promise.all(raw.map((c) => bcrypt.hash(c, 10)));
    await this.prisma.user.update({ where: { id: userId }, data: { recoveryCodes: hashed } });
    return { recoveryCodes: raw };
  }

  /**
   * Disable 2FA. Requires the user's current password OR a valid recovery code.
   */
  async disableWithProof(userId: string, password?: string, recoveryCode?: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new BadRequestException('User not found');

    let authorised = false;
    if (password) {
      authorised = await bcrypt.compare(password, user.password);
    } else if (recoveryCode) {
      for (const hash of user.recoveryCodes ?? []) {
        if (await bcrypt.compare(recoveryCode, hash)) {
          authorised = true;
          break;
        }
      }
    }
    if (!authorised) throw new UnauthorizedException('Password or recovery code is incorrect');

    await this.prisma.user.update({
      where: { id: userId },
      data: { twoFactorEnabled: false, twoFactorSecret: null, recoveryCodes: [] },
    });
    return { enabled: false };
  }

  /** Admin-only: forcibly clear a user's 2FA. */
  async adminReset(userId: string) {
    await this.prisma.user.update({
      where: { id: userId },
      data: { twoFactorEnabled: false, twoFactorSecret: null, recoveryCodes: [] },
    });
    return { ok: true };
  }

  /**
   * Verify a TOTP or recovery code at login time. Consumes the recovery code on success.
   */
  async verifyForLogin(userId: string, token: string): Promise<boolean> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user?.twoFactorEnabled || !user.twoFactorSecret) return true;
    const cleaned = (token ?? '').trim();
    if (!cleaned) return false;
    if (speakeasy.totp.verify({ secret: user.twoFactorSecret, encoding: 'base32', token: cleaned, window: 1 })) {
      return true;
    }
    for (const hash of user.recoveryCodes ?? []) {
      if (await bcrypt.compare(cleaned, hash)) {
        await this.prisma.user.update({
          where: { id: userId },
          data: { recoveryCodes: (user.recoveryCodes ?? []).filter((c) => c !== hash) },
        });
        return true;
      }
    }
    return false;
  }
}

import { Injectable, BadRequestException } from '@nestjs/common';
import * as speakeasy from 'speakeasy';
import * as QRCode from 'qrcode';
import * as crypto from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class TwoFactorService {
  constructor(private prisma: PrismaService) {}

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
    const recovery = Array.from({ length: 8 }, () => crypto.randomBytes(5).toString('hex'));
    await this.prisma.user.update({
      where: { id: userId },
      data: { twoFactorEnabled: true, recoveryCodes: recovery },
    });
    return { enabled: true, recoveryCodes: recovery };
  }

  async disable(userId: string) {
    await this.prisma.user.update({
      where: { id: userId },
      data: { twoFactorEnabled: false, twoFactorSecret: null, recoveryCodes: [] },
    });
    return { enabled: false };
  }

  async verifyForLogin(userId: string, token: string): Promise<boolean> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user?.twoFactorEnabled || !user.twoFactorSecret) return true;
    if (speakeasy.totp.verify({ secret: user.twoFactorSecret, encoding: 'base32', token, window: 1 })) return true;
    if (user.recoveryCodes?.includes(token)) {
      await this.prisma.user.update({
        where: { id: userId },
        data: { recoveryCodes: user.recoveryCodes.filter((c) => c !== token) },
      });
      return true;
    }
    return false;
  }
}

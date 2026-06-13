import { Injectable, UnauthorizedException, ConflictException, BadRequestException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import * as speakeasy from 'speakeasy';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { MailerService } from '../mailer/mailer.service';
import { passwordResetEmail } from '../mailer/templates/password-reset';

const RESET_TTL_MINUTES = 30;

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private mailer: MailerService,
  ) {}

  async validateUser(email: string, password: string): Promise<any> {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (user && (await bcrypt.compare(password, user.password))) {
      const { password: _, ...result } = user;
      return result;
    }
    return null;
  }

  async login(loginDto: LoginDto) {
    const user = await this.prisma.user.findUnique({ where: { email: loginDto.email } });
    if (!user || !(await bcrypt.compare(loginDto.password, user.password))) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // 2FA challenge
    if (user.twoFactorEnabled && user.twoFactorSecret) {
      const token = (loginDto.twoFactorToken ?? '').trim();
      if (!token) {
        return { requires2FA: true, userId: user.id };
      }
      const totpOk = speakeasy.totp.verify({ secret: user.twoFactorSecret, encoding: 'base32', token, window: 1 });
      let ok = totpOk;
      if (!ok && user.recoveryCodes?.length) {
        for (const hash of user.recoveryCodes) {
          if (await bcrypt.compare(token, hash)) {
            ok = true;
            await this.prisma.user.update({
              where: { id: user.id },
              data: { recoveryCodes: user.recoveryCodes.filter((c) => c !== hash) },
            });
            break;
          }
        }
      }
      if (!ok) throw new UnauthorizedException('Invalid 2FA code');
    }

    const payload = { email: user.email, sub: user.id, role: user.role };
    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        mustChangePassword: user.mustChangePassword ?? false,
      },
    };
  }

  async register(registerDto: RegisterDto) {
    const existingUser = await this.prisma.user.findUnique({ where: { email: registerDto.email } });
    if (existingUser) throw new ConflictException('User already exists');

    const hashedPassword = await bcrypt.hash(registerDto.password, 12);
    const user = await this.prisma.user.create({
      data: {
        email: registerDto.email,
        name: registerDto.name,
        password: hashedPassword,
        role: registerDto.role || 'USER',
        isActive: true,
      },
    });
    const { password: _, ...result } = user;
    return result;
  }

  async getMe(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true, email: true, name: true, role: true, isActive: true,
        mustChangePassword: true, createdAt: true, updatedAt: true,
      },
    });
    if (!user) throw new UnauthorizedException('User not found');
    return user;
  }

  /**
   * Issue a one-time password-reset token, store its SHA-256 hash, and email
   * the raw token to the user. Always returns a generic OK to avoid leaking
   * which emails are registered.
   */
  async forgotPassword(email: string): Promise<{ ok: true }> {
    const user = await this.prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (!user) {
      this.logger.log(`forgot-password requested for unknown email=${email}`);
      return { ok: true };
    }

    // Invalidate any previous unused tokens for this user
    await this.prisma.passwordResetToken.updateMany({
      where: { userId: user.id, usedAt: null, expiresAt: { gt: new Date() } },
      data: { usedAt: new Date() },
    });

    const rawToken = crypto.randomBytes(32).toString('hex'); // 64 chars
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    const expiresAt = new Date(Date.now() + RESET_TTL_MINUTES * 60 * 1000);

    await this.prisma.passwordResetToken.create({
      data: { userId: user.id, tokenHash, expiresAt },
    });

    const frontend = (process.env.FRONTEND_URL || 'https://amer-portal.cc.cd').replace(/\/$/, '');
    const resetUrl = `${frontend}/amercloud/reset-password?token=${rawToken}`;
    const { html, text } = passwordResetEmail(user.name, resetUrl, RESET_TTL_MINUTES);

    try {
      await this.mailer.send(user.email, 'Reset your AmerCloud password', html, text);
    } catch (e: any) {
      this.logger.error(`Failed to send reset email to ${user.email}: ${e?.message ?? e}`);
      // Still return ok — don't leak transport state to caller.
    }
    return { ok: true };
  }

  /**
   * Consume a one-time reset token and set a new password.
   */
  async resetPassword(token: string, newPassword: string): Promise<{ ok: true }> {
    if (!token || token.length < 20) throw new BadRequestException('Invalid token');
    if (!newPassword || newPassword.length < 8) {
      throw new BadRequestException('Password must be at least 8 characters');
    }

    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const record = await this.prisma.passwordResetToken.findUnique({ where: { tokenHash } });
    if (!record || record.usedAt || record.expiresAt < new Date()) {
      throw new BadRequestException('Reset link is invalid or has expired');
    }

    const hashed = await bcrypt.hash(newPassword, 12);
    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: record.userId },
        data: { password: hashed, mustChangePassword: false },
      }),
      this.prisma.passwordResetToken.update({
        where: { id: record.id },
        data: { usedAt: new Date() },
      }),
    ]);
    return { ok: true };
  }
}

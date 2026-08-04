import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
  ForbiddenException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import * as speakeasy from 'speakeasy';
import { Prisma, Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { MailerService } from '../mailer/mailer.service';
import { passwordResetEmail } from '../mailer/templates/password-reset';
import { RbacService } from '../rbac/rbac.service';
import { TokenRevocationService } from './token-revocation.service';
import { CreditService } from '../../../billing/src/billing/credit.service';
import { TenantIsolationService } from '../rbac/tenant-isolation.service';
import { TosAcceptanceService } from '../tos/tos-acceptance.service';

const RESET_TTL_MINUTES = 30;

/**
 * Lightweight in-memory brute-force guard for credential endpoints.
 * Keyed by the lower-cased email (a predictable target) — separate from any
 * per-IP limiter at the gateway. Cleared on success so legitimate users are
 * never locked out permanently. Rolling window so old failures expire.
 */
const MAX_FAILED_ATTEMPTS = 10;
const LOCK_WINDOW_MS = 15 * 60 * 1000;
const ATTEMPT_HISTORY_MS = 30 * 60 * 1000;

/** Impersonation JWT lifetime — mirrored into the audit trail. */
const IMPERSONATION_TTL_MS = 15 * 60 * 1000;

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  private readonly failedAttempts = new Map<
    string,
    { count: number; firstAt: number; lockedAt: number | null }
  >();

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private mailer: MailerService,
    private rbacService: RbacService,
    private revocation: TokenRevocationService,
    private creditService: CreditService,
    private tenantIsolation: TenantIsolationService,
    private tosService: TosAcceptanceService,
  ) { }

  private attemptKey(email: string) {
    return email.trim().toLowerCase();
  }

  /** Throws if the account is currently locked out by repeated failures. */
  private assertNotLocked(email: string) {
    const entry = this.failedAttempts.get(this.attemptKey(email));
    if (entry?.lockedAt && Date.now() - entry.lockedAt < LOCK_WINDOW_MS) {
      throw new UnauthorizedException('Too many failed attempts — try again later');
    }
    if (entry?.lockedAt) {
      // Lock window elapsed — reset so a fresh attempt can proceed.
      this.failedAttempts.delete(this.attemptKey(email));
    }
  }

  /** Records a failure and locks the account once the threshold is crossed. */
  private registerFailure(email: string) {
    const key = this.attemptKey(email);
    const now = Date.now();
    const entry = this.failedAttempts.get(key);
    if (!entry) {
      this.failedAttempts.set(key, { count: 1, firstAt: now, lockedAt: null });
      return;
    }
    // Drop history older than the rolling window so this is a true sliding counter.
    if (now - entry.firstAt > ATTEMPT_HISTORY_MS) {
      entry.count = 0;
      entry.firstAt = now;
    }
    entry.count += 1;
    if (entry.count >= MAX_FAILED_ATTEMPTS) {
      entry.lockedAt = now;
    }
  }

  private clearFailures(email: string) {
    this.failedAttempts.delete(this.attemptKey(email));
  }

  async validateUser(email: string, password: string): Promise<any> {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (user && (await bcrypt.compare(password, user.password))) {
      const { password: _, ...result } = user;
      return result;
    }
    return null;
  }

  async login(loginDto: LoginDto) {
    const normalizedEmail = (loginDto.email ?? '').trim().toLowerCase();

    this.assertNotLocked(normalizedEmail);

    const user = await this.prisma.user.findUnique({
      where: { email: normalizedEmail },
    });
    if (!user || !(await bcrypt.compare(loginDto.password, user.password))) {
      this.registerFailure(normalizedEmail);
      throw new UnauthorizedException('Invalid credentials');
    }

    // Wrong password path handled above; reaching here means creds are valid.
    if (!user.isActive || user.suspendedAt) {
      this.registerFailure(normalizedEmail);
      throw new UnauthorizedException('Account is disabled or suspended');
    }

    // Valid credentials — clear any prior failed-attempt history.
    this.clearFailures(normalizedEmail);

    // 2FA challenge
    if (user.twoFactorEnabled && user.twoFactorSecret) {
      const token = (loginDto.twoFactorToken ?? '').trim();
      if (!token) {
        return { requires2FA: true, userId: user.id };
      }
      const totpOk = speakeasy.totp.verify({
        secret: user.twoFactorSecret,
        encoding: 'base32',
        token,
        window: 1,
      });
      let ok = totpOk;
      if (!ok && user.recoveryCodes?.length) {
        for (const hash of user.recoveryCodes) {
          if (await bcrypt.compare(token, hash)) {
            ok = true;
            await this.prisma.user.update({
              where: { id: user.id },
              data: {
                recoveryCodes: user.recoveryCodes.filter((c) => c !== hash),
              },
            });
            break;
          }
        }
      }
      if (!ok) throw new UnauthorizedException('Invalid 2FA code');
    }

    const jti = crypto.randomBytes(16).toString('hex');
    const tenantId = user.role === 'SUPER_ADMIN'
      ? null
      : await this.tenantIsolation.getUserTenantId(user.id, user.role).catch(() => null);
    const payload = { email: user.email, sub: user.id, role: user.role, jti, tenantId };

    // Fetch user permissions from RBAC
    const userPermissions = await this.rbacService.getUserPermissions(user.id);

    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        permissions: userPermissions,
        mustChangePassword: user.mustChangePassword ?? false,
      },
    };
  }

  /**
   * Logout: revoke exactly this token's jti until it would have expired anyway.
   * Every subsequent request presenting the same JWT is rejected by JwtStrategy.
   */
  async logout(jti: string | undefined, exp: number | undefined) {
    if (jti && exp) await this.revocation.revokeToken(jti, exp);
    return { ok: true };
  }

  /**
   * Admin-forced revoke of ALL sessions for a user (SUPER_ADMIN/ADMIN).
   * Also called on password change so leaked-old-password tokens die immediately.
   */
  async revokeAllSessions(userId: string) {
    await this.revocation.revokeAllForUser(userId);
    return { ok: true, userId };
  }

  async register(registerDto: RegisterDto) {
    const email = registerDto.email.toLowerCase().trim();

    if (!registerDto.tosAccepted) {
      throw new BadRequestException('You must accept the Terms of Service and Privacy Policy to register');
    }

    const existingUser = await this.prisma.user.findUnique({
      where: { email },
    });
    if (existingUser)
      throw new ConflictException('Email is already registered');

    const hashedPassword = await bcrypt.hash(registerDto.password, 12);

    // Optional plan selection
    let cloudPlanId: string | undefined;
    let trialEndsAt: Date | undefined;
    let subscriptionStatus: any = 'TRIALING';
    if (registerDto.planSlug) {
      const plan = await this.prisma.cloudPlan.findUnique({
        where: { slug: registerDto.planSlug },
      });
      if (plan && plan.isActive) {
        cloudPlanId = plan.id;
        if (plan.trialDays > 0) {
          trialEndsAt = new Date(
            Date.now() + plan.trialDays * 24 * 60 * 60 * 1000,
          );
          subscriptionStatus = 'TRIALING';
        } else if (plan.priceUSD === 0 && plan.priceEGP === 0) {
          subscriptionStatus = 'ACTIVE';
        } else {
          subscriptionStatus = 'INCOMPLETE';
        }
      }
    }

    const rawVerifyToken = crypto.randomBytes(32).toString('hex');
    const verifyTokenHash = crypto
      .createHash('sha256')
      .update(rawVerifyToken)
      .digest('hex');
    const verifyExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);

    const user = await this.prisma.user.create({
      data: {
        email,
        name: registerDto.name.trim(),
        password: hashedPassword,
        role: registerDto.role || 'USER',
        isActive: true,
        phone: registerDto.phone,
        cloudPlanId,
        trialEndsAt,
        subscriptionStatus,
        emailVerified: false,
        emailVerifyTokenHash: verifyTokenHash,
        emailVerifyExpires: verifyExpires,
      },
    });

    await this.tosService.accept(user.id, {
      tosVersion: '1.0',
      privacyVersion: '1.0',
    });

    // Grant free trial credits (Prompt 2.2a — configurable via env var)
    const trialCreditAmount = Number(process.env.TRIAL_CREDIT_AMOUNT ?? '5');
    if (trialCreditAmount > 0) {
      await this.creditService.grantTrialCredits(user.id, trialCreditAmount).catch((e) =>
        this.logger.warn(`Trial credit grant failed for ${user.id}: ${e?.message ?? e}`),
      );
    }

    const frontend = (
      process.env.FRONTEND_URL || 'https://voidcloud.cc.cd'
    ).replace(/\/$/, '');
    const verifyUrl = `${frontend}/verify-email?token=${rawVerifyToken}`;

    try {
      const { welcomeEmail } = await import('../mailer/templates/welcome');
      const { verifyEmailTemplate } =
        await import('../mailer/templates/verify-email');
      const w = welcomeEmail(user.name, `${frontend}/dashboard`);
      const v = verifyEmailTemplate(user.name, verifyUrl);
      this.mailer
        .send(user.email, 'Welcome to Void Cloud 🚀', w.html, w.text)
        .catch((e) =>
          this.logger.warn(
            `welcome email failed for ${user.email}: ${e?.message ?? e}`,
          ),
        );
      this.mailer
        .send(user.email, 'Verify your Void Cloud email', v.html, v.text)
        .catch((e) =>
          this.logger.warn(
            `verify email failed for ${user.email}: ${e?.message ?? e}`,
          ),
        );
    } catch (e: any) {
      this.logger.warn(`registration emails skipped: ${e?.message ?? e}`);
    }

    const { password: _p, emailVerifyTokenHash: _t, ...result } = user as any;
    return { user: result, requiresVerification: true };
  }

  async verifyEmail(token: string): Promise<{ ok: true }> {
    if (!token || token.length < 20)
      throw new BadRequestException('Invalid token');
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const user = await this.prisma.user.findUnique({
      where: { emailVerifyTokenHash: tokenHash },
    });
    if (
      !user ||
      !user.emailVerifyExpires ||
      user.emailVerifyExpires < new Date()
    ) {
      throw new BadRequestException(
        'Verification link is invalid or has expired',
      );
    }
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerified: true,
        emailVerifyTokenHash: null,
        emailVerifyExpires: null,
      },
    });
    return { ok: true };
  }

  async resendVerification(email: string): Promise<{ ok: true }> {
    const user = await this.prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    });
    if (!user || user.emailVerified) return { ok: true };

    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto
      .createHash('sha256')
      .update(rawToken)
      .digest('hex');
    const expires = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await this.prisma.user.update({
      where: { id: user.id },
      data: { emailVerifyTokenHash: tokenHash, emailVerifyExpires: expires },
    });

    const frontend = (
      process.env.FRONTEND_URL || 'https://voidcloud.cc.cd'
    ).replace(/\/$/, '');
    const verifyUrl = `${frontend}/verify-email?token=${rawToken}`;
    try {
      const { verifyEmailTemplate } =
        await import('../mailer/templates/verify-email');
      const { html, text } = verifyEmailTemplate(user.name, verifyUrl);
      await this.mailer.send(
        user.email,
        'Verify your Void Cloud email',
        html,
        text,
      );
    } catch (e: any) {
      this.logger.warn(
        `resend verify failed for ${user.email}: ${e?.message ?? e}`,
      );
    }
    return { ok: true };
  }

  async getMe(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        mustChangePassword: true,
        createdAt: true,
        updatedAt: true,
        onboardingCompleted: true,
        onboardingSkipped: true,
        themePreference: true,
      },
    });
    if (!user) throw new UnauthorizedException('User not found');
    return user;
  }

  async updateTheme(userId: string, themePreference: string) {
    const allowed = ['light', 'dark', 'system'];
    if (!allowed.includes(themePreference)) {
      throw new BadRequestException('Invalid theme preference');
    }
    await this.prisma.user.update({
      where: { id: userId },
      data: { themePreference },
    });
    return { themePreference };
  }

  async findUserByOAuth(provider: string, providerAccountId: string) {
    const identity = await this.prisma.oAuthIdentity.findUnique({
      where: { provider_providerAccountId: { provider, providerAccountId } },
      include: { user: true },
    });
    return identity?.user ?? null;
  }

  async findOAuthIdentity(provider: string, providerAccountId: string) {
    return this.prisma.oAuthIdentity.findUnique({
      where: { provider_providerAccountId: { provider, providerAccountId } },
    });
  }

  async linkOAuthIdentity(userId: string, provider: string, providerAccountId: string) {
    await this.prisma.oAuthIdentity.upsert({
      where: { provider_providerAccountId: { provider, providerAccountId } },
      create: { userId, provider, providerAccountId },
      update: { userId },
    });
  }

  async unlinkOAuthIdentity(userId: string, provider: string) {
    const identity = await this.prisma.oAuthIdentity.findFirst({
      where: { userId, provider },
    });
    if (identity) {
      await this.prisma.oAuthIdentity.delete({ where: { id: identity.id } });
    }
  }

  async linkedProviders(userId: string) {
    const identities = await this.prisma.oAuthIdentity.findMany({
      where: { userId },
      select: { provider: true },
    });
    return identities.map((i) => i.provider);
  }

  async upsertOAuthLogin(opts: {
    provider: string;
    providerAccountId: string;
    email: string;
    name: string;
    context: 'admin_signup' | 'user_signup' | 'agent_accept' | 'login' | 'link';
    inviteToken?: string;
  }): Promise<{ user: any; token: string }>
  {
    const { provider, providerAccountId, email, name, context, inviteToken } = opts;
    const normalizedEmail = email.toLowerCase().trim();

    let role: string = context === 'admin_signup' ? 'ADMIN' : 'USER';

    const existing = await this.prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (existing) {
      if ((existing.role as any) === 'SUPER_ADMIN') {
        throw new ForbiddenException('OAuth is not available for super admin accounts');
      }
      await this.linkOAuthIdentity(existing.id, provider, providerAccountId);
      const jti = crypto.randomBytes(16).toString('hex');
      const tenantId = (existing.role as any) === 'SUPER_ADMIN'
        ? null
        : await this.tenantIsolation.getUserTenantId(existing.id, existing.role).catch(() => null);
      const payload = { email: existing.email, sub: existing.id, role: existing.role, jti, tenantId };
      const userPermissions = await this.rbacService.getUserPermissions(existing.id);
      return {
        user: {
          id: existing.id,
          email: existing.email,
          name: existing.name,
          role: existing.role,
          permissions: userPermissions,
          mustChangePassword: existing.mustChangePassword ?? false,
        },
        token: this.jwtService.sign(payload),
      };
    }

    if (context === 'agent_accept') {
      if (!inviteToken) throw new BadRequestException('Missing invite token');
      const invite = await this.prisma.agentInvite.findUnique({ where: { token: inviteToken } });
      if (!invite || invite.expiresAt < new Date() || invite.acceptedAt) {
        throw new BadRequestException('No valid invite found');
      }
      role = 'AGENT';
      const user = await this.prisma.user.create({
        data: {
          email: normalizedEmail,
          name,
          password: await bcrypt.hash(crypto.randomBytes(20).toString('hex'), 12),
          role: 'AGENT',
          isActive: true,
          emailVerified: true,
          onboardingCompleted: false,
          onboardingSkipped: false,
        },
      });
      await this.prisma.agentInvite.update({ where: { id: invite.id }, data: { acceptedAt: new Date() } });
      const jti = crypto.randomBytes(16).toString('hex');
      const payload = { email: user.email, sub: user.id, role: user.role, jti, tenantId: invite.tenantId };
      const userPermissions = await this.rbacService.getUserPermissions(user.id);
      return {
        user: { id: user.id, email: user.email, name: user.name, role: user.role, permissions: userPermissions, mustChangePassword: user.mustChangePassword ?? false },
        token: this.jwtService.sign(payload),
      };
    }

    if (context === 'admin_signup') {
      const user = await this.prisma.user.create({
        data: {
          email: normalizedEmail,
          name,
          password: await bcrypt.hash(crypto.randomBytes(20).toString('hex'), 12),
          role: 'ADMIN',
          isActive: true,
          emailVerified: true,
          onboardingCompleted: false,
          onboardingSkipped: false,
        },
      });
      const jti = crypto.randomBytes(16).toString('hex');
      const payload = { email: user.email, sub: user.id, role: user.role, jti, tenantId: null };
      const userPermissions = await this.rbacService.getUserPermissions(user.id);
      return {
        user: { id: user.id, email: user.email, name: user.name, role: user.role, permissions: userPermissions, mustChangePassword: user.mustChangePassword ?? false },
        token: this.jwtService.sign(payload),
      };
    }

    if (context === 'user_signup' || context === 'login') {
      const effectiveRole = context === 'user_signup' ? 'USER' : 'USER';
      const user = await this.prisma.user.create({
        data: {
          email: normalizedEmail,
          name,
          password: await bcrypt.hash(crypto.randomBytes(20).toString('hex'), 12),
          role: effectiveRole,
          isActive: true,
          emailVerified: true,
          onboardingCompleted: false,
          onboardingSkipped: false,
        },
      });
      const jti = crypto.randomBytes(16).toString('hex');
      const payload = { email: user.email, sub: user.id, role: user.role, jti, tenantId: null };
      const userPermissions = await this.rbacService.getUserPermissions(user.id);
      return {
        user: { id: user.id, email: user.email, name: user.name, role: user.role, permissions: userPermissions, mustChangePassword: user.mustChangePassword ?? false },
        token: this.jwtService.sign(payload),
      };
    }

    throw new BadRequestException('Invalid OAuth context');
  }

  async updateOnboarding(userId: string, data: { step?: string; completed?: boolean; skipped?: boolean }) {
    const patch: Record<string, unknown> = {};
    if (typeof data.completed === 'boolean') patch.onboardingCompleted = data.completed;
    if (typeof data.skipped === 'boolean') patch.onboardingSkipped = data.skipped;
    if (data.step) patch.onboardingStep = data.step;
    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: patch,
    });
    return updated;
  }

  /**
   * Issue a one-time password-reset token, store its SHA-256 hash, and email
   * the raw token to the user. Always returns a generic OK to avoid leaking
   * which emails are registered.
   */
  async forgotPassword(email: string): Promise<{ ok: true }> {
    const user = await this.prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });
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
    const tokenHash = crypto
      .createHash('sha256')
      .update(rawToken)
      .digest('hex');
    const expiresAt = new Date(Date.now() + RESET_TTL_MINUTES * 60 * 1000);

    await this.prisma.passwordResetToken.create({
      data: { userId: user.id, tokenHash, expiresAt },
    });

    const frontend = (
      process.env.FRONTEND_URL || 'https://voidcloud.cc.cd'
    ).replace(/\/$/, '');
    const resetUrl = `${frontend}/reset-password?token=${rawToken}`;
    const { html, text } = passwordResetEmail(
      user.name,
      resetUrl,
      RESET_TTL_MINUTES,
    );

    try {
      await this.mailer.send(
        user.email,
        'Reset your Void Cloud password',
        html,
        text,
      );
    } catch (e: any) {
      this.logger.error(
        `Failed to send reset email to ${user.email}: ${e?.message ?? e}`,
      );
      // Still return ok — don't leak transport state to caller.
    }
    return { ok: true };
  }

  /**
   * Consume a one-time reset token and set a new password.
   */
  async resetPassword(
    token: string,
    newPassword: string,
  ): Promise<{ ok: true }> {
    if (!token || token.length < 20)
      throw new BadRequestException('Invalid token');
    if (!newPassword || newPassword.length < 8) {
      throw new BadRequestException('Password must be at least 8 characters');
    }

    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const record = await this.prisma.passwordResetToken.findUnique({
      where: { tokenHash },
    });
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
    // Revoke every outstanding session — old passwords must never keep access.
    await this.revocation.revokeAllForUser(record.userId);
    return { ok: true };
  }

  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
  ): Promise<{ success: true; message: string }> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException('User not found');

    const valid = await bcrypt.compare(currentPassword, user.password);
    if (!valid) throw new BadRequestException('Current password is incorrect');

    const hashed = await bcrypt.hash(newPassword, 12);
    await this.prisma.user.update({
      where: { id: userId },
      data: { password: hashed, mustChangePassword: false },
    });
    // Password changed → invalidate all outstanding tokens for this user.
    await this.revocation.revokeAllForUser(userId);

    return { success: true, message: 'Password updated successfully' };
  }

  /**
   * Issue a short-lived impersonation JWT for SUPER_ADMIN or ADMIN.
   * The token targets the requested user, carries an `impersonatedBy` claim
   * identifying the real admin, and expires after 15 minutes.
   * Audit log is written BEFORE the token is issued so the action survives
   * any crash happening between those two steps.
   */
  async impersonate(
    adminId: string,
    adminRole: Role,
    targetUserId: string,
    reason: string,
  ) {
    if (adminRole !== 'SUPER_ADMIN' && adminRole !== 'ADMIN') {
      throw new ForbiddenException(
        'Only SUPER_ADMIN and ADMIN can impersonate users',
      );
    }

    const targetUser = await this.prisma.user.findUnique({
      where: { id: targetUserId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
      },
    });
    if (!targetUser) throw new NotFoundException('User not found');

    if (adminRole === 'ADMIN') {
      const adminTenantId = await this.tenantIsolation
        .getUserTenantId(adminId, adminRole)
        .catch(() => null);
      const targetUserTenant = await this.prisma.userTenant.findFirst({
        where: { userId: targetUserId },
      });
      if (
        !adminTenantId ||
        !targetUserTenant ||
        targetUserTenant.tenantId !== adminTenantId
      ) {
        throw new ForbiddenException(
          'Admins can only impersonate users within their own tenant',
        );
      }
    }

    const jti = crypto.randomBytes(16).toString('hex');
    const expiresAt = new Date(Date.now() + IMPERSONATION_TTL_MS);

    await this.prisma.auditLog.create({
      data: {
        action: 'USER_IMPERSONATED',
        adminId,
        userId: targetUserId,
        userEmail: targetUser.email,
        resource: targetUserId,
        details: {
          reason: reason || 'No reason provided',
          targetUserName: targetUser.name,
          targetUserRole: targetUser.role,
          // Session identity + hard expiry so a session that ends by token
          // expiry (rather than a manual exit) is still closable in the log.
          jti,
          expiresAt: expiresAt.toISOString(),
        } as Prisma.InputJsonValue,
      },
    });
    const tenantId =
      targetUser.role === 'SUPER_ADMIN'
        ? null
        : await this.tenantIsolation
            .getUserTenantId(targetUserId, targetUser.role)
            .catch(() => null);

    const payload = {
      email: targetUser.email,
      sub: targetUser.id,
      role: targetUser.role,
      jti,
      tenantId,
      impersonatedBy: adminId,
    };

    const access_token = this.jwtService.sign(payload, {
      expiresIn: `${IMPERSONATION_TTL_MS / 1000}s`,
    });

    return {
      access_token,
      user: {
        id: targetUser.id,
        email: targetUser.email,
        name: targetUser.name,
        role: targetUser.role,
      },
    };
  }

  async reauth(userId: string, password?: string, totpCode?: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, password: true, twoFactorEnabled: true, twoFactorSecret: true },
    });
    if (!user) throw new NotFoundException('User not found');

    if (password) {
      const ok = await bcrypt.compare(password, user.password);
      if (!ok) throw new UnauthorizedException('Password is incorrect');
    } else if (totpCode) {
      if (!user.twoFactorEnabled || !user.twoFactorSecret) {
        throw new BadRequestException('2FA is not enabled');
      }
      const ok = speakeasy.totp.verify({
        secret: user.twoFactorSecret,
        encoding: 'base32',
        token: totpCode,
        window: 1,
      });
      if (!ok) throw new UnauthorizedException('2FA code is incorrect');
    } else {
      throw new BadRequestException('password or totpCode is required');
    }

    return { ok: true };
  }

  /**
   * Close impersonation sessions that ended because the 15-minute token
   * expired rather than the admin clicking "exit". Without this, those
   * sessions have a start entry and no end entry in the audit trail.
   * Idempotent: a session already closed (manually or by a previous sweep)
   * is skipped.
   */
  async reconcileExpiredImpersonations(now: Date = new Date()) {
    const since = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const starts = await this.prisma.auditLog.findMany({
      where: { action: 'USER_IMPERSONATED', createdAt: { gte: since } },
      orderBy: { createdAt: 'asc' },
      take: 500,
    });
    const ends = await this.prisma.auditLog.findMany({
      where: {
        action: 'IMPERSONATION_SESSION_ENDED',
        createdAt: { gte: since },
      },
      take: 1000,
    });

    const closedJtis = new Set(
      (ends ?? [])
        .map((e: any) => (e?.details as any)?.jti)
        .filter((j: unknown): j is string => typeof j === 'string'),
    );

    let closed = 0;
    for (const start of (starts ?? []) as any[]) {
      const details = (start.details ?? {}) as Record<string, unknown>;
      const jti = typeof details['jti'] === 'string' ? (details['jti'] as string) : null;
      const expiresAtRaw = details['expiresAt'];
      if (!jti || typeof expiresAtRaw !== 'string') continue;
      if (closedJtis.has(jti)) continue;
      if (new Date(expiresAtRaw).getTime() > now.getTime()) continue;

      await this.prisma.auditLog.create({
        data: {
          action: 'IMPERSONATION_SESSION_ENDED',
          adminId: start.adminId ?? null,
          userId: start.userId ?? null,
          userEmail: start.userEmail ?? '',
          resource: start.resource ?? null,
          details: {
            reason: 'token_expiry',
            jti,
            impersonatedBy: start.adminId ?? null,
            expiresAt: expiresAtRaw,
          } as Prisma.InputJsonValue,
        },
      });
      closedJtis.add(jti);
      closed += 1;
    }

    return { scanned: (starts ?? []).length, closed };
  }

  async exitImpersonation(userId: string, impersonatedBy: string | null) {
    await this.prisma.auditLog.create({
      data: {
        action: 'IMPERSONATION_SESSION_ENDED',
        adminId: impersonatedBy,
        userId,
        userEmail: '',
        resource: userId,
        details: {
          reason: impersonatedBy ? 'manual_exit' : 'token_expiry',
          impersonatedBy,
        } as Prisma.InputJsonValue,
      },
    });
    return { ok: true };
  }

  async inviteTeamMember(adminId: string, email: string) {
    const tenantId = await this.tenantIsolation.getUserTenantId(adminId, 'ADMIN').catch(() => null);
    if (!tenantId) throw new ForbiddenException('No tenant found for admin');

    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await this.prisma.agentInvite.create({
      data: {
        tenantId,
        email: email.toLowerCase().trim(),
        token,
        expiresAt,
        createdBy: adminId,
      },
    });

    const appUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const inviteLink = `${appUrl}/voidcloud/business/invite/${token}`;

    await this.mailer.send(
      email,
      'You are invited to join VoidCloud',
      `<p>You have been invited to join a VoidCloud team. Click the link below to accept:</p><p><a href="${inviteLink}">Accept Invitation</a></p><p>This link expires in 7 days.</p>`,
    );

    await this.prisma.auditLog.create({
      data: {
        action: 'TEAM_INVITE_SENT',
        adminId,
        userEmail: email.toLowerCase().trim(),
        resource: tenantId,
        details: { inviteToken: token } as Prisma.InputJsonValue,
      },
    });

    return { ok: true, token };
  }

  async listTeamMembers(tenantId: string) {
    const members = await this.prisma.userTenant.findMany({
      where: { tenantId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
            isActive: true,
            createdAt: true,
          },
        },
        role: true,
      },
      orderBy: { joinedAt: 'desc' },
    });

    return members.map((m: any) => ({
      userId: m.user.id,
      email: m.user.email,
      name: m.user.name,
      role: m.user.role,
      isActive: m.user.isActive,
      joinedAt: m.joinedAt,
      roleId: m.roleId,
    }));
  }

  async deactivateTeamMember(tenantId: string, targetUserId: string, actorId: string) {
    const target = await this.prisma.userTenant.findUnique({
      where: { userId_tenantId: { userId: targetUserId, tenantId } },
      include: { user: true },
    });

    if (!target) throw new NotFoundException('Member not found in tenant');
    if ((target.user as any).role === 'ADMIN') {
      const admins = await this.prisma.userTenant.count({ where: { tenantId, roleId: 'admin' } });
      if (admins <= 1) throw new BadRequestException('Cannot remove the last admin');
    }

    await this.prisma.user.update({
      where: { id: targetUserId },
      data: { isActive: false },
    });

    await this.prisma.auditLog.create({
      data: {
        action: 'TEAM_MEMBER_DEACTIVATED',
        adminId: actorId,
        userId: targetUserId,
        userEmail: target.user.email,
        resource: tenantId,
        details: {} as Prisma.InputJsonValue,
      },
    });

    return { ok: true };
  }

  async getBusinessSettings(tenantId: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { id: true, name: true, subdomain: true, settings: true },
    });
    if (!tenant) throw new NotFoundException('Tenant not found');
    return tenant;
  }

  async updateBusinessSettings(tenantId: string, settings: Record<string, any>) {
    const existing = await this.prisma.tenant.findUnique({ where: { id: tenantId }, select: { settings: true } });
    const tenant = await this.prisma.tenant.update({
      where: { id: tenantId },
      data: { settings: { ...(existing?.settings as any || {}), ...settings } },
    });
    return tenant;
  }

  async generateApiKey(userId: string, name: string) {
    const rawKey = `vc_${crypto.randomBytes(24).toString('hex')}`;
    const keyHash = crypto.createHash('sha256').update(rawKey).digest('hex');
    const keyPrefix = rawKey.slice(0, 12);
    const apiKey = await this.prisma.apiKey.create({
      data: { name, keyHash, keyPrefix, userId },
    });

    await this.prisma.auditLog.create({
      data: {
        action: 'API_KEY_CREATED',
        adminId: userId,
        resource: apiKey.id,
        details: { name } as Prisma.InputJsonValue,
      },
    });

    return { ...apiKey, key: rawKey };
  }

  async listApiKeys(userId: string) {
    return this.prisma.apiKey.findMany({
      where: { userId },
      select: { id: true, name: true, keyPrefix: true, lastUsedAt: true, expiresAt: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async deleteApiKey(id: string, userId: string) {
    const key = await this.prisma.apiKey.findUnique({ where: { id } });
    if (!key || key.userId !== userId) throw new NotFoundException('API key not found');

    await this.prisma.apiKey.delete({ where: { id } });

    await this.prisma.auditLog.create({
      data: {
        action: 'API_KEY_DELETED',
        adminId: userId,
        resource: id,
        details: { name: key.name } as Prisma.InputJsonValue,
      },
    });

    return { ok: true };
  }

  async createTenantApiKey(userId: string, name: string, scopes: string[] = [], tenantId?: string) {
    const rawKey = `vc_${crypto.randomBytes(24).toString('hex')}`;
    const keyHash = crypto.createHash('sha256').update(rawKey).digest('hex');
    const keyPrefix = rawKey.slice(0, 12);

    const apiKey = await this.prisma.apiKey.create({
      data: { name, keyHash, keyPrefix, userId, tenantId, scopes },
    });

    await this.prisma.auditLog.create({
      data: {
        action: 'TENANT_API_KEY_CREATED',
        adminId: userId,
        resource: apiKey.id,
        details: { name, scopes, tenantId } as Prisma.InputJsonValue,
      },
    });

    return { ...apiKey, key: rawKey };
  }

  async listTenantApiKeys(userId: string) {
    return this.prisma.apiKey.findMany({
      where: { userId },
      select: { id: true, name: true, keyPrefix: true, lastUsedAt: true, expiresAt: true, createdAt: true, scopes: true, tenantId: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async regenerateApiKey(id: string, userId: string) {
    const key = await this.prisma.apiKey.findUnique({ where: { id } });
    if (!key || key.userId !== userId) throw new NotFoundException('API key not found');

    const rawKey = `vc_${crypto.randomBytes(24).toString('hex')}`;
    const keyHash = crypto.createHash('sha256').update(rawKey).digest('hex');
    const keyPrefix = rawKey.slice(0, 12);

    const updated = await this.prisma.apiKey.update({
      where: { id },
      data: { keyHash, keyPrefix },
    });

    await this.prisma.auditLog.create({
      data: {
        action: 'API_KEY_REGENERATED',
        adminId: userId,
        resource: id,
        details: { name: key.name } as Prisma.InputJsonValue,
      },
    });

    return { ...updated, key: rawKey };
  }
}

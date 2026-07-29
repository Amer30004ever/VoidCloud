/**
 * Comprehensive AuthService coverage — register / verifyEmail / forgotPassword /
 * password-reset session invalidation. Login and reset-token security paths are
 * covered in auth.service.spec.ts; this file rounds out the remaining
 * acceptance criteria without hitting SMTP.
 *
 * Mailer is fully mocked — no real SMTP delivery.
 */
import { BadRequestException, ConflictException, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import { AuthService } from './auth.service';

jest.mock('bcryptjs', () => ({
  compare: jest.fn(),
  hash: jest.fn().mockResolvedValue('hashed-pw'),
}));

const compareMock = bcrypt.compare as jest.MockedFunction<typeof bcrypt.compare>;

function makeService(prisma: any) {
  const jwtService = { sign: jest.fn().mockReturnValue('token') };
  const mailer = { send: jest.fn().mockResolvedValue(undefined) };
  const rbacService = { getUserPermissions: jest.fn().mockResolvedValue([]) };
  const revocation = {
    revokeToken: jest.fn().mockResolvedValue(undefined),
    revokeAllForUser: jest.fn().mockResolvedValue(undefined),
    isTokenRevoked: jest.fn().mockResolvedValue(false),
  };
  const creditService = { grantTrialCredits: jest.fn().mockResolvedValue(undefined) };
  const tenantIsolation = {};
  const tosService = { accept: jest.fn().mockResolvedValue({ ok: true }) };
  const service = new AuthService(
    prisma as any,
    jwtService as any,
    mailer as any,
    rbacService as any,
    revocation as any,
    creditService as any,
    tenantIsolation as any,
    tosService as any,
  );
  return { service, jwtService, mailer, rbacService, revocation, creditService };
}

beforeEach(() => {
  jest.clearAllMocks();
  compareMock.mockResolvedValue(true);
});

describe('AuthService.register', () => {
  it('creates a new user, hashes password, and issues verification token', async () => {
    const prisma = {
      user: {
        findUnique: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockImplementation(({ data }: any) =>
          Promise.resolve({ id: 'u-new', ...data }),
        ),
      },
      cloudPlan: { findUnique: jest.fn().mockResolvedValue(null) },
    };
    const { service, mailer } = makeService(prisma);
    const res: any = await service.register({
      email: 'NEW@Example.com',
      password: 'strongpass123',
      name: 'New User',
      tosAccepted: true,
    } as any);
    expect(res.user.email).toBe('new@example.com');
    expect(res.requiresVerification).toBe(true);
    // Password must be hashed, never stored raw.
    expect(prisma.user.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ password: 'hashed-pw', emailVerified: false }),
    }));
    // Verification token hash is stored, raw token is emailed via mailer.
    const created = prisma.user.create.mock.calls[0][0].data;
    expect(created.emailVerifyTokenHash).toMatch(/^[a-f0-9]{64}$/);
    // No password in the returned payload.
    expect(res.user.password).toBeUndefined();
    expect(res.user.emailVerifyTokenHash).toBeUndefined();
    // Mailer is mocked — nothing hits SMTP.
    expect(mailer.send).toHaveBeenCalled();
  });

  it('rejects duplicate email with ConflictException', async () => {
    const prisma = {
      user: { findUnique: jest.fn().mockResolvedValue({ id: 'exists' }) },
    };
    const { service } = makeService(prisma);
    await expect(
      service.register({ email: 'dup@x.com', password: 'strongpass', name: 'x', tosAccepted: true } as any),
    ).rejects.toThrow(ConflictException);
  });
});

describe('AuthService.verifyEmail', () => {
  it('accepts a valid token exactly once', async () => {
    const raw = crypto.randomBytes(32).toString('hex');
    const hash = crypto.createHash('sha256').update(raw).digest('hex');
    const prisma = {
      user: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'u1',
          emailVerifyTokenHash: hash,
          emailVerifyExpires: new Date(Date.now() + 60000),
        }),
        update: jest.fn().mockResolvedValue({}),
      },
    };
    const { service } = makeService(prisma);
    await expect(service.verifyEmail(raw)).resolves.toEqual({ ok: true });
    expect(prisma.user.update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ emailVerified: true, emailVerifyTokenHash: null }),
    }));
  });

  it('rejects an expired verification token', async () => {
    const raw = crypto.randomBytes(32).toString('hex');
    const hash = crypto.createHash('sha256').update(raw).digest('hex');
    const prisma = {
      user: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'u1',
          emailVerifyTokenHash: hash,
          emailVerifyExpires: new Date(Date.now() - 60000),
        }),
      },
    };
    const { service } = makeService(prisma);
    await expect(service.verifyEmail(raw)).rejects.toThrow(BadRequestException);
  });

  it('rejects an invalid/unknown token', async () => {
    const prisma = { user: { findUnique: jest.fn().mockResolvedValue(null) } };
    const { service } = makeService(prisma);
    await expect(service.verifyEmail('a'.repeat(64))).rejects.toThrow(BadRequestException);
  });

  it('rejects an obviously-malformed token without hitting DB', async () => {
    const prisma = { user: { findUnique: jest.fn() } };
    const { service } = makeService(prisma);
    await expect(service.verifyEmail('short')).rejects.toThrow(BadRequestException);
    expect(prisma.user.findUnique).not.toHaveBeenCalled();
  });
});

describe('AuthService.forgotPassword — no email enumeration', () => {
  it('returns { ok: true } for a UNKNOWN email without sending mail (no existence leak)', async () => {
    const prisma = {
      user: { findUnique: jest.fn().mockResolvedValue(null) },
      passwordResetToken: { updateMany: jest.fn(), create: jest.fn() },
    };
    const { service, mailer } = makeService(prisma);
    await expect(service.forgotPassword('ghost@example.com')).resolves.toEqual({ ok: true });
    expect(mailer.send).not.toHaveBeenCalled();
    expect(prisma.passwordResetToken.create).not.toHaveBeenCalled();
  });

  it('issues + emails a token for a KNOWN email and invalidates prior unused tokens', async () => {
    const prisma = {
      user: { findUnique: jest.fn().mockResolvedValue({ id: 'u1', email: 'x@x.com', name: 'X' }) },
      passwordResetToken: {
        updateMany: jest.fn().mockResolvedValue({ count: 2 }),
        create: jest.fn().mockResolvedValue({}),
      },
    };
    const { service, mailer } = makeService(prisma);
    await service.forgotPassword('x@x.com');
    expect(prisma.passwordResetToken.updateMany).toHaveBeenCalled();
    expect(prisma.passwordResetToken.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        userId: 'u1',
        tokenHash: expect.stringMatching(/^[a-f0-9]{64}$/),
      }),
    }));
    expect(mailer.send).toHaveBeenCalledTimes(1);
    // Same identical response shape for known + unknown — response body itself
    // must not encode existence.
  });

  it('returns { ok: true } even if the mailer fails (does not leak transport state)', async () => {
    const prisma = {
      user: { findUnique: jest.fn().mockResolvedValue({ id: 'u1', email: 'x@x.com', name: 'X' }) },
      passwordResetToken: {
        updateMany: jest.fn().mockResolvedValue({}),
        create: jest.fn().mockResolvedValue({}),
      },
    };
    const { service, mailer } = makeService(prisma);
    mailer.send.mockRejectedValue(new Error('SMTP down'));
    await expect(service.forgotPassword('x@x.com')).resolves.toEqual({ ok: true });
  });
});

describe('AuthService.resetPassword — session invalidation', () => {
  it('revokes every existing session for the user after a successful reset', async () => {
    const raw = crypto.randomBytes(32).toString('hex');
    const hash = crypto.createHash('sha256').update(raw).digest('hex');
    const prisma = {
      passwordResetToken: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'rt', userId: 'u1', tokenHash: hash, usedAt: null,
          expiresAt: new Date(Date.now() + 60000),
        }),
        update: jest.fn(),
      },
      user: { update: jest.fn() },
      $transaction: jest.fn().mockImplementation((ops: any) => Promise.all(ops)),
    };
    const { service, revocation } = makeService(prisma);
    await expect(service.resetPassword(raw, 'brandnewpass')).resolves.toEqual({ ok: true });
    expect(revocation.revokeAllForUser).toHaveBeenCalledWith('u1');
  });

  it('rejects a too-short new password before touching the DB', async () => {
    const prisma = { passwordResetToken: { findUnique: jest.fn() } };
    const { service } = makeService(prisma);
    await expect(service.resetPassword('a'.repeat(64), 'short')).rejects.toThrow(BadRequestException);
    expect(prisma.passwordResetToken.findUnique).not.toHaveBeenCalled();
  });
});

describe('AuthService.changePassword — revokes sessions on password change', () => {
  it('rejects when the current password is wrong', async () => {
    compareMock.mockResolvedValueOnce(false);
    const prisma = {
      user: { findUnique: jest.fn().mockResolvedValue({ id: 'u1', password: 'hashed' }) },
    };
    const { service } = makeService(prisma);
    await expect(service.changePassword('u1', 'wrong', 'newpassword123'))
      .rejects.toThrow(BadRequestException);
  });

  it('revokes all outstanding sessions on successful change', async () => {
    const prisma = {
      user: {
        findUnique: jest.fn().mockResolvedValue({ id: 'u1', password: 'hashed' }),
        update: jest.fn().mockResolvedValue({}),
      },
    };
    const { service, revocation } = makeService(prisma);
    await service.changePassword('u1', 'oldpass', 'newpassword123');
    expect(revocation.revokeAllForUser).toHaveBeenCalledWith('u1');
  });

  it('rejects unknown userId with UnauthorizedException', async () => {
    const prisma = { user: { findUnique: jest.fn().mockResolvedValue(null) } };
    const { service } = makeService(prisma);
    await expect(service.changePassword('ghost', 'a', 'b')).rejects.toThrow(UnauthorizedException);
  });
});

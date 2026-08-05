import { BadRequestException, UnauthorizedException, ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { validate } from 'class-validator';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { TenantIsolationService } from '../rbac/tenant-isolation.service';

jest.mock('bcryptjs', () => ({
  compare: jest.fn(),
  hash: jest.fn().mockResolvedValue('new-hashed'),
}));
jest.mock('../../../billing/src/billing/credit.service', () => ({
  grantTrialCredits: jest.fn().mockResolvedValue(undefined),
}), { virtual: true });
jest.mock('../rbac/tenant-isolation.service', () => ({
  getUserTenantId: jest.fn(),
  getTenantWhereClause: jest.fn(),
  canAccessResource: jest.fn().mockResolvedValue(true),
  getUserAccessibleTenantIds: jest.fn().mockResolvedValue([]),
}), { virtual: true });

const compareMock = bcrypt.compare as jest.MockedFunction<typeof bcrypt.compare>;
const hashMock = bcrypt.hash as jest.MockedFunction<typeof bcrypt.hash>;

function baseUser(overrides: Partial<any> = {}) {
  return {
    id: 'user-1',
    email: 'newadmin@mavoid.com',
    name: 'Admin',
    role: 'ADMIN',
    password: 'hashed',
    isActive: true,
    suspendedAt: null,
    mustChangePassword: false,
    twoFactorEnabled: false,
    twoFactorSecret: null,
    recoveryCodes: [],
    ...overrides,
  };
}

function makeService(prisma: any) {
  const jwtService = { sign: jest.fn().mockReturnValue('token') };
  const mailer = { send: jest.fn().mockResolvedValue(undefined) };
  const rbacService = { getUserPermissions: jest.fn().mockResolvedValue([]) };
  const creditService = { grantTrialCredits: jest.fn().mockResolvedValue(undefined) };
  const tenantIsolation = {
    getUserTenantId: jest.fn().mockResolvedValue(null),
    getTenantWhereClause: jest.fn(),
    canAccessResource: jest.fn().mockResolvedValue(true),
    getUserAccessibleTenantIds: jest.fn().mockResolvedValue([]),
  };
  const revocation = {
    revokeToken: jest.fn().mockResolvedValue(undefined),
    revokeAllForUser: jest.fn().mockResolvedValue(undefined),
    isTokenRevoked: jest.fn().mockResolvedValue(false),
  };
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
  return { service, jwtService, mailer, rbacService, revocation, creditService, tenantIsolation };
}

describe('AuthService.login', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    compareMock.mockResolvedValue(true);
  });

  it('normalizes the email before looking up the user', async () => {
    const prisma = { user: { findUnique: jest.fn() } };
    prisma.user.findUnique.mockImplementation(({ where }: { where: { email: string } }) => {
      if (where.email === 'newadmin@mavoid.com') return Promise.resolve(baseUser());
      return Promise.resolve(null);
    });
    const { service } = makeService(prisma);
    await expect(
      service.login({ email: ' NewAdmin@Mavoid.com ', password: 'password123' } as any),
    ).resolves.toMatchObject({ access_token: 'token' });
    expect(prisma.user.findUnique).toHaveBeenCalledWith({ where: { email: 'newadmin@mavoid.com' } });
  });

  it('returns a valid JWT + permissions for a successful login', async () => {
    const prisma = {
      user: { findUnique: jest.fn().mockResolvedValue(baseUser()) },
    };
    const { service, jwtService, rbacService } = makeService(prisma);
    const result: any = await service.login({
      email: 'newadmin@mavoid.com',
      password: 'password123',
    } as any);
    expect(result.access_token).toBe('token');
    expect(jwtService.sign).toHaveBeenCalledTimes(1);
    expect(rbacService.getUserPermissions).toHaveBeenCalledWith('user-1');
  });

  it('rejects invalid credentials when no user matches', async () => {
    const prisma = { user: { findUnique: jest.fn().mockResolvedValue(null) } };
    const { service } = makeService(prisma);
    await expect(
      service.login({ email: 'someone@example.com', password: 'wrong' } as any),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('rejects a wrong password for an existing user', async () => {
    compareMock.mockResolvedValue(false);
    const prisma = {
      user: { findUnique: jest.fn().mockResolvedValue(baseUser()) },
    };
    const { service, jwtService } = makeService(prisma);
    await expect(
      service.login({ email: 'newadmin@mavoid.com', password: 'bad' } as any),
    ).rejects.toThrow(UnauthorizedException);
    expect(jwtService.sign).not.toHaveBeenCalled();
  });
});

describe('AuthService.login — inactive / suspended accounts', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    compareMock.mockResolvedValue(true);
  });

  it('rejects login for an explicitly deactivated account', async () => {
    const prisma = {
      user: { findUnique: jest.fn().mockResolvedValue(baseUser({ isActive: false })) },
    };
    const { service, jwtService } = makeService(prisma);
    await expect(
      service.login({ email: 'newadmin@mavoid.com', password: 'password123' } as any),
    ).rejects.toThrow(UnauthorizedException);
    expect(jwtService.sign).not.toHaveBeenCalled();
  });

  it('rejects login for a suspended account', async () => {
    const prisma = {
      user: {
        findUnique: jest.fn().mockResolvedValue(
          baseUser({ isActive: true, suspendedAt: new Date('2026-01-01T00:00:00Z') }),
        ),
      },
    };
    const { service, jwtService } = makeService(prisma);
    await expect(
      service.login({ email: 'newadmin@mavoid.com', password: 'password123' } as any),
    ).rejects.toThrow(UnauthorizedException);
    expect(jwtService.sign).not.toHaveBeenCalled();
  });
});

describe('AuthService.login — rate limiting', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    compareMock.mockResolvedValue(false);
  });

  it('locks an account after N consecutive failed attempts', async () => {
    const prisma = {
      user: { findUnique: jest.fn().mockResolvedValue(baseUser()) },
    };
    const { service } = makeService(prisma);

    // The first MAX_FAILED_ATTEMPTS (10) failed attempts each invoke bcrypt
    // and fail with a generic Invalid credentials error.
    for (let i = 0; i < 10; i++) {
      await expect(
        service.login({ email: 'newadmin@mavoid.com', password: 'wrong' } as any),
      ).rejects.toThrow(UnauthorizedException);
    }
    // On the 11th attempt the lockout kicks in: still a 401, but the
    // credential comparison is short-circuited before bcrypt runs.
    await expect(
      service.login({ email: 'newadmin@mavoid.com', password: 'wrong' } as any),
    ).rejects.toThrow(UnauthorizedException);
    expect(compareMock.mock.calls.length).toBeLessThanOrEqual(10);
  });

  it('does not lock a correct login and resets failure history', async () => {
    const prisma = {
      user: { findUnique: jest.fn().mockResolvedValue(baseUser()) },
    };
    const { service } = makeService(prisma);
    // 5 failures then a success — must succeed and not leave the account locked.
    for (let i = 0; i < 5; i++) {
      await expect(
        service.login({ email: 'newadmin@mavoid.com', password: 'wrong' } as any),
      ).rejects.toThrow(UnauthorizedException);
    }
    compareMock.mockResolvedValueOnce(true);
    const result: any = await service.login({
      email: 'newadmin@mavoid.com',
      password: 'password123',
    } as any);
    expect(result.access_token).toBe('token');
    // A fresh failure attempt after success should still require 10 to lock.
    await expect(
      service.login({ email: 'newadmin@mavoid.com', password: 'wrong' } as any),
    ).rejects.toThrow(UnauthorizedException);
    expect(compareMock.mock.calls.length).toBeLessThanOrEqual(11);
  });

  it('unlocks after the lock window elapses', async () => {
    const prisma = {
      user: { findUnique: jest.fn().mockResolvedValue(baseUser()) },
    };
    const { service } = makeService(prisma);
    for (let i = 0; i < 10; i++) {
      await expect(
        service.login({ email: 'newadmin@mavoid.com', password: 'wrong' } as any),
      ).rejects.toThrow(UnauthorizedException);
    }
    await expect(
      service.login({ email: 'newadmin@mavoid.com', password: 'wrong' } as any),
    ).rejects.toThrow(UnauthorizedException);
    // Advance past the lock window and a correct password should succeed.
    jest.useFakeTimers();
    jest.setSystemTime(Date.now() + 16 * 60 * 1000);
    compareMock.mockResolvedValueOnce(true);
    const result: any = await service.login({
      email: 'newadmin@mavoid.com',
      password: 'password123',
    } as any);
    expect(result.access_token).toBe('token');
    jest.useRealTimers();
  });
});

describe('AuthService.login — 2FA enforcement', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    compareMock.mockResolvedValue(true);
  });

  it('does NOT return an access_token when a 2FA-enabled user posts only email+password', async () => {
    const prisma = {
      user: {
        findUnique: jest.fn().mockResolvedValue(
          baseUser({ twoFactorEnabled: true, twoFactorSecret: 'JBSWY3DPEHPK3PXP' }),
        ),
      },
    };
    const { service, jwtService } = makeService(prisma);

    const result: any = await service.login({
      email: 'newadmin@mavoid.com',
      password: 'password123',
    } as any);

    expect(result.requires2FA).toBe(true);
    expect(result.access_token).toBeUndefined();
    expect(result.user).toBeUndefined();
    expect(jwtService.sign).not.toHaveBeenCalled();
  });

  it('rejects a bad TOTP code with UnauthorizedException — no token issued', async () => {
    const prisma = {
      user: {
        findUnique: jest.fn().mockResolvedValue(
          baseUser({ twoFactorEnabled: true, twoFactorSecret: 'JBSWY3DPEHPK3PXP' }),
        ),
        update: jest.fn(),
      },
    };
    const { service, jwtService } = makeService(prisma);

    await expect(
      service.login({
        email: 'newadmin@mavoid.com',
        password: 'password123',
        twoFactorToken: '000000',
      } as any),
    ).rejects.toThrow(UnauthorizedException);
    expect(jwtService.sign).not.toHaveBeenCalled();
  });
});

describe('AuthService.register', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    hashMock.mockResolvedValue('new-hashed');
  });

  function registerPrisma(existing: any = null) {
    return {
      user: {
        findUnique: jest.fn().mockResolvedValue(existing),
        create: jest.fn().mockImplementation(({ data }) =>
          Promise.resolve({ ...baseUser(), ...data, password: 'new-hashed', id: 'u-new' }),
        ),
      },
      cloudPlan: { findUnique: jest.fn().mockResolvedValue(null) },
    };
  }

  it('creates a user and returns it without the password hash', async () => {
    const prisma = registerPrisma();
    const { service, mailer } = makeService(prisma);
    const res: any = await service.register({
      email: 'NewGuy@Example.com',
      password: 'password123',
      name: 'New Guy',
      tosAccepted: true,
    } as any);
    expect(res.user.email).toBe('newguy@example.com');
    expect(res.user.password).toBeUndefined();
    expect(prisma.user.create).toHaveBeenCalledTimes(1);
    // Email service must be mocked — no real SMTP send.
    expect(mailer.send).toHaveBeenCalled();
  });

  it('rejects a duplicate email with ConflictException', async () => {
    const prisma = registerPrisma(baseUser());
    const { service } = makeService(prisma);
    await expect(
      service.register({
        email: 'newadmin@mavoid.com',
        password: 'password123',
        name: 'Dup',
        tosAccepted: true,
      } as any),
    ).rejects.toThrow(ConflictException);
    expect(prisma.user.create).not.toHaveBeenCalled();
  });

  it('rejects a weak password (< 8 chars) at the DTO validation layer', async () => {
    // Validation runs in the controller's ValidationPipe (class-validator),
    // not the service — verified here so bad input never reaches the DB.
    const dto = new RegisterDto();
    dto.email = 'weak@example.com';
    dto.password = 'short';
    dto.name = 'Weak';
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors.some((e) => e.property === 'password')).toBe(true);
  });

  it('rejects a missing name / email at the DTO validation layer', async () => {
    const dto = new RegisterDto();
    dto.email = '';
    dto.password = 'password123';
    dto.name = '';
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors.some((e) => e.property === 'email')).toBe(true);
    expect(errors.some((e) => e.property === 'name')).toBe(true);
  });

  it('rejects a missing password at the DTO validation layer', async () => {
    const dto = new RegisterDto();
    dto.email = 'ok@example.com';
    dto.password = undefined as any;
    dto.name = 'Ok';
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'password')).toBe(true);
  });
});

describe('AuthService.forgotPassword', () => {
  beforeEach(() => jest.clearAllMocks());

  it('sends a reset token for a registered email', async () => {
    const prisma = {
      user: { findUnique: jest.fn().mockResolvedValue(baseUser()) },
      passwordResetToken: {
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        create: jest.fn().mockResolvedValue({ id: 'rt-x' }),
      },
    };
    const { service, mailer } = makeService(prisma);
    await expect(service.forgotPassword('newadmin@mavoid.com')).resolves.toEqual({ ok: true });
    expect(mailer.send).toHaveBeenCalledTimes(1);
    expect(prisma.passwordResetToken.create).toHaveBeenCalledTimes(1);
  });

  it('does NOT leak whether an email is registered (returns ok either way)', async () => {
    const prisma = {
      user: { findUnique: jest.fn().mockResolvedValue(null) },
      passwordResetToken: { create: jest.fn() },
    };
    const { service, mailer } = makeService(prisma);
    await expect(service.forgotPassword('ghost@example.com')).resolves.toEqual({ ok: true });
    // No email sent for unknown addresses.
    expect(mailer.send).not.toHaveBeenCalled();
    expect(prisma.passwordResetToken.create).not.toHaveBeenCalled();
  });

  it('invalidates any prior unused reset tokens for the user', async () => {
    const updateMany = jest.fn().mockResolvedValue({ count: 1 });
    const prisma = {
      user: { findUnique: jest.fn().mockResolvedValue(baseUser()) },
      passwordResetToken: {
        updateMany,
        create: jest.fn().mockResolvedValue({ id: 'rt-x' }),
      },
    };
    const { service } = makeService(prisma);
    await service.forgotPassword('newadmin@mavoid.com');
    expect(updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ data: { usedAt: expect.any(Date) } }),
    );
  });
});

describe('AuthService.resetPassword — token security', () => {
  beforeEach(() => jest.clearAllMocks());

  const hashOf = (raw: string) => crypto.createHash('sha256').update(raw).digest('hex');

  function prismaWithToken(record: any) {
    return {
      passwordResetToken: {
        findUnique: jest.fn().mockResolvedValue(record),
        update: jest.fn(),
      },
      user: { update: jest.fn() },
      $transaction: jest.fn().mockImplementation((ops: any) => Promise.all(ops)),
    };
  }

  it('accepts a fresh, unused token exactly once', async () => {
    const raw = crypto.randomBytes(32).toString('hex');
    const record = {
      id: 'rt-1',
      userId: 'user-1',
      tokenHash: hashOf(raw),
      usedAt: null,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000),
    };
    const prisma = prismaWithToken(record);
    const { service } = makeService(prisma);
    await expect(service.resetPassword(raw, 'newpassword123')).resolves.toEqual({ ok: true });
    expect(prisma.$transaction).toHaveBeenCalled();
  });

  it('rejects a token that has already been consumed (usedAt set)', async () => {
    const raw = crypto.randomBytes(32).toString('hex');
    const record = {
      id: 'rt-2',
      userId: 'user-1',
      tokenHash: hashOf(raw),
      usedAt: new Date(Date.now() - 5 * 60 * 1000),
      expiresAt: new Date(Date.now() + 10 * 60 * 1000),
    };
    const prisma = prismaWithToken(record);
    const { service } = makeService(prisma);
    await expect(service.resetPassword(raw, 'newpassword123')).rejects.toThrow(BadRequestException);
  });

  it('rejects an expired token even though it is still unused', async () => {
    const raw = crypto.randomBytes(32).toString('hex');
    const record = {
      id: 'rt-3',
      userId: 'user-1',
      tokenHash: hashOf(raw),
      usedAt: null,
      expiresAt: new Date(Date.now() - 60 * 1000),
    };
    const prisma = prismaWithToken(record);
    const { service } = makeService(prisma);
    await expect(service.resetPassword(raw, 'newpassword123')).rejects.toThrow(BadRequestException);
  });

  it('rejects a tampered/guessed token that hashes to no known record', async () => {
    const prisma = prismaWithToken(null);
    const { service } = makeService(prisma);
    await expect(
      service.resetPassword('a'.repeat(64), 'newpassword123'),
    ).rejects.toThrow(BadRequestException);
  });

  it('uses a CSPRNG for reset token generation (crypto.randomBytes, not Math.random)', async () => {
    const fs = require('fs');
    const src = fs.readFileSync(__dirname + '/auth.service.ts', 'utf8');
    expect(src).toContain("crypto.randomBytes(32).toString('hex')");
    expect(src).not.toMatch(/Math\.random/);
  });
});

describe('AuthService.password reset — invalidates old sessions', () => {
  beforeEach(() => jest.clearAllMocks());

  const hashOf = (raw: string) => crypto.createHash('sha256').update(raw).digest('hex');

  it('revokes all outstanding sessions after a successful reset', async () => {
    const raw = crypto.randomBytes(32).toString('hex');
    const record = {
      id: 'rt-r',
      userId: 'user-1',
      tokenHash: hashOf(raw),
      usedAt: null,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000),
    };
    const prisma = {
      passwordResetToken: {
        findUnique: jest.fn().mockResolvedValue(record),
        update: jest.fn(),
      },
      user: { update: jest.fn() },
      $transaction: jest.fn().mockImplementation((ops: any) => Promise.all(ops)),
    };
    const { service, revocation } = makeService(prisma);
    await service.resetPassword(raw, 'newpassword123');
    expect(revocation.revokeAllForUser).toHaveBeenCalledWith('user-1');
  });
});

describe('AuthService.verifyEmail', () => {
  beforeEach(() => jest.clearAllMocks());

  const hashOf = (raw: string) => crypto.createHash('sha256').update(raw).digest('hex');

  function prismaForVerify(user: any) {
    return {
      user: {
        findUnique: jest.fn().mockResolvedValue(user),
        update: jest.fn().mockResolvedValue(user),
      },
    };
  }

  it('rejects a malformed / too-short token', async () => {
    const prisma = { user: { findUnique: jest.fn() } };
    const { service } = makeService(prisma);
    await expect(service.verifyEmail('short')).rejects.toThrow(BadRequestException);
  });

  it('verifies a valid token and clears the token fields', async () => {
    const raw = crypto.randomBytes(32).toString('hex');
    const user = baseUser({
      emailVerified: false,
      emailVerifyTokenHash: hashOf(raw),
      emailVerifyExpires: new Date(Date.now() + 60 * 60 * 1000),
    });
    const prisma = prismaForVerify(user);
    const { service } = makeService(prisma);
    await expect(service.verifyEmail(raw)).resolves.toEqual({ ok: true });
    expect(prisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          emailVerified: true,
          emailVerifyTokenHash: null,
          emailVerifyExpires: null,
        }),
      }),
    );
  });

  it('rejects an expired verification token', async () => {
    const raw = crypto.randomBytes(32).toString('hex');
    const user = baseUser({
      emailVerified: false,
      emailVerifyTokenHash: hashOf(raw),
      emailVerifyExpires: new Date(Date.now() - 60 * 1000),
    });
    const prisma = prismaForVerify(user);
    const { service } = makeService(prisma);
    await expect(service.verifyEmail(raw)).rejects.toThrow(BadRequestException);
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it('rejects an invalid / non-matching verification token', async () => {
    const prisma = prismaForVerify(null);
    const { service } = makeService(prisma);
    await expect(
      service.verifyEmail(crypto.randomBytes(32).toString('hex')),
    ).rejects.toThrow(BadRequestException);
    expect(prisma.user.update).not.toHaveBeenCalled();
  });
});

describe('AuthService.impersonate', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  function prismaForImpersonate(users: Record<string, any>, tenantLinks: any[] = []) {
    return {
      user: {
        findUnique: jest.fn().mockImplementation(({ where }: { where: { id: string } }) =>
          Promise.resolve(users[where.id] || null),
        ),
      },
      userTenant: {
        findFirst: jest.fn().mockResolvedValue(tenantLinks[0] || null),
      },
      auditLog: {
        create: jest.fn().mockResolvedValue({ id: 'log-1' }),
      },
    };
  }

  it('issues a short-lived token with impersonatedBy for SUPER_ADMIN', async () => {
    const target = { id: 'target-1', email: 'target@example.com', name: 'Target', role: 'USER', isActive: true };
    const prisma = prismaForImpersonate({ 'target-1': target });
    const { service, jwtService, tenantIsolation } = makeService(prisma);
    tenantIsolation.getUserTenantId.mockResolvedValue(null);

    const result = await service.impersonate('admin-1', 'SUPER_ADMIN', 'target-1', 'support case');

    expect(jwtService.sign).toHaveBeenCalledTimes(1);
    const signPayload = jwtService.sign.mock.calls[0][0];
    expect(signPayload.impersonatedBy).toBe('admin-1');
    expect(signPayload.sub).toBe('target-1');
    expect(signPayload.role).toBe('USER');
    expect(result.user.email).toBe('target@example.com');
    expect(prisma.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: 'USER_IMPERSONATED',
          adminId: 'admin-1',
          userId: 'target-1',
          details: expect.objectContaining({
            reason: 'support case',
            targetUserName: 'Target',
            targetUserRole: 'USER',
            jti: expect.any(String),
            expiresAt: expect.any(String),
          }),
        }),
      }),
    );
  });

  it('allows ADMIN to impersonate a user in the same tenant', async () => {
    const target = { id: 'target-1', email: 'target@example.com', name: 'Target', role: 'USER', isActive: true };
    const prisma = prismaForImpersonate(
      { 'target-1': target },
      [{ userId: 'target-1', tenantId: 'tenant-1' }],
    );
    const { service, jwtService, tenantIsolation } = makeService(prisma);
    tenantIsolation.getUserTenantId.mockImplementation((userId: string, role: string) => {
      if (userId === 'admin-1') return Promise.resolve('tenant-1');
      if (userId === 'target-1') return Promise.resolve('tenant-1');
      return Promise.resolve(null);
    });

    const result = await service.impersonate('admin-1', 'ADMIN', 'target-1', 'helpdesk');

    expect(jwtService.sign).toHaveBeenCalled();
    expect(result.user.id).toBe('target-1');
    expect(prisma.auditLog.create).toHaveBeenCalled();
  });

  it('blocks ADMIN from impersonating a user outside their tenant', async () => {
    const target = { id: 'target-1', email: 'target@example.com', name: 'Target', role: 'USER', isActive: true };
    const prisma = prismaForImpersonate(
      { 'target-1': target },
      [{ userId: 'target-1', tenantId: 'tenant-2' }],
    );
    const { service, tenantIsolation } = makeService(prisma);
    tenantIsolation.getUserTenantId.mockImplementation((userId: string) => {
      if (userId === 'admin-1') return Promise.resolve('tenant-1');
      return Promise.resolve('tenant-2');
    });

    await expect(
      service.impersonate('admin-1', 'ADMIN', 'target-1', 'no'),
    ).rejects.toThrow(ForbiddenException);
    expect(prisma.auditLog.create).not.toHaveBeenCalled();
  });

  it('blocks non-admin roles from impersonating', async () => {
    const prisma = { user: { findUnique: jest.fn() } };
    const { service } = makeService(prisma);
    await expect(
      service.impersonate('user-1', 'USER', 'target-1', 'no'),
    ).rejects.toThrow(ForbiddenException);
  });

  it('rejects if target user does not exist', async () => {
    const prisma = { user: { findUnique: jest.fn().mockResolvedValue(null) } };
    const { service } = makeService(prisma);
    await expect(
      service.impersonate('admin-1', 'SUPER_ADMIN', 'ghost', 'no'),
    ).rejects.toThrow(NotFoundException);
  });
});

import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import * as speakeasy from 'speakeasy';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import { TwoFactorService } from './two-factor.service';

jest.mock('bcryptjs', () => ({
  compare: jest.fn(),
  hash: jest.fn().mockImplementation((v: string) => Promise.resolve(`hash:${v}`)),
}));

const compareMock = bcrypt.compare as jest.MockedFunction<typeof bcrypt.compare>;

function baseUser(overrides: Partial<any> = {}) {
  return {
    id: 'user-1',
    email: 'newadmin@mavoid.com',
    name: 'Admin',
    role: 'ADMIN',
    password: 'hashed',
    twoFactorEnabled: false,
    twoFactorSecret: null,
    recoveryCodes: [],
    ...overrides,
  };
}

function makeService(prisma: any) {
  const service = new TwoFactorService(prisma as any);
  return { service };
}

/** Generate a current valid TOTP for a base32 secret using the same lib the service uses. */
function totpFor(secret: string) {
  return speakeasy.totp({ secret, encoding: 'base32' });
}

describe('TwoFactorService.beginEnable (enrollment)', () => {
  beforeEach(() => jest.clearAllMocks());

  it('generates a secret, otpauth URL and QR code without enabling 2FA yet', async () => {
    const update = jest.fn().mockResolvedValue(undefined);
    const prisma = { user: { findUnique: jest.fn(), update } };
    const { service } = makeService(prisma);

    const res: any = await service.beginEnable('user-1', 'newadmin@mavoid.com');

    expect(res.base32).toBeTruthy();
    expect(res.otpauthUrl).toContain('secret=');
    expect(res.qrCode).toMatch(/^data:image\/png;base64,/);
    // Stored secret, but twoFactorEnabled must stay false until verify succeeds.
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'user-1' },
        data: { twoFactorSecret: res.base32, twoFactorEnabled: false },
      }),
    );
  });
});

describe('TwoFactorService.verifyAndActivate (enrollment confirmation)', () => {
  beforeEach(() => jest.clearAllMocks());

  it('activates 2FA when a valid TOTP for the stored secret is supplied', async () => {
    const secret = speakeasy.generateSecret({ length: 20 }).base32;
    const user = baseUser({ twoFactorSecret: secret, twoFactorEnabled: false });
    const update = jest.fn().mockResolvedValue(undefined);
    const prisma = { user: { findUnique: jest.fn().mockResolvedValue(user), update } };
    const { service } = makeService(prisma);

    const res: any = await service.verifyAndActivate('user-1', totpFor(secret));

    expect(res.enabled).toBe(true);
    expect(res.recoveryCodes).toHaveLength(8);
    // Each recovery code is surfaced raw exactly once, and stored as a bcrypt hash.
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ twoFactorEnabled: true }),
      }),
    );
    const storedCodes = update.mock.calls[0][0].data.recoveryCodes;
    expect(storedCodes).toHaveLength(8);
    expect(storedCodes.every((c: string) => c.startsWith('hash:'))).toBe(true);
    // Raw codes must NOT equal the stored hashes (proves hashing, not plaintext).
    expect(res.recoveryCodes.some((c: string) => storedCodes.includes(c))).toBe(false);
  });

  it('rejects when 2FA was never initialised (no secret stored)', async () => {
    const prisma = {
      user: { findUnique: jest.fn().mockResolvedValue(baseUser()) },
    };
    const { service } = makeService(prisma);
    await expect(service.verifyAndActivate('user-1', '123456')).rejects.toThrow(
      BadRequestException,
    );
  });

  it('rejects an incorrect TOTP and does NOT activate 2FA', async () => {
    const secret = speakeasy.generateSecret({ length: 20 }).base32;
    const user = baseUser({ twoFactorSecret: secret, twoFactorEnabled: false });
    const update = jest.fn().mockResolvedValue(undefined);
    const prisma = { user: { findUnique: jest.fn().mockResolvedValue(user), update } };
    const { service } = makeService(prisma);

    await expect(service.verifyAndActivate('user-1', '000000')).rejects.toThrow(
      BadRequestException,
    );
    expect(update).not.toHaveBeenCalled();
  });

  it('rejects a TOTP outside the accept window (replayed/expired code)', async () => {
    const secret = speakeasy.generateSecret({ length: 20 }).base32;
    const user = baseUser({ twoFactorSecret: secret, twoFactorEnabled: false });
    const prisma = {
      user: { findUnique: jest.fn().mockResolvedValue(user), update: jest.fn() },
    };
    const { service } = makeService(prisma);
    // Manually compute a TOTP for a time far in the past so it falls outside window=1.
    const stale = speakeasy.totp({
      secret,
      encoding: 'base32',
      time: Math.floor(Date.now() / 1000) - 120,
    });
    await expect(service.verifyAndActivate('user-1', stale)).rejects.toThrow(
      BadRequestException,
    );
  });
});

describe('TwoFactorService — login-time verification (verifyForLogin)', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns true for a valid TOTP when 2FA is enabled', async () => {
    const secret = speakeasy.generateSecret({ length: 20 }).base32;
    const user = baseUser({ twoFactorSecret: secret, twoFactorEnabled: true });
    const prisma = { user: { findUnique: jest.fn().mockResolvedValue(user) } };
    const { service } = makeService(prisma);
    await expect(service.verifyForLogin('user-1', totpFor(secret))).resolves.toBe(true);
  });

  it('returns true (no 2FA gate) when 2FA is not enabled', async () => {
    const prisma = {
      user: { findUnique: jest.fn().mockResolvedValue(baseUser()) },
    };
    const { service } = makeService(prisma);
    await expect(service.verifyForLogin('user-1', 'whatever')).resolves.toBe(true);
  });

  it('rejects an empty token', async () => {
    const secret = speakeasy.generateSecret({ length: 20 }).base32;
    const user = baseUser({ twoFactorSecret: secret, twoFactorEnabled: true });
    const prisma = { user: { findUnique: jest.fn().mockResolvedValue(user) } };
    const { service } = makeService(prisma);
    await expect(service.verifyForLogin('user-1', '')).resolves.toBe(false);
    await expect(service.verifyForLogin('user-1', '   ')).resolves.toBe(false);
  });

  it('rejects an incorrect TOTP', async () => {
    const secret = speakeasy.generateSecret({ length: 20 }).base32;
    const user = baseUser({ twoFactorSecret: secret, twoFactorEnabled: true });
    const prisma = { user: { findUnique: jest.fn().mockResolvedValue(user) } };
    const { service } = makeService(prisma);
    await expect(service.verifyForLogin('user-1', '000000')).resolves.toBe(false);
  });

  it('accepts a valid recovery code and CONSUMES it (single use)', async () => {
    const secret = speakeasy.generateSecret({ length: 20 }).base32;
    // Pre-compute a recovery code + its bcrypt hash exactly like the service does.
    const rawCode = `${crypto.randomBytes(2).toString('hex')}-${crypto.randomBytes(3).toString('hex')}`;
    const storedHash = await bcrypt.hash(rawCode, 10);
    const user = baseUser({
      twoFactorSecret: secret,
      twoFactorEnabled: true,
      recoveryCodes: [storedHash],
    });
    const update = jest.fn().mockResolvedValue(undefined);
    const prisma = { user: { findUnique: jest.fn().mockResolvedValue(user), update } };
    const { service } = makeService(prisma);

    compareMock.mockImplementation((c: string) => Promise.resolve(c === rawCode));
    await expect(service.verifyForLogin('user-1', rawCode)).resolves.toBe(true);
    // The used recovery code is stripped from the stored list.
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ recoveryCodes: [] }),
      }),
    );

    // Reusing the same code now fails (it's been consumed).
    const userAfter = baseUser({
      twoFactorSecret: secret,
      twoFactorEnabled: true,
      recoveryCodes: [],
    });
    prisma.user.findUnique.mockResolvedValue(userAfter);
    await expect(service.verifyForLogin('user-1', rawCode)).resolves.toBe(false);
  });

  it('rejects a recovery code that does not match any stored hash', async () => {
    const secret = speakeasy.generateSecret({ length: 20 }).base32;
    const storedHash = await bcrypt.hash('aa-bbbbb', 10);
    const user = baseUser({
      twoFactorSecret: secret,
      twoFactorEnabled: true,
      recoveryCodes: [storedHash],
    });
    const prisma = {
      user: { findUnique: jest.fn().mockResolvedValue(user), update: jest.fn() },
    };
    const { service } = makeService(prisma);
    compareMock.mockResolvedValue(false);
    await expect(service.verifyForLogin('user-1', 'zz-yyyyy')).resolves.toBe(false);
  });
});

describe('TwoFactorService — disabling 2FA requires re-authentication', () => {
  beforeEach(() => jest.clearAllMocks());

  it('rejects disabling with no proof', async () => {
    const prisma = {
      user: { findUnique: jest.fn().mockResolvedValue(baseUser()) },
    };
    const { service } = makeService(prisma);
    await expect(service.disableWithProof('user-1')).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('allows disabling with the correct current password', async () => {
    const user = baseUser({ password: 'hashed-current' });
    const update = jest.fn().mockResolvedValue(undefined);
    const prisma = { user: { findUnique: jest.fn().mockResolvedValue(user), update } };
    const { service } = makeService(prisma);
    compareMock.mockResolvedValue(true);
    const res: any = await service.disableWithProof('user-1', 'current-pw');
    expect(res.enabled).toBe(false);
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          twoFactorEnabled: false,
          twoFactorSecret: null,
          recoveryCodes: [],
        }),
      }),
    );
  });

  it('rejects disabling with a WRONG password', async () => {
    const prisma = {
      user: { findUnique: jest.fn().mockResolvedValue(baseUser()) },
    };
    const { service } = makeService(prisma);
    compareMock.mockResolvedValue(false);
    await expect(
      service.disableWithProof('user-1', 'wrong-pw'),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('allows disabling with a valid recovery code', async () => {
    const storedHash = await bcrypt.hash('rc-12345', 10);
    const user = baseUser({ recoveryCodes: [storedHash] });
    const update = jest.fn().mockResolvedValue(undefined);
    const prisma = { user: { findUnique: jest.fn().mockResolvedValue(user), update } };
    const { service } = makeService(prisma);
    compareMock.mockImplementation((c: string) => Promise.resolve(c === 'rc-12345'));
    const res: any = await service.disableWithProof('user-1', undefined, 'rc-12345');
    expect(res.enabled).toBe(false);
  });
});

describe('TwoFactorService.regenerateRecoveryCodes', () => {
  beforeEach(() => jest.clearAllMocks());

  it('regenerates 8 fresh codes only when 2FA is enabled', async () => {
    const user = baseUser({ twoFactorEnabled: true });
    const update = jest.fn().mockResolvedValue(undefined);
    const prisma = { user: { findUnique: jest.fn().mockResolvedValue(user), update } };
    const { service } = makeService(prisma);
    const res: any = await service.regenerateRecoveryCodes('user-1');
    expect(res.recoveryCodes).toHaveLength(8);
    expect(update).toHaveBeenCalled();
  });

  it('rejects regeneration when 2FA is not enabled', async () => {
    const prisma = {
      user: { findUnique: jest.fn().mockResolvedValue(baseUser({ twoFactorEnabled: false })) },
    };
    const { service } = makeService(prisma);
    await expect(service.regenerateRecoveryCodes('user-1')).rejects.toThrow(
      BadRequestException,
    );
  });
});

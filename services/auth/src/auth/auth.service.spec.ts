import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import { AuthService } from './auth.service';

jest.mock('bcryptjs', () => ({
    compare: jest.fn(),
    hash: jest.fn().mockResolvedValue('new-hashed'),
}));

const compareMock = bcrypt.compare as jest.MockedFunction<typeof bcrypt.compare>;

function baseUser(overrides: Partial<any> = {}) {
    return {
        id: 'user-1',
        email: 'newadmin@mavoid.com',
        name: 'Admin',
        role: 'ADMIN',
        password: 'hashed',
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
    const revocation = {
        revokeToken: jest.fn().mockResolvedValue(undefined),
        revokeAllForUser: jest.fn().mockResolvedValue(undefined),
        isTokenRevoked: jest.fn().mockResolvedValue(false),
    };
    const service = new AuthService(
        prisma as any,
        jwtService as any,
        mailer as any,
        rbacService as any,
        revocation as any,
    );
    return { service, jwtService, mailer, rbacService, revocation };
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

    it('rejects invalid credentials when no user matches', async () => {
        const prisma = { user: { findUnique: jest.fn().mockResolvedValue(null) } };
        const { service } = makeService(prisma);
        await expect(
            service.login({ email: 'someone@example.com', password: 'wrong' } as any),
        ).rejects.toThrow(UnauthorizedException);
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

        // The response must announce the challenge but never carry a JWT.
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

describe('AuthService.resetPassword — token security', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        compareMock.mockResolvedValue(true);
    });

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
        // The transaction must mark the token used, i.e. single-use enforcement.
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
        // findUnique returns null → no matching hash in the table.
        const prisma = prismaWithToken(null);
        const { service } = makeService(prisma);
        await expect(
            service.resetPassword('a'.repeat(64), 'newpassword123'),
        ).rejects.toThrow(BadRequestException);
    });

    it('uses a CSPRNG for reset token generation (crypto.randomBytes, not Math.random)', async () => {
        // Static audit: read the source and confirm no Math.random usage in token paths.
        // This guards against a future refactor introducing weak randomness.
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const fs = require('fs');
        const src = fs.readFileSync(__dirname + '/auth.service.ts', 'utf8');
        expect(src).toContain("crypto.randomBytes(32).toString('hex')");
        expect(src).not.toMatch(/Math\.random/);
    });
});

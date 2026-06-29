import { UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { AuthService } from './auth.service';

jest.mock('bcryptjs', () => ({
    compare: jest.fn(),
}));

describe('AuthService.login', () => {
    const compareMock = bcrypt.compare as jest.MockedFunction<typeof bcrypt.compare>;

    beforeEach(() => {
        jest.clearAllMocks();
        compareMock.mockResolvedValue(true);
    });

    it('normalizes the email before looking up the user', async () => {
        const prisma = {
            user: {
                findUnique: jest.fn(),
            },
        };
        const jwtService = { sign: jest.fn().mockReturnValue('token') };
        const mailer = { send: jest.fn() };
        const rbacService = { getUserPermissions: jest.fn().mockResolvedValue([]) };

        prisma.user.findUnique.mockImplementation(({ where }: { where: { email: string } }) => {
            if (where.email === 'newadmin@mavoid.com') {
                return Promise.resolve({
                    id: 'user-1',
                    email: 'newadmin@mavoid.com',
                    name: 'Admin',
                    role: 'ADMIN',
                    password: 'hashed',
                    mustChangePassword: false,
                    twoFactorEnabled: false,
                    twoFactorSecret: null,
                    recoveryCodes: [],
                });
            }
            return Promise.resolve(null);
        });

        const service = new AuthService(
            prisma as any,
            jwtService as any,
            mailer as any,
            rbacService as any,
        );

        await expect(
            service.login({ email: ' NewAdmin@Mavoid.com ', password: 'password123' } as any),
        ).resolves.toMatchObject({ access_token: 'token' });

        expect(prisma.user.findUnique).toHaveBeenCalledWith({
            where: { email: 'newadmin@mavoid.com' },
        });
    });

    it('rejects invalid credentials when no user matches', async () => {
        const prisma = { user: { findUnique: jest.fn().mockResolvedValue(null) } };
        const jwtService = { sign: jest.fn() };
        const mailer = { send: jest.fn() };
        const rbacService = { getUserPermissions: jest.fn().mockResolvedValue([]) };

        const service = new AuthService(
            prisma as any,
            jwtService as any,
            mailer as any,
            rbacService as any,
        );

        await expect(
            service.login({ email: 'someone@example.com', password: 'wrong' } as any),
        ).rejects.toThrow(UnauthorizedException);
    });
});

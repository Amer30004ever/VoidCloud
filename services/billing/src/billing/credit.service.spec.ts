import { Test, TestingModule } from '@nestjs/testing';
import { CreditService } from './credit.service';
import { PrismaService } from '../prisma/prisma.service';
import { CloudSubscriptionStatus } from '@prisma/client';
import { BadRequestException, NotFoundException } from '@nestjs/common';

jest.mock('@prisma/client', () => {
  const actual = jest.requireActual('@prisma/client');
  const BillingMode = { SUBSCRIPTION: 'SUBSCRIPTION', PAY_AS_YOU_GO: 'PAY_AS_YOU_GO' };
  const CreditTransactionType = { TOPUP: 'TOPUP', CONSUMPTION: 'CONSUMPTION', ADJUSTMENT: 'ADJUSTMENT', REFUND: 'REFUND', GRANT: 'GRANT' };
  const Module = jest.requireActual('module');
  const m = new Module('@prisma/client');
  m.exports = Object.assign({}, actual, { BillingMode, CreditTransactionType });
  return m.exports;
});

describe('CreditService', () => {
  const BillingMode = { SUBSCRIPTION: 'SUBSCRIPTION', PAY_AS_YOU_GO: 'PAY_AS_YOU_GO' } as const;
  const CreditTransactionType = { TOPUP: 'TOPUP', CONSUMPTION: 'CONSUMPTION', ADJUSTMENT: 'ADJUSTMENT', GRANT: 'GRANT' } as const;
    let service: CreditService;
    let prisma: PrismaService;

    const mockUser = {
        id: 'user-123',
        creditBalance: 100,
        subscriptionStatus: CloudSubscriptionStatus.ACTIVE,
    };

    const mockVps = {
        id: 'vps-123',
        name: 'test-vps',
        userId: 'user-123',
        billingMode: BillingMode.PAY_AS_YOU_GO,
        cpu: 2,
        memory: 2048,
        storage: 20480,
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                CreditService,
                {
                    provide: PrismaService,
                    useValue: {
                        user: {
                            findUnique: jest.fn(),
                            update: jest.fn(),
                        },
                        creditTransaction: {
                            create: jest.fn(),
                            findMany: jest.fn(),
                        },
                        auditLog: {
                            create: jest.fn(),
                        },
                        $transaction: jest.fn((callback) => callback(prisma)),
                    },
                },
            ],
        }).compile();

        service = module.get<CreditService>(CreditService);
        prisma = module.get<PrismaService>(PrismaService);
    });

    describe('getBalance', () => {
        it('should return user credit balance', async () => {
            jest.spyOn(prisma.user, 'findUnique').mockResolvedValue(mockUser as never);
            const balance = await service.getBalance('user-123');
            expect(balance).toBe(100);
        });

        it('should throw NotFoundException if user not found', async () => {
            jest.spyOn(prisma.user, 'findUnique').mockResolvedValue(null);
            await expect(service.getBalance('nonexistent')).rejects.toThrow(NotFoundException);
        });
    });

    describe('topUp', () => {
        it('should add credits and create transaction', async () => {
            const mockTransaction = {
                id: 'txn-123',
                userId: 'user-123',
                type: CreditTransactionType.TOPUP,
                amount: 50,
                balanceAfter: 150,
            };

            jest.spyOn(prisma.user, 'findUnique').mockResolvedValue(mockUser as never);
            jest.spyOn(prisma.user, 'update').mockResolvedValue({ ...mockUser, creditBalance: 150 } as never);
            jest.spyOn(prisma.creditTransaction, 'create').mockResolvedValue(mockTransaction as never);
            jest.spyOn(prisma, '$transaction').mockImplementation(async (callback: any) => {
                return callback(prisma);
            });

            const result = await service.topUp('user-123', 50, { source: 'purchase' });

            expect(result.newBalance).toBe(150);
            expect(result.transactionId).toBe('txn-123');
        });

        it('should reject negative top-up amounts', async () => {
            await expect(service.topUp('user-123', -10)).rejects.toThrow(BadRequestException);
        });

        it('should reject zero top-up amount', async () => {
            await expect(service.topUp('user-123', 0)).rejects.toThrow(BadRequestException);
        });
    });

    describe('consume', () => {
        it('should deduct credits for VPS consumption', async () => {
            jest.spyOn(prisma.user, 'findUnique').mockResolvedValue(mockUser as never);
            jest.spyOn(prisma.user, 'update').mockResolvedValue({ ...mockUser, creditBalance: 80 } as never);
            jest.spyOn(prisma.creditTransaction, 'create').mockResolvedValue({
                id: 'txn-consume-123',
                userId: 'user-123',
                type: CreditTransactionType.CONSUMPTION,
                amount: -20,
                balanceAfter: 80,
                relatedVpsId: 'vps-123',
            } as never);
            jest.spyOn(prisma, '$transaction').mockImplementation(async (callback: any) => {
                return callback(prisma);
            });

            const result = await service.consume('user-123', 'vps-123', 20, { period: '5min' });

            expect(result.newBalance).toBe(80);
        });

        it('should reject consumption when balance insufficient', async () => {
            const lowBalanceUser = { ...mockUser, creditBalance: 5 };
            jest.spyOn(prisma.user, 'findUnique').mockResolvedValue(lowBalanceUser as never);
            jest.spyOn(prisma, '$transaction').mockImplementation(async (callback: any) => {
                return callback(prisma);
            });

            await expect(service.consume('user-123', 'vps-123', 20)).rejects.toThrow(BadRequestException);
        });
    });

    describe('adjust', () => {
        it('should allow SUPER_ADMIN manual adjustment with reason', async () => {
            jest.spyOn(prisma.user, 'findUnique').mockResolvedValue(mockUser as never);
            jest.spyOn(prisma.user, 'update').mockResolvedValue({ ...mockUser, creditBalance: 150 } as never);
            jest.spyOn(prisma.creditTransaction, 'create').mockResolvedValue({
                id: 'txn-adj-123',
                userId: 'user-123',
                type: CreditTransactionType.ADJUSTMENT,
                amount: 50,
                balanceAfter: 150,
                reason: 'Support goodwill credit',
            } as never);
            jest.spyOn(prisma, '$transaction').mockImplementation(async (callback: any) => {
                return callback(prisma);
            });

            const result = await service.adjust('user-123', 50, 'Support goodwill credit', 'admin-123');

            expect(result.newBalance).toBe(150);
        });

        it('should require reason with minimum length', async () => {
            await expect(service.adjust('user-123', 50, 'Bad', 'admin-123')).rejects.toThrow(BadRequestException);
        });

        it('should prevent negative balance from adjustment', async () => {
            jest.spyOn(prisma.user, 'findUnique').mockResolvedValue(mockUser as never);
            jest.spyOn(prisma, '$transaction').mockImplementation(async (callback: any) => {
                return callback(prisma);
            });

            await expect(
                service.adjust('user-123', -200, 'Testing negative', 'admin-123')
            ).rejects.toThrow(BadRequestException);
        });
    });

    describe('canProvisionVps', () => {
        it('should allow SUBSCRIPTION VPS if subscription ACTIVE', async () => {
            jest.spyOn(prisma.user, 'findUnique').mockResolvedValue(mockUser as never);

            const result = await service.canProvisionVps('user-123', BillingMode.SUBSCRIPTION);

            expect(result.allowed).toBe(true);
        });

        it('should allow SUBSCRIPTION VPS if TRIALING', async () => {
            const trialingUser = { ...mockUser, subscriptionStatus: CloudSubscriptionStatus.TRIALING };
            jest.spyOn(prisma.user, 'findUnique').mockResolvedValue(trialingUser as never);

            const result = await service.canProvisionVps('user-123', BillingMode.SUBSCRIPTION);

            expect(result.allowed).toBe(true);
        });

        it('should block SUBSCRIPTION VPS if subscription CANCELED', async () => {
            const canceledUser = { ...mockUser, subscriptionStatus: CloudSubscriptionStatus.CANCELED };
            jest.spyOn(prisma.user, 'findUnique').mockResolvedValue(canceledUser as never);

            const result = await service.canProvisionVps('user-123', BillingMode.SUBSCRIPTION);

            expect(result.allowed).toBe(false);
            expect(result.reason).toContain('CANCELED');
        });

        it('should allow PAY_AS_YOU_GO if balance sufficient', async () => {
            jest.spyOn(prisma.user, 'findUnique').mockResolvedValue(mockUser as never);

            const result = await service.canProvisionVps('user-123', BillingMode.PAY_AS_YOU_GO);

            expect(result.allowed).toBe(true);
        });

        it('should block PAY_AS_YOU_GO if balance too low', async () => {
            const lowBalanceUser = { ...mockUser, creditBalance: 5 };
            jest.spyOn(prisma.user, 'findUnique').mockResolvedValue(lowBalanceUser as never);

            const result = await service.canProvisionVps('user-123', BillingMode.PAY_AS_YOU_GO);

            expect(result.allowed).toBe(false);
            expect(result.reason).toContain('Insufficient credit balance');
        });
    });

    describe('grantTrialCredits', () => {
        it('should grant free trial credits to new user', async () => {
            jest.spyOn(service, 'topUp').mockResolvedValue({
                newBalance: 25,
                transactionId: 'trial-txn-123',
            });

            await service.grantTrialCredits('new-user-123', 25);

            expect(service.topUp).toHaveBeenCalledWith('new-user-123', 25, {
                source: 'free_trial',
                note: 'Welcome bonus',
            }, { actorId: 'new-user-123' });
        });
    });

    describe('audit logging', () => {
        const expectAudit = (action: string, type: string) => {
            expect(prisma.auditLog.create).toHaveBeenCalledWith({
                data: expect.objectContaining({
                    action,
                    resource: `credit:${type}`,
                    details: expect.objectContaining({
                        amount: expect.any(Number),
                        balanceAfter: expect.any(Number),
                        transactionId: expect.any(String),
                    }),
                }),
            });
        };

        beforeEach(() => {
            jest.spyOn(prisma.user, 'findUnique').mockResolvedValue(mockUser as never);
            jest.spyOn(prisma.user, 'update').mockImplementation(async (_args: unknown) => ({
                ...mockUser,
                creditBalance: 150,
            }) as never);
            jest.spyOn(prisma, '$transaction').mockImplementation(async (callback: any) => callback(prisma));
        });

        it('creates audit log on topUp', async () => {
            jest.spyOn(prisma.creditTransaction, 'create').mockResolvedValue({
                id: 'txn-topup',
                type: CreditTransactionType.TOPUP,
                amount: 50,
                balanceAfter: 150,
            } as never);

            await service.topUp('user-123', 50, { note: 'purchase' }, { actorId: 'admin-1', impersonatedBy: 'root' });

            expectAudit('CREDIT_TOPUP', 'topup');
            expect(prisma.auditLog.create).toHaveBeenCalledWith({
                data: expect.objectContaining({
                    details: expect.objectContaining({ impersonatedBy: 'root', actorId: 'admin-1' }),
                }),
            });
        });

        it('creates audit log on consume', async () => {
            jest.spyOn(prisma.user, 'update').mockResolvedValue({ ...mockUser, creditBalance: 80 } as never);
            jest.spyOn(prisma.creditTransaction, 'create').mockResolvedValue({
                id: 'txn-consume',
                type: CreditTransactionType.CONSUMPTION,
                amount: -20,
                balanceAfter: 80,
            } as never);

            await service.consume('user-123', 'vps-123', 20);

            expectAudit('CREDIT_CONSUMPTION', 'consumption');
            expect(prisma.auditLog.create).toHaveBeenCalledWith({
                data: expect.objectContaining({
                    details: expect.objectContaining({ relatedVpsId: 'vps-123' }),
                }),
            });
        });

        it('creates audit log on refund', async () => {
            jest.spyOn(prisma.creditTransaction, 'create').mockResolvedValue({
                id: 'txn-refund',
                type: CreditTransactionType.REFUND,
                amount: 10,
                balanceAfter: 110,
            } as never);

            await service.refund('user-123', 10, 'vps-123', 'Early cancellation');

            expectAudit('CREDIT_REFUND', 'refund');
        });

        it('creates audit log on adjust', async () => {
            jest.spyOn(prisma.creditTransaction, 'create').mockResolvedValue({
                id: 'txn-adj',
                type: CreditTransactionType.ADJUSTMENT,
                amount: 50,
                balanceAfter: 150,
            } as never);

            await service.adjust('user-123', 50, 'Support goodwill credit', 'admin-123');

            expectAudit('CREDIT_ADJUSTMENT', 'adjustment');
            expect(prisma.auditLog.create).toHaveBeenCalledWith({
                data: expect.objectContaining({
                    adminId: 'admin-123',
                    details: expect.objectContaining({ reason: 'Support goodwill credit' }),
                }),
            });
        });

        it('creates audit log on grantTrialCredits via topUp', async () => {
            jest.spyOn(prisma.creditTransaction, 'create').mockResolvedValue({
                id: 'txn-trial',
                type: CreditTransactionType.TOPUP,
                amount: 25,
                balanceAfter: 125,
            } as never);

            await service.grantTrialCredits('new-user-123', 25);

            expect(prisma.auditLog.create).toHaveBeenCalled();
        });
    });
});

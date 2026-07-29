import { Injectable, BadRequestException, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { BillingMode, CreditTransactionType, CloudDeploymentStatus, CloudSubscriptionStatus, Prisma } from '@prisma/client';

export interface CreditAuditContext {
    actorId: string;
    impersonatedBy?: string;
}

@Injectable()
export class CreditService {
    private readonly logger = new Logger(CreditService.name);

    constructor(private readonly prisma: PrismaService) { }

    private auditAction(type: CreditTransactionType): string {
        const map: Record<CreditTransactionType, string> = {
            [CreditTransactionType.ADJUSTMENT]: 'CREDIT_ADJUSTMENT',
            [CreditTransactionType.TOPUP]: 'CREDIT_TOPUP',
            [CreditTransactionType.CONSUMPTION]: 'CREDIT_CONSUMPTION',
            [CreditTransactionType.REFUND]: 'CREDIT_REFUND',
        };
        return map[type] ?? `CREDIT_${type}`;
    }

    private async writeAuditLog(
        tx: Prisma.TransactionClient,
        params: {
            type: CreditTransactionType;
            targetUserId: string;
            actorId: string;
            amount: number;
            balanceAfter: number;
            reason?: string;
            relatedVpsId?: string;
            transactionId: string;
            impersonatedBy?: string;
            adminId?: string;
        },
    ): Promise<void> {
        try {
            await tx.auditLog.create({
                data: {
                    action: this.auditAction(params.type),
                    userId: params.targetUserId,
                    adminId: params.adminId,
                    resource: `credit:${params.type.toLowerCase()}`,
                    details: {
                        actorId: params.actorId,
                        amount: params.amount,
                        balanceAfter: params.balanceAfter,
                        reason: params.reason,
                        relatedVpsId: params.relatedVpsId,
                        transactionId: params.transactionId,
                        transactionType: params.type,
                        ...(params.impersonatedBy ? { impersonatedBy: params.impersonatedBy } : {}),
                    } as never,
                },
            });
        } catch (error) {
            this.logger.warn(
                `Credit audit log failed (${params.type}): ${error instanceof Error ? error.message : error}`,
            );
        }
    }

    /**
     * Get user's current credit balance
     */
    async getBalance(userId: string): Promise<number> {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            select: { creditBalance: true },
        });
        if (!user) throw new NotFoundException('User not found');
        return user.creditBalance;
    }

    /**
     * Add credits (TOPUP) - typically called after successful payment
     */
    async topUp(
        userId: string,
        amount: number,
        metadata?: Record<string, unknown>,
        audit?: CreditAuditContext,
    ): Promise<{ newBalance: number; transactionId: string }> {
        if (amount <= 0) {
            throw new BadRequestException('Top-up amount must be positive');
        }

        const actorId = audit?.actorId ?? userId;

        return await this.prisma.$transaction(async (tx) => {
            const user = await tx.user.findUnique({
                where: { id: userId },
                select: { creditBalance: true },
            });
            if (!user) throw new NotFoundException('User not found');

            const newBalance = user.creditBalance + amount;

            await tx.user.update({
                where: { id: userId },
                data: { creditBalance: newBalance },
            });

            const transaction = await tx.creditTransaction.create({
                data: {
                    userId,
                    type: CreditTransactionType.TOPUP,
                    amount,
                    balanceAfter: newBalance,
                    metadata: metadata as never,
                },
            });

            await this.writeAuditLog(tx, {
                type: CreditTransactionType.TOPUP,
                targetUserId: userId,
                actorId,
                amount,
                balanceAfter: newBalance,
                reason: typeof metadata?.note === 'string' ? metadata.note : undefined,
                transactionId: transaction.id,
                impersonatedBy: audit?.impersonatedBy,
            });

            return { newBalance, transactionId: transaction.id };
        });
    }

    /**
     * Consume credits for VPS runtime
     */
    async consume(
        userId: string,
        vpsId: string,
        amount: number,
        metadata?: Record<string, unknown>,
        audit?: CreditAuditContext,
    ): Promise<{ newBalance: number; transactionId: string }> {
        if (amount <= 0) {
            throw new BadRequestException('Consumption amount must be positive');
        }

        const actorId = audit?.actorId ?? userId;

        return await this.prisma.$transaction(async (tx) => {
            const user = await tx.user.findUnique({
                where: { id: userId },
                select: { creditBalance: true },
            });
            if (!user) throw new NotFoundException('User not found');

            const newBalance = user.creditBalance - amount;

            if (newBalance < 0) {
                throw new BadRequestException('Insufficient credit balance');
            }

            await tx.user.update({
                where: { id: userId },
                data: { creditBalance: newBalance },
            });

            const transaction = await tx.creditTransaction.create({
                data: {
                    userId,
                    type: CreditTransactionType.CONSUMPTION,
                    amount: -amount,
                    balanceAfter: newBalance,
                    relatedVpsId: vpsId,
                    metadata: metadata as never,
                },
            });

            await this.writeAuditLog(tx, {
                type: CreditTransactionType.CONSUMPTION,
                targetUserId: userId,
                actorId,
                amount: -amount,
                balanceAfter: newBalance,
                relatedVpsId: vpsId,
                transactionId: transaction.id,
                impersonatedBy: audit?.impersonatedBy,
            });

            return { newBalance, transactionId: transaction.id };
        });
    }

    /**
     * Refund credits (e.g., for canceled VPS before period ends)
     */
    async refund(
        userId: string,
        amount: number,
        vpsId?: string,
        reason?: string,
        metadata?: Record<string, unknown>,
        audit?: CreditAuditContext,
    ): Promise<{ newBalance: number; transactionId: string }> {
        if (amount <= 0) {
            throw new BadRequestException('Refund amount must be positive');
        }

        const actorId = audit?.actorId ?? userId;

        return await this.prisma.$transaction(async (tx) => {
            const user = await tx.user.findUnique({
                where: { id: userId },
                select: { creditBalance: true },
            });
            if (!user) throw new NotFoundException('User not found');

            const newBalance = user.creditBalance + amount;

            await tx.user.update({
                where: { id: userId },
                data: { creditBalance: newBalance },
            });

            const transaction = await tx.creditTransaction.create({
                data: {
                    userId,
                    type: CreditTransactionType.REFUND,
                    amount,
                    balanceAfter: newBalance,
                    relatedVpsId: vpsId,
                    reason,
                    metadata: metadata as never,
                },
            });

            await this.writeAuditLog(tx, {
                type: CreditTransactionType.REFUND,
                targetUserId: userId,
                actorId,
                amount,
                balanceAfter: newBalance,
                reason,
                relatedVpsId: vpsId,
                transactionId: transaction.id,
                impersonatedBy: audit?.impersonatedBy,
            });

            return { newBalance, transactionId: transaction.id };
        });
    }

    /**
     * Manual adjustment (SUPER_ADMIN only) - requires reason
     */
    async adjust(
        userId: string,
        amount: number,
        reason: string,
        adminId: string,
        metadata?: Record<string, unknown>,
        audit?: Pick<CreditAuditContext, 'impersonatedBy'>,
    ): Promise<{ newBalance: number; transactionId: string }> {
        if (!reason || reason.trim().length < 5) {
            throw new BadRequestException('Adjustment reason is required (minimum 5 characters)');
        }

        return await this.prisma.$transaction(async (tx) => {
            const user = await tx.user.findUnique({
                where: { id: userId },
                select: { creditBalance: true },
            });
            if (!user) throw new NotFoundException('User not found');

            const newBalance = user.creditBalance + amount;

            if (newBalance < 0) {
                throw new BadRequestException('Adjustment would result in negative balance');
            }

            await tx.user.update({
                where: { id: userId },
                data: { creditBalance: newBalance },
            });

            const transaction = await tx.creditTransaction.create({
                data: {
                    userId,
                    type: CreditTransactionType.ADJUSTMENT,
                    amount,
                    balanceAfter: newBalance,
                    reason,
                    metadata: { ...metadata, adminId } as never,
                },
            });

            await this.writeAuditLog(tx, {
                type: CreditTransactionType.ADJUSTMENT,
                targetUserId: userId,
                actorId: adminId,
                adminId,
                amount,
                balanceAfter: newBalance,
                reason,
                transactionId: transaction.id,
                impersonatedBy: audit?.impersonatedBy,
            });

            return { newBalance, transactionId: transaction.id };
        });
    }

    /**
     * Get transaction history for a user
     */
    async getTransactionHistory(
        userId: string,
        limit = 50,
        offset = 0,
    ) {
        return await this.prisma.creditTransaction.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
            take: limit,
            skip: offset,
            include: {
                relatedVps: {
                    select: {
                        id: true,
                        name: true,
                        status: true,
                    },
                },
            },
        });
    }

    /**
     * Check if user can start a PAY_AS_YOU_GO VPS (has sufficient balance)
     */
    async canStartPaygVps(userId: string, minimumRequired = 1): Promise<boolean> {
        const balance = await this.getBalance(userId);
        return balance >= minimumRequired;
    }

    /**
     * Check if user can provision a new VPS based on billing mode
     */
    async canProvisionVps(userId: string, billingMode: BillingMode): Promise<{ allowed: boolean; reason?: string }> {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            select: {
                subscriptionStatus: true,
                creditBalance: true,
            },
        });

        if (!user) {
            return { allowed: false, reason: 'User not found' };
        }

        if (billingMode === BillingMode.SUBSCRIPTION) {
            const activeStatuses: CloudSubscriptionStatus[] = [
                CloudSubscriptionStatus.ACTIVE,
                CloudSubscriptionStatus.TRIALING,
            ];
            if (!activeStatuses.includes(user.subscriptionStatus)) {
                return {
                    allowed: false,
                    reason: `Subscription must be ACTIVE or TRIALING (current: ${user.subscriptionStatus})`,
                };
            }
        } else {
            const minimumBalance = 10;
            if (user.creditBalance < minimumBalance) {
                return {
                    allowed: false,
                    reason: `Insufficient credit balance (${user.creditBalance} points, minimum ${minimumBalance} required)`,
                };
            }
        }

        return { allowed: true };
    }

    /**
     * Grant free trial credits to a new user
     */
    async grantTrialCredits(
        userId: string,
        amount: number,
        audit?: CreditAuditContext,
    ): Promise<void> {
        await this.topUp(userId, amount, {
            source: 'free_trial',
            note: 'Welcome bonus',
        }, audit ?? { actorId: userId });
    }
}

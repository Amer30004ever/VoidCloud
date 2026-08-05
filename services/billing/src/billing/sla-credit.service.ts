import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { CreditService } from './credit.service';
import {
    evaluateSlaPeriod,
    creditAmount,
    previousMonthPeriod,
    SLA_TARGET_UPTIME,
} from './sla-credit';

export interface SlaRunSummary {
    periodStart: Date;
    periodEnd: Date;
    evaluated: number;
    credited: number;
    totalAmount: number;
}

/**
 * Tier 9 — SLA-based automatic credit refunds.
 *
 * Reads real `VpsHealthLog` probe samples (written by the monitoring service's
 * TCP prober) for the closed billing period, computes uptime per VPS, and
 * refunds credit through the existing credit ledger. Idempotent: a
 * `SlaCredit` row is unique per (vpsId, periodStart), so a re-run never
 * double-credits.
 */
@Injectable()
export class SlaCreditService {
    private readonly logger = new Logger(SlaCreditService.name);

    constructor(
        private readonly prisma: PrismaService,
        private readonly credits: CreditService,
    ) { }

    /** Monthly sweep, 03:00 UTC on the 1st. */
    @Cron('0 3 1 * *')
    async monthlySweep(): Promise<void> {
        try {
            const summary = await this.runForPeriod();
            this.logger.log(
                `SLA credit sweep: ${summary.credited}/${summary.evaluated} VPS credited, total ${summary.totalAmount}`,
            );
        } catch (error) {
            this.logger.error(
                `SLA credit sweep failed: ${error instanceof Error ? error.message : String(error)}`,
            );
        }
    }

    async runForPeriod(period?: { periodStart: Date; periodEnd: Date }): Promise<SlaRunSummary> {
        const { periodStart, periodEnd } = period ?? previousMonthPeriod();

        const deployments = await this.prisma.cloudDeployment.findMany({
            where: { terminatedAt: null, provisionedAt: { not: null, lt: periodEnd } },
            select: { id: true, userId: true, name: true },
        });

        let credited = 0;
        let totalAmount = 0;

        for (const vps of deployments) {
            const amount = await this.evaluateAndCredit(vps, periodStart, periodEnd);
            if (amount > 0) {
                credited += 1;
                totalAmount += amount;
            }
        }

        return {
            periodStart,
            periodEnd,
            evaluated: deployments.length,
            credited,
            totalAmount: Math.round(totalAmount * 100) / 100,
        };
    }

    private async evaluateAndCredit(
        vps: { id: string; userId: string; name: string },
        periodStart: Date,
        periodEnd: Date,
    ): Promise<number> {
        const existing = await this.prisma.slaCredit.findUnique({
            where: { vpsId_periodStart: { vpsId: vps.id, periodStart } },
        });
        if (existing) return 0;

        const samples = await this.prisma.vpsHealthLog.findMany({
            where: { vpsId: vps.id, checkedAt: { gte: periodStart, lt: periodEnd } },
            select: { status: true, checkedAt: true },
            orderBy: { checkedAt: 'asc' },
        });

        const result = evaluateSlaPeriod(samples, periodStart, periodEnd);
        if (result.creditPercent <= 0) return 0;

        const periodCharge = await this.periodCharge(vps.id, periodStart, periodEnd);
        const amount = creditAmount(periodCharge, result.creditPercent);
        if (amount <= 0) return 0;

        const reason = `SLA credit: ${result.uptimePercent}% uptime on "${vps.name}" (target ${SLA_TARGET_UPTIME}%)`;

        const refund = await this.credits.refund(
            vps.userId,
            amount,
            vps.id,
            reason,
            {
                source: 'sla_credit',
                periodStart: periodStart.toISOString(),
                periodEnd: periodEnd.toISOString(),
                uptimePercent: result.uptimePercent,
                downtimeMinutes: result.downtimeMinutes,
                creditPercent: result.creditPercent,
            },
            { actorId: 'system:sla-credit' },
        );

        await this.prisma.slaCredit.create({
            data: {
                vpsId: vps.id,
                userId: vps.userId,
                periodStart,
                periodEnd,
                uptimePercent: result.uptimePercent,
                downtimeMinutes: result.downtimeMinutes,
                creditPercent: result.creditPercent,
                amount,
                transactionId: refund.transactionId,
            },
        });

        return amount;
    }

    /** Amount actually consumed for this VPS in the period (credit ledger). */
    private async periodCharge(
        vpsId: string,
        periodStart: Date,
        periodEnd: Date,
    ): Promise<number> {
        const consumed = await this.prisma.creditTransaction.aggregate({
            where: {
                relatedVpsId: vpsId,
                type: 'CONSUMPTION',
                createdAt: { gte: periodStart, lt: periodEnd },
            },
            _sum: { amount: true },
        });
        return Math.abs(consumed._sum.amount ?? 0);
    }

    async listForUser(userId: string, limit = 50) {
        return this.prisma.slaCredit.findMany({
            where: { userId },
            orderBy: { periodStart: 'desc' },
            take: Math.min(limit, 200),
        });
    }
}

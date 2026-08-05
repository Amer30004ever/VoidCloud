import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { CreditService } from './credit.service';
import {
  computeUsage,
  computeOverage,
  includedGbForPlan,
  previousMonthPeriod,
  currentMonthPeriod,
  DEFAULT_RATE_PER_GB,
} from './bandwidth';

export interface BandwidthRunSummary {
  periodStart: Date;
  periodEnd: Date;
  evaluated: number;
  charged: number;
  totalAmount: number;
}

/**
 * Tier 9 — Bandwidth metering and overage billing.
 *
 * Ingests cumulative NIC counters sampled from the hypervisor, aggregates
 * them per billing period tolerating counter resets, and charges the credit
 * ledger for transfer above the plan allowance. Idempotent: `BandwidthOverage`
 * is unique per (vpsId, periodStart), so a re-run never double-charges.
 */
@Injectable()
export class BandwidthService {
  private readonly logger = new Logger(BandwidthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly credits: CreditService,
  ) {}

  /** Record one hypervisor NIC counter reading for a VPS. */
  async recordSample(
    vpsId: string,
    counters: { rxBytes: bigint | number; txBytes: bigint | number; sampledAt?: Date },
  ) {
    const vps = await this.prisma.cloudDeployment.findUnique({
      where: { id: vpsId },
      select: { id: true, userId: true },
    });
    if (!vps) throw new NotFoundException('VPS not found');

    return this.prisma.bandwidthSample.create({
      data: {
        vpsId: vps.id,
        userId: vps.userId,
        rxBytes: BigInt(counters.rxBytes),
        txBytes: BigInt(counters.txBytes),
        sampledAt: counters.sampledAt ?? new Date(),
      },
    });
  }

  /** Usage for one VPS over a period, tenant-scoped by the caller. */
  async usageFor(vpsId: string, periodStart: Date, periodEnd: Date) {
    const samples = await this.prisma.bandwidthSample.findMany({
      where: { vpsId, sampledAt: { gte: periodStart, lt: periodEnd } },
      select: { rxBytes: true, txBytes: true, sampledAt: true },
      orderBy: { sampledAt: 'asc' },
    });
    return computeUsage(samples);
  }

  /** Open-period usage summary for every VPS owned by a user. */
  async currentUsageForUser(userId: string) {
    const { periodStart, periodEnd } = currentMonthPeriod();
    const deployments = await this.prisma.cloudDeployment.findMany({
      where: { userId, terminatedAt: null },
      select: { id: true, name: true, memory: true },
    });

    return Promise.all(
      deployments.map(async (vps) => {
        const usage = await this.usageFor(vps.id, periodStart, periodEnd);
        const includedGb = includedGbForPlan(vps.memory);
        const projected = computeOverage(usage.totalGb, includedGb, DEFAULT_RATE_PER_GB);
        return {
          vpsId: vps.id,
          name: vps.name,
          periodStart,
          periodEnd,
          ...usage,
          ...projected,
        };
      }),
    );
  }

  async listOveragesForUser(userId: string, limit = 50) {
    return this.prisma.bandwidthOverage.findMany({
      where: { userId },
      orderBy: { periodStart: 'desc' },
      take: Math.min(limit, 200),
    });
  }

  /** Monthly sweep, 04:00 UTC on the 1st (after the SLA sweep). */
  @Cron('0 4 1 * *')
  async monthlySweep(): Promise<void> {
    try {
      const summary = await this.runForPeriod();
      this.logger.log(
        `Bandwidth sweep: ${summary.charged}/${summary.evaluated} VPS charged, total ${summary.totalAmount}`,
      );
    } catch (error) {
      this.logger.error(
        `Bandwidth sweep failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  async runForPeriod(period?: {
    periodStart: Date;
    periodEnd: Date;
  }): Promise<BandwidthRunSummary> {
    const { periodStart, periodEnd } = period ?? previousMonthPeriod();

    const deployments = await this.prisma.cloudDeployment.findMany({
      where: { provisionedAt: { not: null, lt: periodEnd } },
      select: { id: true, userId: true, name: true, memory: true },
    });

    let charged = 0;
    let totalAmount = 0;

    for (const vps of deployments) {
      const amount = await this.evaluateAndCharge(vps, periodStart, periodEnd);
      if (amount > 0) {
        charged += 1;
        totalAmount += amount;
      }
    }

    return {
      periodStart,
      periodEnd,
      evaluated: deployments.length,
      charged,
      totalAmount: Math.round(totalAmount * 100) / 100,
    };
  }

  private async evaluateAndCharge(
    vps: { id: string; userId: string; name: string; memory: number },
    periodStart: Date,
    periodEnd: Date,
  ): Promise<number> {
    const existing = await this.prisma.bandwidthOverage.findUnique({
      where: { vpsId_periodStart: { vpsId: vps.id, periodStart } },
    });
    if (existing) return 0;

    const usage = await this.usageFor(vps.id, periodStart, periodEnd);
    const includedGb = includedGbForPlan(vps.memory);
    const overage = computeOverage(usage.totalGb, includedGb, DEFAULT_RATE_PER_GB);

    // Always record the period so the sweep is idempotent and usage is
    // auditable, even when nothing is owed.
    let transactionId: string | undefined;
    if (overage.amount > 0) {
      const charge = await this.credits.consume(
        vps.userId,
        overage.amount,
        vps.id,
        `Bandwidth overage: ${overage.overageGb} GB over ${includedGb} GB on "${vps.name}"`,
        {
          source: 'bandwidth_overage',
          periodStart: periodStart.toISOString(),
          periodEnd: periodEnd.toISOString(),
          usedGb: overage.usedGb,
          includedGb,
          overageGb: overage.overageGb,
          ratePerGb: overage.ratePerGb,
        },
        { actorId: 'system:bandwidth-metering' },
      );
      transactionId = (charge as { transactionId?: string })?.transactionId;
    }

    await this.prisma.bandwidthOverage.create({
      data: {
        vpsId: vps.id,
        userId: vps.userId,
        periodStart,
        periodEnd,
        includedGb,
        usedGb: overage.usedGb,
        overageGb: overage.overageGb,
        ratePerGb: overage.ratePerGb,
        amount: overage.amount,
        transactionId: transactionId ?? null,
      },
    });

    return overage.amount;
  }
}

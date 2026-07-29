import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class BillingService {
  constructor(private readonly prisma: PrismaService) { }

  listSubscriptions(userId?: string) {
    return this.prisma.user.findMany({
      where: userId ? { id: userId } : undefined,
      select: {
        id: true,
        email: true,
        subscriptionStatus: true,
        trialEndsAt: true,
        cloudPlan: true,
      },
    });
  }

  async createSubscription(userId: string, planSlug: string) {
    const plan = await this.prisma.cloudPlan.findUnique({ where: { slug: planSlug } });
    if (!plan) throw new NotFoundException('Plan not found');
    return this.prisma.user.update({
      where: { id: userId },
      data: {
        cloudPlanId: plan.id,
        subscriptionStatus: plan.priceUSD === 0 ? 'ACTIVE' : 'INCOMPLETE' as never,
        trialEndsAt: plan.trialDays
          ? new Date(Date.now() + plan.trialDays * 86400000)
          : null,
      },
      include: { cloudPlan: true },
    });
  }

  updateSubscription(userId: string, data: { planSlug?: string; status?: string }) {
    return this.prisma.user.update({
      where: { id: userId },
      data: {
        subscriptionStatus: data.status as never,
      },
    });
  }

  listInvoices(userId?: string) {
    return this.prisma.cloudInvoice.findMany({
      where: userId ? { userId } : undefined,
      orderBy: { createdAt: 'desc' },
    });
  }

  getInvoice(id: string) {
    return this.prisma.cloudInvoice.findUnique({ where: { id } });
  }

  async createInvoiceForPlan(userId: string, planSlug: string) {
    const plan = await this.prisma.cloudPlan.findUnique({ where: { slug: planSlug } });
    if (!plan) throw new NotFoundException('Plan not found');
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    const currency = 'EGP';
    const amount = plan.priceEGP > 0 ? plan.priceEGP : plan.priceUSD;

    const number = `INV-${Date.now().toString(36).toUpperCase()}`;
    const dueDate = new Date(Date.now() + 7 * 86400000);

    return this.prisma.cloudInvoice.create({
      data: {
        userId,
        number,
        amountUSD: plan.priceUSD > 0 ? plan.priceUSD : undefined,
        amountEGP: plan.priceEGP > 0 ? plan.priceEGP : undefined,
        currency,
        description: `Subscription: ${plan.name}`,
        dueDate,
      },
    });
  }

  async processPayment(data: { userId: string; invoiceId: string; provider: string }) {
    const invoice = await this.prisma.cloudInvoice.findUnique({ where: { id: data.invoiceId } });
    if (!invoice) throw new NotFoundException('Invoice not found');
    return this.prisma.cloudInvoice.update({
      where: { id: data.invoiceId },
      data: { status: 'PAID', paidAt: new Date(), provider: data.provider },
    });
  }

  listPlans() {
    return this.prisma.cloudPlan.findMany({ where: { isActive: true }, orderBy: { sortOrder: 'asc' } });
  }

  createPlan(data: Record<string, unknown>) {
    return this.prisma.cloudPlan.create({ data: data as never });
  }

  updatePlan(id: string, data: Record<string, unknown>) {
    return this.prisma.cloudPlan.update({ where: { id }, data: data as never });
  }

  deletePlan(id: string) {
    return this.prisma.cloudPlan.delete({ where: { id } });
  }

  async refundInvoice(invoiceId: string, partial?: number) {
    const invoice = await this.prisma.cloudInvoice.findUnique({ where: { id: invoiceId } });
    if (!invoice) throw new NotFoundException('Invoice not found');
    return this.prisma.cloudInvoice.update({
      where: { id: invoiceId },
      data: { status: 'REFUNDED', refundedAt: new Date() },
    });
  }

  async confirmInvoice(invoiceId: string) {
    const invoice = await this.prisma.cloudInvoice.findUnique({ where: { id: invoiceId } });
    if (!invoice) throw new NotFoundException('Invoice not found');
    return this.prisma.cloudInvoice.update({
      where: { id: invoiceId },
      data: { status: 'PAID', paidAt: new Date() },
    });
  }

  async rejectInvoice(invoiceId: string, reason: string) {
    const invoice = await this.prisma.cloudInvoice.findUnique({ where: { id: invoiceId } });
    if (!invoice) throw new NotFoundException('Invoice not found');
    return this.prisma.cloudInvoice.update({
      where: { id: invoiceId },
      data: { status: 'FAILED' },
    });
  }

  async adminBillingStats() {
    const now = new Date();
    const startDate = new Date(now.getFullYear(), now.getMonth() - 11, 1, 0, 0, 0, 0);

    const paidInvoices12 = await this.prisma.cloudInvoice.findMany({
      where: {
        status: 'PAID',
        createdAt: { gte: startDate },
      },
      include: { user: { select: { email: true, cloudPlan: { select: { name: true } } } } },
      orderBy: { createdAt: 'asc' },
    });

    const allPaidInvoices = await this.prisma.cloudInvoice.findMany({
      where: { status: 'PAID' },
      include: { user: { select: { email: true, cloudPlan: { select: { name: true } } } } },
    });

    const failedPayments = await this.prisma.billingPaymentAlert.findMany({
      where: { status: 'FAILED' },
      include: {
        invoice: {
          select: {
            number: true,
            user: { select: { id: true, email: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    const months = Array.from({ length: 12 }, (_, index) => {
      const month = new Date(startDate.getFullYear(), startDate.getMonth() + index, 1, 0, 0, 0, 0);
      return formatMonth(month);
    });

    const monthly = months.map((month) => ({
      month,
      usd: 0,
      egp: 0,
      total: 0,
      activeSubscriptions: 0,
      userIds: new Set<string>(),
    }));

    const subscriptionInvoices = paidInvoices12.filter((invoice) =>
      typeof invoice.description === 'string' && invoice.description.startsWith('Subscription:'),
    );

    for (const invoice of subscriptionInvoices) {
      const month = formatMonth(invoice.createdAt);
      const bucket = monthly.find((item) => item.month === month);
      if (!bucket) continue;

      const amount = invoice.currency === 'EGP' ? invoice.amountEGP ?? 0 : invoice.amountUSD ?? 0;
      if (invoice.currency === 'EGP') {
        bucket.egp += amount;
      } else {
        bucket.usd += amount;
      }
      bucket.total += amount;
      bucket.userIds.add(invoice.userId);
    }

    const mrrMonthly = monthly.map((item) => ({
      month: item.month,
      usd: item.usd,
      egp: item.egp,
      total: item.total,
      activeSubscriptions: item.userIds.size,
    }));

    const churnMonthly = mrrMonthly.map((item, index) => {
      const prev = index > 0 ? mrrMonthly[index - 1] : null;
      const churned = prev ? Math.max(0, prev.activeSubscriptions - item.activeSubscriptions) : 0;
      return {
        month: item.month,
        churnRate: prev && prev.activeSubscriptions ? Number((churned / prev.activeSubscriptions).toFixed(4)) : 0,
        churned,
        activeSubscriptions: item.activeSubscriptions,
      };
    });

    const topTenantMap = new Map<string, { userId: string; email: string; totalUSD: number; totalEGP: number; invoiceCount: number; planName: string | null }>();
    for (const invoice of allPaidInvoices) {
      const existing = topTenantMap.get(invoice.userId) ?? {
        userId: invoice.userId,
        email: invoice.user?.email ?? 'Unknown',
        totalUSD: 0,
        totalEGP: 0,
        invoiceCount: 0,
        planName: invoice.user?.cloudPlan?.name ?? null,
      };
      if (invoice.currency === 'EGP') {
        existing.totalEGP += invoice.amountEGP ?? 0;
      } else {
        existing.totalUSD += invoice.amountUSD ?? 0;
      }
      existing.invoiceCount += 1;
      topTenantMap.set(invoice.userId, existing);
    }

    const topTenants = Array.from(topTenantMap.values())
      .sort((a, b) => (b.totalUSD + b.totalEGP) - (a.totalUSD + a.totalEGP))
      .slice(0, 20);

    const planMap = new Map<string, { planName: string; usd: number; egp: number; total: number; count: number }>();
    for (const invoice of subscriptionInvoices) {
      const planName = invoice.user?.cloudPlan?.name ?? invoice.description?.replace(/^Subscription:\s*/, '') ?? 'Unknown';
      const current = planMap.get(planName) ?? { planName, usd: 0, egp: 0, total: 0, count: 0 };
      const amount = invoice.currency === 'EGP' ? invoice.amountEGP ?? 0 : invoice.amountUSD ?? 0;
      if (invoice.currency === 'EGP') {
        current.egp += amount;
      } else {
        current.usd += amount;
      }
      current.total += amount;
      current.count += 1;
      planMap.set(planName, current);
    }

    const revenueByPlan = Array.from(planMap.values()).sort((a, b) => b.total - a.total);

    return {
      mrrMonthly,
      churnMonthly,
      topTenants,
      revenueByPlan,
      failedPayments: failedPayments.map((alert) => ({
        id: alert.id,
        number: alert.invoice?.number ?? 'Unknown',
        userId: alert.invoice?.user?.id ?? '',
        email: alert.invoice?.user?.email ?? 'Unknown',
        amount: alert.amount ?? 0,
        currency: alert.currency ?? 'USD',
        provider: alert.provider,
        providerRef: alert.gatewayRef,
        description: alert.reason ?? 'Failed payment webhook',
        createdAt: alert.createdAt.toISOString(),
        status: alert.status,
      })),
    };
  }

  createReferral(userId: string) {
    return { code: `ref-${userId.slice(0, 8)}`, url: `https://voidcloud.cc.cd/register?ref=${userId}` };
  }

  referralStats(userId: string) {
    return { userId, signups: 0, commissions: 0, pendingPayout: 0 };
  }

  requestPayout(userId: string) {
    return { success: true, userId, status: 'pending' };
  }
}

function formatMonth(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

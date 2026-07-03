import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class BillingService {
  constructor(private readonly prisma: PrismaService) {}

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

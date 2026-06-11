import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { randomBytes } from 'crypto';

@Injectable()
export class CloudBillingService {
  constructor(private prisma: PrismaService) {}

  async currentSubscription(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { cloudPlan: true },
    });
    if (!user) throw new NotFoundException();
    return {
      plan: user.cloudPlan,
      status: user.subscriptionStatus,
      trialEndsAt: user.trialEndsAt,
    };
  }

  async subscribe(userId: string, planId: string, provider: 'stripe' | 'fawry' | 'instapay' | 'cash') {
    const plan = await this.prisma.cloudPlan.findUnique({ where: { id: planId } });
    if (!plan) throw new NotFoundException('Plan not found');
    if (!plan.isActive) throw new BadRequestException('Plan inactive');

    const number = `INV-${Date.now().toString(36).toUpperCase()}-${randomBytes(2).toString('hex').toUpperCase()}`;
    const useEGP = provider === 'fawry' || provider === 'instapay' || provider === 'cash';

    const invoice = await this.prisma.cloudInvoice.create({
      data: {
        userId,
        number,
        amountUSD: useEGP ? null : plan.priceUSD,
        amountEGP: useEGP ? plan.priceEGP : null,
        currency: useEGP ? 'EGP' : 'USD',
        description: `Subscription: ${plan.name}`,
        provider,
        providerRef: this.buildProviderRef(provider, number),
        dueDate: new Date(Date.now() + 24 * 3600 * 1000),
        status: 'PENDING',
        metadata: { planId },
      },
    });

    // Stub: if provider is stripe (test mode) auto-activate; in Phase 2 real Stripe Checkout URL
    let checkout: Record<string, unknown> = { provider, invoiceId: invoice.id, number: invoice.number };
    if (provider === 'fawry') {
      checkout = {
        ...checkout,
        reference: invoice.providerRef,
        qrPayload: `fawry:${invoice.providerRef}:${plan.priceEGP}`,
        amount: plan.priceEGP,
        currency: 'EGP',
        instructions: 'Pay at any Fawry location or via Fawry app using the reference number.',
      };
    } else if (provider === 'instapay') {
      checkout = {
        ...checkout,
        bankAccount: 'IBAN EG-AMERCLOUD-1234',
        reference: invoice.providerRef,
        deepLink: `instapay://pay?amount=${plan.priceEGP}&ref=${invoice.providerRef}`,
        amount: plan.priceEGP,
        currency: 'EGP',
      };
    } else if (provider === 'stripe') {
      checkout = {
        ...checkout,
        // In Phase 2: real Stripe Checkout Session
        sessionUrl: `https://checkout.amercloud.dev/mock/${invoice.id}`,
        amount: plan.priceUSD,
        currency: 'USD',
      };
    } else if (provider === 'cash') {
      checkout = {
        ...checkout,
        instructions: 'Cash payments are confirmed manually by an admin within 24 hours.',
        amount: plan.priceEGP,
        currency: 'EGP',
      };
    }

    return { invoice, checkout };
  }

  private buildProviderRef(provider: string, number: string) {
    const r = randomBytes(4).toString('hex').toUpperCase();
    return `${provider.toUpperCase()}-${number}-${r}`;
  }

  async cancel(userId: string) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { subscriptionStatus: 'CANCELED' },
    });
  }

  invoices(userId: string) {
    return this.prisma.cloudInvoice.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getInvoice(userId: string, id: string) {
    const inv = await this.prisma.cloudInvoice.findUnique({ where: { id } });
    if (!inv || inv.userId !== userId) throw new NotFoundException();
    return inv;
  }

  /** Mark an invoice paid and activate user plan. */
  async confirmPayment(invoiceId: string) {
    const inv = await this.prisma.cloudInvoice.findUnique({ where: { id: invoiceId } });
    if (!inv) throw new NotFoundException();
    if (inv.status === 'PAID') return inv;

    const meta = (inv.metadata ?? {}) as Record<string, string>;
    const planId = meta.planId;

    await this.prisma.cloudInvoice.update({
      where: { id: invoiceId },
      data: { status: 'PAID', paidAt: new Date() },
    });
    if (planId) {
      await this.prisma.user.update({
        where: { id: inv.userId },
        data: {
          cloudPlanId: planId,
          subscriptionStatus: 'ACTIVE',
          trialEndsAt: null,
        },
      });
    }
    return this.prisma.cloudInvoice.findUnique({ where: { id: invoiceId } });
  }

  paymentMethods(userId: string) {
    return this.prisma.cloudPaymentMethod.findMany({ where: { userId } });
  }
  addPaymentMethod(userId: string, type: any, providerId: string, label?: string, last4?: string) {
    return this.prisma.cloudPaymentMethod.create({
      data: { userId, type, providerId, label, last4 },
    });
  }
  removePaymentMethod(userId: string, id: string) {
    return this.prisma.cloudPaymentMethod.deleteMany({ where: { id, userId } });
  }
}

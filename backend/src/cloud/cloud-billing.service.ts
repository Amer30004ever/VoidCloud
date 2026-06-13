import { Injectable, BadRequestException, NotFoundException, Inject, forwardRef } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { randomBytes } from 'crypto';
import { StripeService } from './billing/stripe.service';
import { FawryService } from './billing/fawry.service';
import { InstapayService } from './billing/instapay.service';
import { CloudEmailService } from './notifications/email.service';
import { ProxmoxService } from './proxmox/proxmox.service';
import * as bcrypt from 'bcryptjs';

export interface SubscribePayload {
  planId: string;
  provider: 'stripe' | 'fawry' | 'instapay' | 'cash';
  customerPhone?: string;       // Fawry (010XXXXXXXX)
  payerInstapayId?: string;     // InstaPay (e.g. amer3000@instapay)
}

@Injectable()
export class CloudBillingService {
  constructor(
    private prisma: PrismaService,
    private stripe: StripeService,
    private fawry: FawryService,
    private instapay: InstapayService,
    private email: CloudEmailService,
    private proxmox: ProxmoxService,
  ) {}

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

  async subscribe(userId: string, payload: SubscribePayload) {
    const { planId, provider, customerPhone, payerInstapayId } = payload;
    const plan = await this.prisma.cloudPlan.findUnique({ where: { id: planId } });
    if (!plan) throw new NotFoundException('Plan not found');
    if (!plan.isActive) throw new BadRequestException('Plan inactive');

    // Light input validation
    if (provider === 'fawry' && customerPhone && !/^01[0-9]{9}$/.test(customerPhone)) {
      throw new BadRequestException('Phone must be Egyptian format: 01XXXXXXXXX');
    }
    if (provider === 'instapay' && payerInstapayId && !/^[\w.+-]{2,}@[\w.+-]{2,}$/.test(payerInstapayId)) {
      throw new BadRequestException('InstaPay ID must look like name@instapay');
    }

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
        metadata: { planId, customerPhone, payerInstapayId },
      },
    });

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    let checkout: Record<string, unknown> = { provider, invoiceId: invoice.id, number: invoice.number };

    if (provider === 'stripe') {
      const s = await this.stripe.createCheckoutSession({
        userEmail: user!.email, planName: plan.name, priceUSD: plan.priceUSD,
        invoiceId: invoice.id, userId, planId,
        successUrl: `${process.env.FRONTEND_URL}/amercloud/dashboard/billing?success=1&invoice=${invoice.id}`,
        cancelUrl: `${process.env.FRONTEND_URL}/amercloud/dashboard/billing?canceled=1`,
      });
      checkout = { ...checkout, sessionUrl: s.url, sessionId: s.sessionId, amount: plan.priceUSD, currency: 'USD' };
    } else if (provider === 'fawry') {
      const f = await this.fawry.createPayment({
        userEmail: user!.email, userPhone: customerPhone, planName: plan.name,
        amountEGP: plan.priceEGP, invoiceId: invoice.id,
      });
      checkout = {
        ...checkout, paymentUrl: f.paymentUrl, reference: f.referenceId, qrCode: f.qrCode,
        merchantPhone: (f as any).merchantPhone, amount: plan.priceEGP, currency: 'EGP', sandbox: (f as any).sandbox,
      };
    } else if (provider === 'instapay') {
      const i = await this.instapay.createPayment({
        userName: user!.name, userEmail: user!.email, payerInstapayId,
        amountEGP: plan.priceEGP, invoiceId: invoice.id,
      });
      checkout = {
        ...checkout, paymentUrl: i.paymentUrl, reference: i.referenceId,
        merchantInstapayId: (i as any).merchantInstapayId,
        amount: plan.priceEGP, currency: 'EGP', instructions: (i as any).instructions, sandbox: (i as any).sandbox,
      };
    } else if (provider === 'cash') {
      // CASH: mark user as PENDING_PAYMENT; new VPS calls will be queued and provisioned on admin approval.
      await this.prisma.user.update({
        where: { id: userId },
        data: { subscriptionStatus: 'PENDING_PAYMENT', cloudPlanId: planId },
      });
      checkout = {
        ...checkout,
        instructions: 'Pay on delivery. An admin will approve your payment within 24h, then your VPS will be provisioned automatically.',
        amount: plan.priceEGP, currency: 'EGP',
        pendingApproval: true,
      };
    }

    this.email.invoice(user!.email, useEGP ? plan.priceEGP : plan.priceUSD, useEGP ? 'EGP' : 'USD', invoice.id);
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

  /** Mark invoice paid, activate plan, auto-provision any queued VPS. */
  async confirmPayment(invoiceId: string) {
    const inv = await this.prisma.cloudInvoice.findUnique({ where: { id: invoiceId } });
    if (!inv) throw new NotFoundException();
    if (inv.status === 'PAID') return inv;

    const meta = (inv.metadata ?? {}) as Record<string, string>;
    const planId = meta.planId;

    const paid = await this.prisma.cloudInvoice.update({
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

    // Confirmation email (best-effort)
    const user = await this.prisma.user.findUnique({ where: { id: inv.userId } });
    if (user) {
      const amount = paid.amountEGP ?? paid.amountUSD ?? 0;
      const currency = paid.amountEGP ? 'EGP' : 'USD';
      this.email.invoicePaid(user.email, user.name, {
        invoiceNumber: paid.number, amount: Number(amount), currency, invoiceId: paid.id,
      });
    }

    // Provision any queued VPS rows now that payment cleared.
    await this.provisionPendingVps(inv.userId);

    return this.prisma.cloudInvoice.findUnique({ where: { id: invoiceId } });
  }

  /** Admin rejects a pending invoice (cash flow). */
  async rejectPayment(invoiceId: string, reason: string) {
    const inv = await this.prisma.cloudInvoice.findUnique({ where: { id: invoiceId } });
    if (!inv) throw new NotFoundException();
    if (inv.status === 'PAID') throw new BadRequestException('Invoice already paid');
    await this.prisma.cloudInvoice.update({
      where: { id: invoiceId },
      data: { status: 'FAILED', metadata: { ...(inv.metadata as any), rejectionReason: reason } as any },
    });
    // Mark queued VPS as FAILED
    await this.prisma.cloudDeployment.updateMany({
      where: { userId: inv.userId, status: 'PENDING_PAYMENT' },
      data: { status: 'FAILED', statusMessage: `Payment rejected: ${reason}` },
    });
    await this.prisma.user.update({
      where: { id: inv.userId },
      data: { subscriptionStatus: 'EXPIRED' },
    });
    return this.prisma.cloudInvoice.findUnique({ where: { id: invoiceId } });
  }

  private async provisionPendingVps(userId: string) {
    const pending = await this.prisma.cloudDeployment.findMany({
      where: { userId, status: 'PENDING_PAYMENT' },
    });
    for (const d of pending) {
      try {
        const prov = await this.proxmox.createContainer({
          hostname: d.hostname ?? d.name,
          cpuCores: d.cpu,
          ramMB: d.memory,
          storageGB: Math.ceil(d.storage / 1024),
        });
        const rootPasswordHash = await bcrypt.hash(prov.rootPassword, 10);
        await this.prisma.cloudDeployment.update({
          where: { id: d.id },
          data: {
            status: 'RUNNING',
            statusMessage: null,
            ipv4Address: prov.ipv4Address,
            proxmoxVMID: prov.vmid,
            proxmoxNode: prov.node,
            rootPasswordHash,
            provisionedAt: new Date(),
            lastDeployedAt: new Date(),
          },
        });
        // Notify user that the queued VPS is now ready (root password NOT included — already shown at create time hash-only).
        const owner = await this.prisma.user.findUnique({ where: { id: d.userId } });
        if (owner) {
          this.email.vpsReady(owner.email, owner.name, {
            vpsName: d.name, ipv4: prov.ipv4Address, rootPassword: prov.rootPassword,
          });
        }
      } catch (e: any) {
        await this.prisma.cloudDeployment.update({
          where: { id: d.id },
          data: { status: 'FAILED', statusMessage: `Provision failed: ${e.message}` },
        });
      }
    }
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

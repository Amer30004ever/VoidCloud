import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { AuthService } from '../auth/auth.service';
import { Role } from '@prisma/client';

@Injectable()
export class CloudAdminService {
  constructor(
    private prisma: PrismaService,
    private auth: AuthService,
    private jwt: JwtService,
  ) {}

  async stats() {
    const [users, plans, deployments, invoices, mrr] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.cloudPlan.count({ where: { isActive: true } }),
      this.prisma.cloudDeployment.count({ where: { status: { not: 'DELETED' } } }),
      this.prisma.cloudInvoice.count(),
      this.prisma.cloudInvoice.aggregate({
        where: { status: 'PAID' },
        _sum: { amountUSD: true, amountEGP: true },
      }),
    ]);
    return {
      users,
      plans,
      deployments,
      invoices,
      revenueUSD: mrr._sum.amountUSD ?? 0,
      revenueEGP: mrr._sum.amountEGP ?? 0,
    };
  }

  async listUsers(search?: string, planId?: string, status?: string) {
    return this.prisma.user.findMany({
      where: {
        ...(search ? { OR: [
          { email: { contains: search, mode: 'insensitive' } },
          { name: { contains: search, mode: 'insensitive' } },
        ] } : {}),
        ...(planId ? { cloudPlanId: planId } : {}),
        ...(status ? { subscriptionStatus: status as any } : {}),
      },
      include: { cloudPlan: true, _count: { select: { cloudDeployments: true, cloudInvoices: true } } },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
  }

  async setUserPlan(userId: string, planId: string | null) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { cloudPlanId: planId, subscriptionStatus: planId ? 'ACTIVE' : 'CANCELED' },
    });
  }

  async suspend(userId: string, reason: string) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { suspendedAt: new Date(), suspendedReason: reason, isActive: false, subscriptionStatus: 'SUSPENDED' },
    });
  }
  async activate(userId: string) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { suspendedAt: null, suspendedReason: null, isActive: true, subscriptionStatus: 'ACTIVE' },
    });
  }

  async overrideLimits(userId: string, limits: Record<string, number>) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { overrideLimits: limits as any },
    });
  }

  async extendTrial(userId: string, days: number) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException();
    const base = user.trialEndsAt && user.trialEndsAt > new Date() ? user.trialEndsAt : new Date();
    return this.prisma.user.update({
      where: { id: userId },
      data: { trialEndsAt: new Date(base.getTime() + days * 86400000), subscriptionStatus: 'TRIALING' },
    });
  }

  async refund(invoiceId: string, partial?: number) {
    return this.prisma.cloudInvoice.update({
      where: { id: invoiceId },
      data: { status: 'REFUNDED', refundedAt: new Date(), metadata: { partial: partial ?? null } as any },
    });
  }

  transactions() {
    return this.prisma.cloudInvoice.findMany({
      orderBy: { createdAt: 'desc' },
      include: { user: { select: { id: true, email: true, name: true } } },
      take: 500,
    });
  }

  broadcast(title: string, body: string, severity = 'info', audience = 'all') {
    return this.prisma.cloudAnnouncement.create({
      data: { title, body, severity, audience },
    });
  }
  announcements() {
    return this.prisma.cloudAnnouncement.findMany({ orderBy: { createdAt: 'desc' }, take: 50 });
  }
}

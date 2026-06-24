import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
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
    const [users, plans, activeSubscriptions, deployments, invoices, mrr] =
      await Promise.all([
        this.prisma.user.count(),
        this.prisma.cloudPlan.count({ where: { isActive: true } }),
        this.prisma.user.count({
          where: { subscriptionStatus: { in: ['ACTIVE', 'TRIALING'] as any } },
        }),
        this.prisma.cloudDeployment.count({
          where: { status: 'RUNNING' },
        }),
        this.prisma.cloudInvoice.count(),
        this.prisma.cloudInvoice.aggregate({
          where: { status: 'PAID' },
          _sum: { amountUSD: true, amountEGP: true },
        }),
      ]);
    return {
      users,
      plans,
      activeSubscriptions,
      deployments,
      invoices,
      revenueUSD: Number(mrr._sum.amountUSD ?? 0),
      revenueEGP: Number(mrr._sum.amountEGP ?? 0),
    };
  }

  async realStats() {
    const [totalUsers, activePlans, runningVPS, mrr] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.user.count({
        where: { subscriptionStatus: 'ACTIVE' as any },
      }),
      this.prisma.cloudDeployment.count({
        where: { status: 'RUNNING' as any },
      }),
      this.prisma.cloudInvoice.aggregate({
        where: { status: 'PAID' },
        _sum: { amountUSD: true, amountEGP: true },
      }),
    ]);
    return {
      totalUsers,
      activePlans,
      runningVPS,
      revenueUSD: Number(mrr._sum.amountUSD ?? 0),
      revenueEGP: Number(mrr._sum.amountEGP ?? 0),
    };
  }

  async listUsers(search?: string, planId?: string, status?: string) {
    return this.prisma.user.findMany({
      where: {
        ...(search
          ? {
              OR: [
                { email: { contains: search, mode: 'insensitive' } },
                { name: { contains: search, mode: 'insensitive' } },
              ],
            }
          : {}),
        ...(planId ? { cloudPlanId: planId } : {}),
        ...(status ? { subscriptionStatus: status as any } : {}),
      },
      include: {
        cloudPlan: true,
        _count: { select: { cloudDeployments: true, cloudInvoices: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
  }

  async setUserPlan(userId: string, planId: string | null) {
    return this.prisma.user.update({
      where: { id: userId },
      data: {
        cloudPlanId: planId,
        subscriptionStatus: planId ? 'ACTIVE' : 'CANCELED',
      },
    });
  }

  async suspend(userId: string, reason: string) {
    return this.prisma.user.update({
      where: { id: userId },
      data: {
        suspendedAt: new Date(),
        suspendedReason: reason,
        isActive: false,
        subscriptionStatus: 'SUSPENDED',
      },
    });
  }
  async activate(userId: string) {
    return this.prisma.user.update({
      where: { id: userId },
      data: {
        suspendedAt: null,
        suspendedReason: null,
        isActive: true,
        subscriptionStatus: 'ACTIVE',
      },
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
    const base =
      user.trialEndsAt && user.trialEndsAt > new Date()
        ? user.trialEndsAt
        : new Date();
    return this.prisma.user.update({
      where: { id: userId },
      data: {
        trialEndsAt: new Date(base.getTime() + days * 86400000),
        subscriptionStatus: 'TRIALING',
      },
    });
  }

  async refund(invoiceId: string, partial?: number) {
    const inv = await this.prisma.cloudInvoice.findUnique({
      where: { id: invoiceId },
    });
    if (!inv) throw new NotFoundException();
    const isPartial = typeof partial === 'number' && partial > 0;
    return this.prisma.cloudInvoice.update({
      where: { id: invoiceId },
      data: {
        status: isPartial ? 'PAID' : 'REFUNDED',
        refundedAt: new Date(),
        metadata: {
          ...((inv.metadata as any) ?? {}),
          refund: { amount: partial ?? null, at: new Date().toISOString() },
        } as any,
      },
    });
  }

  async createUser(input: {
    email: string;
    name: string;
    password: string;
    role?: Role;
    planId?: string | null;
  }) {
    const existing = await this.prisma.user.findUnique({
      where: { email: input.email.toLowerCase() },
    });
    if (existing) throw new ConflictException('Email already in use');
    if (!input.password || input.password.length < 8)
      throw new BadRequestException('Password must be 8+ chars');
    const hashed = await bcrypt.hash(input.password, 12);
    return this.prisma.user.create({
      data: {
        email: input.email.toLowerCase(),
        name: input.name,
        password: hashed,
        role: input.role ?? 'USER',
        isActive: true,
        cloudPlanId: input.planId ?? null,
        subscriptionStatus: input.planId ? 'ACTIVE' : 'TRIALING',
      },
    });
  }

  async deleteUser(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException();
    await this.prisma.user.delete({ where: { id: userId } });
    return { ok: true };
  }

  async resetUserPassword(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException();
    return this.auth.forgotPassword(user.email);
  }

  async impersonate(adminId: string, userId: string) {
    if (adminId === userId)
      throw new BadRequestException('Cannot impersonate yourself');
    const [admin, user] = await Promise.all([
      this.prisma.user.findUnique({ where: { id: adminId } }),
      this.prisma.user.findUnique({ where: { id: userId } }),
    ]);
    if (!admin || !user) throw new NotFoundException();
    // Short-lived token (1h) carrying both the impersonated user and original admin.
    const access_token = this.jwt.sign(
      {
        email: user.email,
        sub: user.id,
        role: user.role,
        impersonatedBy: adminId,
        impersonatorEmail: admin.email,
      },
      { expiresIn: '1h' },
    );
    return {
      access_token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
      impersonatedBy: { id: admin.id, email: admin.email, name: admin.name },
    };
  }

  async changeRole(actorId: string, targetId: string, newRole: Role) {
    const actor = await this.prisma.user.findUnique({ where: { id: actorId } });
    if (!actor || actor.role !== 'SUPER_ADMIN') {
      throw new BadRequestException('Only SUPER_ADMIN can change roles');
    }
    const target = await this.prisma.user.findUnique({
      where: { id: targetId },
    });
    if (!target) throw new NotFoundException();
    if (target.id === actor.id)
      throw new BadRequestException('Cannot change your own role');
    const updated = await this.prisma.user.update({
      where: { id: targetId },
      data: { role: newRole },
    });
    return { id: updated.id, role: updated.role, previousRole: target.role };
  }

  transactions() {
    return this.prisma.cloudInvoice.findMany({
      orderBy: { createdAt: 'desc' },
      include: { user: { select: { id: true, email: true, name: true } } },
      take: 500,
    });
  }

  async transactionsCSV(): Promise<string> {
    const rows = await this.transactions();
    const header = [
      'number',
      'user_email',
      'user_name',
      'amount_usd',
      'amount_egp',
      'currency',
      'provider',
      'status',
      'description',
      'created_at',
      'paid_at',
    ];
    const esc = (v: any) => {
      if (v == null) return '';
      const s = String(v).replace(/"/g, '""');
      return /[",\n]/.test(s) ? `"${s}"` : s;
    };
    const lines = rows.map((r: any) =>
      [
        r.number,
        r.user?.email,
        r.user?.name,
        r.amountUSD ?? '',
        r.amountEGP ?? '',
        r.currency,
        r.provider ?? '',
        r.status,
        r.description ?? '',
        r.createdAt?.toISOString?.() ?? r.createdAt,
        r.paidAt?.toISOString?.() ?? r.paidAt ?? '',
      ]
        .map(esc)
        .join(','),
    );
    return [header.join(','), ...lines].join('\n');
  }

  broadcast(title: string, body: string, severity = 'info', audience = 'all') {
    return this.prisma.cloudAnnouncement.create({
      data: { title, body, severity, audience },
    });
  }
  announcements() {
    return this.prisma.cloudAnnouncement.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  /**
   * SUPER_ADMIN only — reset the canonical admin account password.
   * Default target is amer30004ever@hotmail.com unless `email` is provided.
   */
  async resetAdminPassword(
    newPassword: string,
    email = 'amer30004ever@hotmail.com',
  ) {
    if (!newPassword || newPassword.length < 8) {
      throw new BadRequestException('Password must be at least 8 characters');
    }
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) throw new NotFoundException(`Admin user ${email} not found`);
    const passwordHash = await bcrypt.hash(newPassword, 12);
    await this.prisma.user.update({
      where: { id: user.id },
      data: { password: passwordHash, mustChangePassword: false },
    });
    return { message: `Admin password reset successfully for ${email}` };
  }

  async getClusterNodes() {
    return this.prisma.user.findMany({
      where: { role: { in: ['ADMIN', 'SUPER_ADMIN'] as any } },
      select: { id: true, email: true, name: true, role: true },
    });
  }
}

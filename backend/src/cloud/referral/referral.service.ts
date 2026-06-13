import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { randomBytes } from 'crypto';

const COMMISSION_TYPE = (process.env.REFERRAL_COMMISSION_TYPE ?? 'PERCENTAGE').toUpperCase();
const COMMISSION_VALUE = Number(process.env.REFERRAL_COMMISSION_VALUE ?? 10);
const PAYOUT_MIN = Number(process.env.REFERRAL_PAYOUT_MINIMUM ?? 50);
const COOKIE_DAYS = Number(process.env.REFERRAL_COOKIE_DAYS ?? 30);

export interface PayoutMethod {
  type: 'FAWRY' | 'INSTAPAY' | 'BANK';
  destination: string;
}

@Injectable()
export class ReferralService {
  constructor(private prisma: PrismaService) {}

  private genCode(): string {
    return randomBytes(6).toString('base64url').slice(0, 8).toUpperCase();
  }

  /** Stable referral code per user, derived from a referral row or generated lazily. */
  async getReferralCode(userId: string): Promise<string> {
    // Use first existing referral row's code; otherwise generate one and remember by creating a sentinel
    const existing = await this.prisma.referral.findFirst({
      where: { referrerId: userId },
      orderBy: { createdAt: 'asc' },
      select: { code: true },
    });
    if (existing) return existing.code;
    // No referrals yet — derive deterministic 8-char code from userId so it's stable
    const code = Buffer.from(userId).toString('base64url').replace(/[^A-Z0-9]/gi, '').slice(0, 8).toUpperCase().padEnd(8, 'X');
    return code;
  }

  async getReferralStats(userId: string) {
    const code = await this.getReferralCode(userId);
    const referrals = await this.prisma.referral.findMany({
      where: { referrerId: userId },
      include: { earnings: true, referred: { select: { email: true, name: true } } },
      orderBy: { createdAt: 'desc' },
    });
    const signups = referrals.length;
    const conversions = referrals.filter((r) => r.status === 'CONVERTED' || r.status === 'PAID').length;
    let pending = 0, paid = 0;
    for (const r of referrals) {
      for (const e of r.earnings) {
        if (e.status === 'PAID') paid += e.amount; else pending += e.amount;
      }
    }
    const history = referrals.flatMap((r) => {
      const items: Array<{ date: string; event: string; amount: number }> = [
        { date: r.createdAt.toISOString(), event: `Signup: ${r.referred.email}`, amount: 0 },
      ];
      if (r.convertedAt) items.push({ date: r.convertedAt.toISOString(), event: `Conversion: ${r.referred.email}`, amount: 0 });
      for (const e of r.earnings) {
        items.push({
          date: e.createdAt.toISOString(),
          event: `${e.status === 'PAID' ? 'Paid' : 'Earned'}: ${e.description}`,
          amount: e.amount,
        });
      }
      return items;
    }).sort((a, b) => (a.date < b.date ? 1 : -1)).slice(0, 50);

    return {
      code,
      clicks: 0, // not tracked in DB yet
      signups,
      conversions,
      earnings: { pending: Math.round(pending * 100) / 100, paid: Math.round(paid * 100) / 100, total: Math.round((pending + paid) * 100) / 100 },
      history,
      config: { commissionType: COMMISSION_TYPE, commissionValue: COMMISSION_VALUE, payoutMinimum: PAYOUT_MIN, cookieDays: COOKIE_DAYS },
    };
  }

  /** Called at signup when the new user came in with a referral code. */
  async processReferral(referredUserId: string, code: string): Promise<void> {
    if (!code) return;
    const normalized = code.trim().toUpperCase();
    // Find a referrer: either an existing referral row with the same code, or a user whose derived code matches
    const existing = await this.prisma.referral.findFirst({ where: { code: normalized }, select: { referrerId: true } });
    let referrerId: string | null = existing?.referrerId ?? null;
    if (!referrerId) {
      const users = await this.prisma.user.findMany({ select: { id: true } });
      for (const u of users) {
        const derived = Buffer.from(u.id).toString('base64url').replace(/[^A-Z0-9]/gi, '').slice(0, 8).toUpperCase().padEnd(8, 'X');
        if (derived === normalized) { referrerId = u.id; break; }
      }
    }
    if (!referrerId || referrerId === referredUserId) return;
    await this.prisma.referral.upsert({
      where: { referredId: referredUserId },
      create: { referrerId, referredId: referredUserId, code: normalized, status: 'PENDING' },
      update: {},
    });
  }

  /** Mark referral converted and create earning when the referred user pays. */
  async convertReferral(referredId: string, amount: number): Promise<void> {
    const ref = await this.prisma.referral.findUnique({ where: { referredId } });
    if (!ref || ref.status !== 'PENDING') return;
    const commission = COMMISSION_TYPE === 'FIXED' ? COMMISSION_VALUE : (amount * COMMISSION_VALUE) / 100;
    await this.prisma.$transaction([
      this.prisma.referral.update({
        where: { id: ref.id },
        data: { status: 'CONVERTED', convertedAt: new Date() },
      }),
      this.prisma.referralEarning.create({
        data: {
          referralId: ref.id,
          amount: Math.round(commission * 100) / 100,
          currency: 'USD',
          description: `Commission on first payment ($${amount.toFixed(2)})`,
          status: 'PENDING',
        },
      }),
    ]);
  }

  async getPayoutMethod(userId: string): Promise<PayoutMethod | null> {
    const u = await this.prisma.user.findUnique({ where: { id: userId }, select: { referralPayoutMethod: true } });
    return (u?.referralPayoutMethod as unknown as PayoutMethod) ?? null;
  }

  async setPayoutMethod(userId: string, method: PayoutMethod): Promise<PayoutMethod> {
    if (!['FAWRY', 'INSTAPAY', 'BANK'].includes(method.type)) throw new BadRequestException('Invalid method');
    if (!method.destination?.trim()) throw new BadRequestException('Destination required');
    await this.prisma.user.update({
      where: { id: userId },
      data: { referralPayoutMethod: method as never },
    });
    return method;
  }

  async requestPayout(userId: string, amount: number, method: string) {
    const stats = await this.getReferralStats(userId);
    if (amount < PAYOUT_MIN) throw new BadRequestException(`Minimum payout is $${PAYOUT_MIN}`);
    if (amount > stats.earnings.pending) throw new BadRequestException('Insufficient pending earnings');
    const payoutMethod = await this.getPayoutMethod(userId);
    if (!payoutMethod) throw new BadRequestException('Set up a payout method first');
    if (method && payoutMethod.type !== method) throw new BadRequestException('Payout method mismatch');
    return this.prisma.referralPayoutRequest.create({
      data: {
        userId,
        amount,
        currency: 'USD',
        method: payoutMethod.type,
        destination: payoutMethod.destination,
        status: 'PENDING',
      },
    });
  }

  async listPayouts(userId: string) {
    return this.prisma.referralPayoutRequest.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }
}

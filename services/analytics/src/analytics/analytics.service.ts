import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  async usage() {
    const [vpsCount, users, conversations] = await Promise.all([
      this.prisma.cloudDeployment.count(),
      this.prisma.user.count(),
      this.prisma.conversation.count(),
    ]);
    return { vpsCount, users, conversations };
  }

  async revenue() {
    const paid = await this.prisma.cloudInvoice.aggregate({
      _sum: { amountUSD: true },
      where: { status: 'PAID' },
    });
    return { totalUSD: paid._sum.amountUSD ?? 0 };
  }

  async forecast() {
    const revenue = await this.revenue();
    return {
      nextMonthUSD: (revenue.totalUSD ?? 0) * 1.08,
      confidence: 0.75,
    };
  }

  vpsUsage() {
    return this.prisma.cloudDeployment.groupBy({
      by: ['status'],
      _count: { _all: true },
    });
  }

  whatsappUsage() {
    return this.prisma.message.groupBy({
      by: ['direction'],
      _count: { _all: true },
    });
  }

  async exportCsv() {
    const usage = await this.usage();
    const revenue = await this.revenue();
    return {
      csv: `metric,value\nvps,${usage.vpsCount}\nusers,${usage.users}\nrevenue,${revenue.totalUSD}`,
    };
  }
}

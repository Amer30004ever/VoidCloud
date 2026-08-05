import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Tier 9 — Organization-level billing consolidation.
 *
 * Rolls every member's invoices for a billing period into one org invoice so
 * enterprise customers receive a single monthly document.
 */
@Injectable()
export class ConsolidatedInvoiceService {
  private readonly logger = new Logger(ConsolidatedInvoiceService.name);

  constructor(private readonly prisma: PrismaService) {}

  static periodBounds(reference = new Date()) {
    const start = new Date(Date.UTC(reference.getUTCFullYear(), reference.getUTCMonth(), 1));
    const end = new Date(Date.UTC(reference.getUTCFullYear(), reference.getUTCMonth() + 1, 1));
    return { start, end };
  }

  /** Build (or refresh) the draft consolidated invoice for one organization. */
  async build(organizationId: string, reference = new Date(), taxRate = 0) {
    const org = await this.prisma.organization.findUnique({
      where: { id: organizationId },
      include: { members: true },
    });
    if (!org) throw new NotFoundException('Organization not found');

    const { start, end } = ConsolidatedInvoiceService.periodBounds(reference);
    const memberIds = Array.from(new Set([org.ownerId, ...org.members.map((m: any) => m.userId)]));

    const invoices = await this.prisma.cloudInvoice.findMany({
      where: {
        userId: { in: memberIds },
        createdAt: { gte: start, lt: end },
        status: { in: ['PENDING', 'PAID'] as any },
      },
    });

    const currency = invoices[0]?.currency ?? 'USD';
    const mixed = invoices.some((inv: any) => inv.currency !== currency);
    if (mixed) {
      throw new BadRequestException(
        'Organization invoices span multiple currencies; consolidate per currency',
      );
    }

    const subtotal = invoices.reduce(
      (sum: number, inv: any) => sum + (currency === 'EGP' ? inv.amountEGP ?? 0 : inv.amountUSD ?? 0),
      0,
    );
    const taxAmount = Math.round(subtotal * taxRate * 100) / 100;
    const total = Math.round((subtotal + taxAmount) * 100) / 100;

    const existing = await this.prisma.consolidatedInvoice.findFirst({
      where: { organizationId, periodStart: start },
    });
    if (existing && existing.status !== 'DRAFT') {
      throw new BadRequestException('Consolidated invoice for this period is already issued');
    }

    const data = {
      organizationId,
      periodStart: start,
      periodEnd: end,
      currency,
      subtotal: Math.round(subtotal * 100) / 100,
      taxAmount,
      total,
      memberCount: memberIds.length,
      invoiceIds: invoices.map((inv: any) => inv.id),
      status: 'DRAFT',
    };

    const record = existing
      ? await this.prisma.consolidatedInvoice.update({ where: { id: existing.id }, data })
      : await this.prisma.consolidatedInvoice.create({ data });

    this.logger.log(
      `Consolidated invoice ${record.id}: ${invoices.length} invoices, ${currency} ${total}`,
    );
    return record;
  }

  async issue(id: string) {
    const record = await this.prisma.consolidatedInvoice.findUnique({ where: { id } });
    if (!record) throw new NotFoundException('Consolidated invoice not found');
    if (record.status === 'ISSUED') return record;
    if (record.invoiceIds.length === 0) {
      throw new BadRequestException('Cannot issue an empty consolidated invoice');
    }
    return this.prisma.consolidatedInvoice.update({
      where: { id },
      data: { status: 'ISSUED', issuedAt: new Date() },
    });
  }

  async list(organizationId: string) {
    return this.prisma.consolidatedInvoice.findMany({
      where: { organizationId },
      orderBy: { periodStart: 'desc' },
      take: 24,
    });
  }

  async get(id: string) {
    const record = await this.prisma.consolidatedInvoice.findUnique({ where: { id } });
    if (!record) throw new NotFoundException('Consolidated invoice not found');
    const invoices = await this.prisma.cloudInvoice.findMany({
      where: { id: { in: record.invoiceIds } },
      orderBy: { createdAt: 'asc' },
    });
    return { ...record, lineItems: invoices };
  }
}

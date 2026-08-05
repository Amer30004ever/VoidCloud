import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Tier 9 — Egypt Tax Authority (ETA) e-invoicing.
 *
 * Builds an ETA v1.0 document from a VoidCloud invoice, submits it to the ETA
 * API and tracks acceptance. Credentials come from env; when they are absent
 * the service records the document in PENDING so nothing is lost.
 */
@Injectable()
export class EtaInvoiceService {
  private readonly logger = new Logger(EtaInvoiceService.name);

  constructor(private readonly prisma: PrismaService) {}

  private config() {
    return {
      clientId: process.env.ETA_CLIENT_ID || '',
      clientSecret: process.env.ETA_CLIENT_SECRET || '',
      idBase: process.env.ETA_ID_BASE_URL || 'https://id.preprod.eta.gov.eg',
      apiBase: process.env.ETA_API_BASE_URL || 'https://api.preprod.eta.gov.eg/api/v1',
      taxpayerRin: process.env.ETA_TAXPAYER_RIN || '',
      taxpayerName: process.env.ETA_TAXPAYER_NAME || 'Void Cloud',
      branchId: process.env.ETA_BRANCH_ID || '0',
      taxRate: Number(process.env.ETA_TAX_RATE ?? 14),
    };
  }

  isConfigured() {
    const cfg = this.config();
    return Boolean(cfg.clientId && cfg.clientSecret && cfg.taxpayerRin);
  }

  /** Build the ETA document payload for an invoice (pure, unit-testable). */
  buildDocument(invoice: any, cfg = this.config()) {
    const totalEGP = Number(invoice.amountEGP ?? 0);
    if (!totalEGP || totalEGP <= 0) {
      throw new BadRequestException('Invoice has no EGP amount; ETA requires EGP totals');
    }
    const net = Math.round((totalEGP / (1 + cfg.taxRate / 100)) * 100) / 100;
    const tax = Math.round((totalEGP - net) * 100) / 100;

    return {
      issuer: {
        type: 'B',
        id: cfg.taxpayerRin,
        name: cfg.taxpayerName,
        address: {
          branchId: cfg.branchId,
          country: 'EG',
          governate: process.env.ETA_GOVERNATE || 'Cairo',
          regionCity: process.env.ETA_CITY || 'Cairo',
          street: process.env.ETA_STREET || 'N/A',
          buildingNumber: process.env.ETA_BUILDING || '1',
        },
      },
      receiver: {
        type: 'P',
        id: invoice.metadata?.receiverId ?? undefined,
        name: invoice.metadata?.receiverName ?? 'Customer',
        address: { country: 'EG', governate: 'Cairo', regionCity: 'Cairo', street: 'N/A', buildingNumber: '1' },
      },
      documentType: 'I',
      documentTypeVersion: '1.0',
      dateTimeIssued: new Date(invoice.createdAt ?? Date.now()).toISOString(),
      taxpayerActivityCode: process.env.ETA_ACTIVITY_CODE || '6201',
      internalID: invoice.number,
      invoiceLines: [
        {
          description: invoice.description || 'Cloud services',
          itemType: 'GS1',
          itemCode: process.env.ETA_ITEM_CODE || '10000000',
          unitType: 'EA',
          quantity: 1,
          unitValue: { currencySold: 'EGP', amountEGP: net },
          salesTotal: net,
          total: totalEGP,
          netTotal: net,
          taxableItems: [
            { taxType: 'T1', subType: 'V009', amount: tax, rate: cfg.taxRate },
          ],
        },
      ],
      totalSalesAmount: net,
      netAmount: net,
      totalAmount: totalEGP,
      taxTotals: [{ taxType: 'T1', amount: tax }],
      extraDiscountAmount: 0,
      totalItemsDiscountAmount: 0,
    };
  }

  /** Create (or refresh) a PENDING submission record for an invoice. */
  async prepare(invoiceId: string) {
    const invoice = await this.prisma.cloudInvoice.findUnique({ where: { id: invoiceId } });
    if (!invoice) throw new NotFoundException('Invoice not found');

    const cfg = this.config();
    const document = this.buildDocument(invoice, cfg);
    const totalEGP = Number(invoice.amountEGP ?? 0);
    const taxEGP = document.taxTotals[0].amount;

    return this.prisma.etaInvoiceSubmission.upsert({
      where: { invoiceId },
      create: {
        invoiceId,
        internalId: invoice.number,
        totalEGP,
        taxEGP,
        documentJson: document as any,
      },
      update: { documentJson: document as any, totalEGP, taxEGP, status: 'PENDING', errorMessage: null },
    });
  }

  private async token(cfg = this.config()) {
    const res = await fetch(`${cfg.idBase}/connect/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: cfg.clientId,
        client_secret: cfg.clientSecret,
        scope: 'InvoicingAPI',
      }).toString(),
    });
    if (!res.ok) throw new Error(`ETA auth failed (${res.status})`);
    const json: any = await res.json();
    return json.access_token as string;
  }

  /** Submit a prepared document to the ETA API. */
  async submit(invoiceId: string) {
    const submission = await this.prepare(invoiceId);
    const cfg = this.config();
    if (!this.isConfigured()) {
      this.logger.warn('ETA credentials missing — submission left PENDING');
      return submission;
    }

    try {
      const accessToken = await this.token(cfg);
      const res = await fetch(`${cfg.apiBase}/documentsubmissions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ documents: [submission.documentJson] }),
      });
      const json: any = await res.json().catch(() => ({}));

      if (!res.ok || (json.rejectedDocuments?.length ?? 0) > 0) {
        const reason =
          json.rejectedDocuments?.[0]?.error?.message ?? json.message ?? `HTTP ${res.status}`;
        return this.prisma.etaInvoiceSubmission.update({
          where: { invoiceId },
          data: { status: 'REJECTED', errorMessage: String(reason).slice(0, 500) },
        });
      }

      const accepted = json.acceptedDocuments?.[0] ?? {};
      return this.prisma.etaInvoiceSubmission.update({
        where: { invoiceId },
        data: {
          status: 'SUBMITTED',
          submissionUid: json.submissionId ?? null,
          uuid: accepted.uuid ?? null,
          longId: accepted.longId ?? null,
          submittedAt: new Date(),
        },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'ETA submission failed';
      this.logger.error(`ETA submission failed for ${invoiceId}: ${message}`);
      return this.prisma.etaInvoiceSubmission.update({
        where: { invoiceId },
        data: { status: 'REJECTED', errorMessage: message.slice(0, 500) },
      });
    }
  }

  async markAccepted(invoiceId: string, uuid: string) {
    return this.prisma.etaInvoiceSubmission.update({
      where: { invoiceId },
      data: { status: 'ACCEPTED', uuid, acceptedAt: new Date() },
    });
  }

  async list(status?: string) {
    return this.prisma.etaInvoiceSubmission.findMany({
      where: status ? { status: status as any } : {},
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }
}

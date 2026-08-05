import { ConsolidatedInvoiceService } from '../../services/billing/src/billing/consolidated-invoice.service';
import { EtaInvoiceService } from '../../services/billing/src/billing/eta-invoice.service';

function prismaMock(overrides: any = {}) {
  return {
    organization: { findUnique: jest.fn() },
    cloudInvoice: { findMany: jest.fn().mockResolvedValue([]), findUnique: jest.fn() },
    consolidatedInvoice: {
      findFirst: jest.fn().mockResolvedValue(null),
      findUnique: jest.fn(),
      create: jest.fn().mockImplementation(({ data }: any) => ({ id: 'ci1', ...data })),
      update: jest.fn().mockImplementation(({ data }: any) => ({ id: 'ci1', ...data })),
      findMany: jest.fn().mockResolvedValue([]),
    },
    etaInvoiceSubmission: {
      upsert: jest.fn().mockImplementation(({ create }: any) => ({ id: 'eta1', ...create })),
      update: jest.fn().mockImplementation(({ data }: any) => ({ id: 'eta1', ...data })),
      findMany: jest.fn().mockResolvedValue([]),
    },
    ...overrides,
  } as any;
}

describe('Tier 9 — organization billing consolidation', () => {
  it('computes UTC month bounds', () => {
    const { start, end } = ConsolidatedInvoiceService.periodBounds(new Date('2026-03-17T10:00:00Z'));
    expect(start.toISOString()).toBe('2026-03-01T00:00:00.000Z');
    expect(end.toISOString()).toBe('2026-04-01T00:00:00.000Z');
  });

  it('sums member invoices and applies tax', async () => {
    const prisma = prismaMock();
    prisma.organization.findUnique.mockResolvedValue({
      id: 'org1',
      ownerId: 'owner',
      members: [{ userId: 'm1' }, { userId: 'm2' }],
    });
    prisma.cloudInvoice.findMany.mockResolvedValue([
      { id: 'i1', currency: 'USD', amountUSD: 100 },
      { id: 'i2', currency: 'USD', amountUSD: 49.5 },
    ]);
    const svc = new ConsolidatedInvoiceService(prisma);
    const result: any = await svc.build('org1', new Date('2026-03-17T00:00:00Z'), 0.14);
    expect(result.subtotal).toBe(149.5);
    expect(result.taxAmount).toBe(20.93);
    expect(result.total).toBe(170.43);
    expect(result.memberCount).toBe(3);
    expect(result.invoiceIds).toEqual(['i1', 'i2']);
  });

  it('refuses to mix currencies in one document', async () => {
    const prisma = prismaMock();
    prisma.organization.findUnique.mockResolvedValue({ id: 'org1', ownerId: 'owner', members: [] });
    prisma.cloudInvoice.findMany.mockResolvedValue([
      { id: 'i1', currency: 'USD', amountUSD: 10 },
      { id: 'i2', currency: 'EGP', amountEGP: 500 },
    ]);
    const svc = new ConsolidatedInvoiceService(prisma);
    await expect(svc.build('org1')).rejects.toThrow(/multiple currencies/);
  });

  it('will not rebuild an already issued period', async () => {
    const prisma = prismaMock();
    prisma.organization.findUnique.mockResolvedValue({ id: 'org1', ownerId: 'owner', members: [] });
    prisma.consolidatedInvoice.findFirst.mockResolvedValue({ id: 'ci1', status: 'ISSUED' });
    const svc = new ConsolidatedInvoiceService(prisma);
    await expect(svc.build('org1')).rejects.toThrow(/already issued/);
  });

  it('will not issue an empty invoice', async () => {
    const prisma = prismaMock();
    prisma.consolidatedInvoice.findUnique.mockResolvedValue({
      id: 'ci1',
      status: 'DRAFT',
      invoiceIds: [],
    });
    const svc = new ConsolidatedInvoiceService(prisma);
    await expect(svc.issue('ci1')).rejects.toThrow(/empty consolidated invoice/);
  });

  it('marks the invoice issued with a timestamp', async () => {
    const prisma = prismaMock();
    prisma.consolidatedInvoice.findUnique.mockResolvedValue({
      id: 'ci1',
      status: 'DRAFT',
      invoiceIds: ['i1'],
    });
    const svc = new ConsolidatedInvoiceService(prisma);
    const result: any = await svc.issue('ci1');
    expect(result.status).toBe('ISSUED');
    expect(result.issuedAt).toBeInstanceOf(Date);
  });
});

describe('Tier 9 — Egypt ETA e-invoicing', () => {
  const cfg = {
    clientId: 'cid',
    clientSecret: 'secret',
    idBase: 'https://id.test',
    apiBase: 'https://api.test/v1',
    taxpayerRin: '123456789',
    taxpayerName: 'Void Cloud',
    branchId: '0',
    taxRate: 14,
  };

  it('splits an EGP total into net and 14% VAT', () => {
    const svc = new EtaInvoiceService(prismaMock());
    const doc: any = svc.buildDocument(
      { number: 'VC-1001', description: 'VPS', amountEGP: 114, createdAt: '2026-03-01T00:00:00Z' },
      cfg,
    );
    expect(doc.netAmount).toBe(100);
    expect(doc.totalAmount).toBe(114);
    expect(doc.taxTotals[0].amount).toBe(14);
    expect(doc.invoiceLines[0].taxableItems[0].subType).toBe('V009');
    expect(doc.internalID).toBe('VC-1001');
    expect(doc.issuer.id).toBe('123456789');
  });

  it('rejects invoices with no EGP amount', () => {
    const svc = new EtaInvoiceService(prismaMock());
    expect(() => svc.buildDocument({ number: 'VC-1', amountUSD: 10 }, cfg)).toThrow(/EGP/);
  });

  it('reports unconfigured when credentials are missing', () => {
    const previous = { ...process.env };
    delete process.env.ETA_CLIENT_ID;
    delete process.env.ETA_CLIENT_SECRET;
    delete process.env.ETA_TAXPAYER_RIN;
    const svc = new EtaInvoiceService(prismaMock());
    expect(svc.isConfigured()).toBe(false);
    process.env = previous;
  });

  it('leaves the submission PENDING when credentials are absent', async () => {
    const previous = { ...process.env };
    delete process.env.ETA_CLIENT_ID;
    const prisma = prismaMock();
    prisma.cloudInvoice.findUnique.mockResolvedValue({
      id: 'inv1',
      number: 'VC-1001',
      amountEGP: 228,
      description: 'VPS',
      createdAt: new Date(),
      metadata: null,
    });
    const svc = new EtaInvoiceService(prisma);
    await svc.submit('inv1');
    const upsert = prisma.etaInvoiceSubmission.upsert.mock.calls[0][0];
    expect(upsert.create.status).toBe('PENDING');
    process.env = previous;
  });

  it('records a REJECTED status when ETA rejects the document', async () => {
    const previous = { ...process.env };
    process.env.ETA_CLIENT_ID = 'cid';
    process.env.ETA_CLIENT_SECRET = 'secret';
    process.env.ETA_TAXPAYER_RIN = '123456789';

    const prisma = prismaMock();
    prisma.cloudInvoice.findUnique.mockResolvedValue({
      id: 'inv1',
      number: 'VC-1001',
      amountEGP: 114,
      description: 'VPS',
      createdAt: new Date(),
      metadata: null,
    });
    const fetchMock = jest
      .fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ access_token: 't' }) })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ rejectedDocuments: [{ error: { message: 'Invalid RIN' } }] }),
      });
    (global as any).fetch = fetchMock;

    const svc = new EtaInvoiceService(prisma);
    const result: any = await svc.submit('inv1');
    expect(result.status).toBe('REJECTED');
    expect(result.errorMessage).toBe('Invalid RIN');
    process.env = previous;
  });

  it('records submission identifiers on success', async () => {
    const previous = { ...process.env };
    process.env.ETA_CLIENT_ID = 'cid';
    process.env.ETA_CLIENT_SECRET = 'secret';
    process.env.ETA_TAXPAYER_RIN = '123456789';

    const prisma = prismaMock();
    prisma.cloudInvoice.findUnique.mockResolvedValue({
      id: 'inv1',
      number: 'VC-1001',
      amountEGP: 114,
      description: 'VPS',
      createdAt: new Date(),
      metadata: null,
    });
    (global as any).fetch = jest
      .fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ access_token: 't' }) })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          submissionId: 'SUB-1',
          acceptedDocuments: [{ uuid: 'U1', longId: 'L1' }],
          rejectedDocuments: [],
        }),
      });

    const svc = new EtaInvoiceService(prisma);
    const result: any = await svc.submit('inv1');
    expect(result.status).toBe('SUBMITTED');
    expect(result.uuid).toBe('U1');
    expect(result.submissionUid).toBe('SUB-1');
    process.env = previous;
  });
});

import { CatalogService } from '../../services/tenant/src/catalog/catalog.service';
import { ResellerService } from '../../services/tenant/src/reseller/reseller.service';

function prismaMock(overrides: any = {}) {
  return {
    catalogApp: {
      findUnique: jest.fn().mockResolvedValue(null),
      findMany: jest.fn().mockResolvedValue([]),
      create: jest.fn().mockImplementation(({ data }: any) => ({ id: 'a1', ...data })),
      update: jest.fn().mockImplementation(({ data }: any) => ({ id: 'a1', ...data })),
    },
    catalogAppReview: {
      findUnique: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockResolvedValue({}),
      update: jest.fn().mockResolvedValue({}),
    },
    resellerBrand: {
      findFirst: jest.fn().mockResolvedValue(null),
      findUnique: jest.fn().mockResolvedValue(null),
      findMany: jest.fn().mockResolvedValue([]),
      create: jest.fn().mockImplementation(({ data }: any) => ({ id: 'b1', ...data })),
      update: jest.fn().mockImplementation(({ data }: any) => ({ id: 'b1', ...data })),
      delete: jest.fn().mockResolvedValue({}),
    },
    $transaction: jest.fn(),
    ...overrides,
  } as any;
}

describe('Tier 9 — community app catalog', () => {
  it('slugifies the submission name', async () => {
    const prisma = prismaMock();
    const svc = new CatalogService(prisma);
    await svc.submit('u1', 'Amer', { name: 'Ghost  CMS!', summary: 'Blogging' });
    expect(prisma.catalogApp.create.mock.calls[0][0].data.slug).toBe('ghost-cms');
  });

  it('requires a summary', async () => {
    const svc = new CatalogService(prismaMock());
    await expect(svc.submit('u1', 'Amer', { name: 'Ghost', summary: '' })).rejects.toThrow(/summary/);
  });

  it('rejects unknown categories', async () => {
    const svc = new CatalogService(prismaMock());
    await expect(
      svc.submit('u1', 'Amer', { name: 'Ghost', summary: 'Blog', category: 'crypto' }),
    ).rejects.toThrow(/Unknown category/);
  });

  it('starts submissions in the moderation queue', async () => {
    const prisma = prismaMock();
    const svc = new CatalogService(prisma);
    await svc.submit('u1', 'Amer', { name: 'Ghost', summary: 'Blog' });
    expect(prisma.catalogApp.create.mock.calls[0][0].data.status).toBe('PENDING_REVIEW');
  });

  it('hides non-approved apps from the public lookup', async () => {
    const prisma = prismaMock();
    prisma.catalogApp.findUnique.mockResolvedValue({ id: 'a1', slug: 'ghost', status: 'PENDING_REVIEW' });
    const svc = new CatalogService(prisma);
    await expect(svc.getBySlug('ghost')).rejects.toThrow(/not found/i);
  });

  it('publishes on approval and clears the publish date on rejection', async () => {
    const prisma = prismaMock();
    prisma.catalogApp.findUnique.mockResolvedValue({ id: 'a1', status: 'PENDING_REVIEW' });
    const svc = new CatalogService(prisma);

    const approved: any = await svc.review('admin', 'a1', true, 'looks good');
    expect(approved.status).toBe('APPROVED');
    expect(approved.publishedAt).toBeInstanceOf(Date);

    const rejected: any = await svc.review('admin', 'a1', false, 'unsafe compose');
    expect(rejected.status).toBe('REJECTED');
    expect(rejected.publishedAt).toBeNull();
  });

  it('blocks authors from rating their own app', async () => {
    const prisma = prismaMock();
    prisma.catalogApp.findUnique.mockResolvedValue({ id: 'a1', authorId: 'u1', status: 'APPROVED' });
    const svc = new CatalogService(prisma);
    await expect(svc.rate('u1', 'ghost', 5)).rejects.toThrow(/own app/);
  });

  it('validates the rating range', async () => {
    const prisma = prismaMock();
    prisma.catalogApp.findUnique.mockResolvedValue({ id: 'a1', authorId: 'other', status: 'APPROVED' });
    const svc = new CatalogService(prisma);
    await expect(svc.rate('u1', 'ghost', 9)).rejects.toThrow(/between 1 and 5/);
  });

  it('adjusts the aggregate when a user changes their rating', async () => {
    const prisma = prismaMock();
    prisma.catalogApp.findUnique.mockResolvedValue({ id: 'a1', authorId: 'other', status: 'APPROVED' });
    const tx = {
      catalogAppReview: {
        findUnique: jest.fn().mockResolvedValue({ id: 'r1', rating: 2 }),
        update: jest.fn(),
        create: jest.fn(),
      },
      catalogApp: {
        update: jest.fn(),
        findUnique: jest.fn().mockResolvedValue({ id: 'a1', ratingSum: 5, ratingCount: 1 }),
      },
    };
    prisma.$transaction.mockImplementation((fn: any) => fn(tx));

    const svc = new CatalogService(prisma);
    const result: any = await svc.rate('u1', 'ghost', 5);
    expect(tx.catalogApp.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { ratingSum: { increment: 3 } } }),
    );
    expect(result.rating).toBe(5);
  });

  it('only counts installs for approved apps', async () => {
    const prisma = prismaMock();
    prisma.catalogApp.findUnique.mockResolvedValue({ id: 'a1', status: 'REJECTED' });
    const svc = new CatalogService(prisma);
    await expect(svc.recordInstall('ghost')).rejects.toThrow(/not found/i);
  });
});

describe('Tier 9 — white-label reseller', () => {
  it('applies markup to list prices', () => {
    expect(ResellerService.applyMarkup(100, 20)).toBe(120);
    expect(ResellerService.applyMarkup(12.5, 15)).toBe(14.37);
    expect(ResellerService.applyMarkup(50, 0)).toBe(50);
  });

  it('derives a slug from the company name', async () => {
    const prisma = prismaMock();
    const svc = new ResellerService(prisma);
    await svc.create('u1', { companyName: 'Nile Hosting LLC' });
    expect(prisma.resellerBrand.create.mock.calls[0][0].data.slug).toBe('nile-hosting-llc');
  });

  it('validates the brand colour', async () => {
    const svc = new ResellerService(prismaMock());
    await expect(
      svc.create('u1', { companyName: 'Nile Hosting', primaryColor: 'blue' }),
    ).rejects.toThrow(/hex value/);
  });

  it('validates the custom domain', async () => {
    const svc = new ResellerService(prismaMock());
    await expect(
      svc.create('u1', { companyName: 'Nile Hosting', domain: 'not a domain' }),
    ).rejects.toThrow(/Invalid domain/);
  });

  it('caps the markup', async () => {
    const svc = new ResellerService(prismaMock());
    await expect(
      svc.create('u1', { companyName: 'Nile Hosting', markupPercent: 400 }),
    ).rejects.toThrow(/0-200/);
  });

  it('rejects a taken slug or domain', async () => {
    const prisma = prismaMock();
    prisma.resellerBrand.findFirst.mockResolvedValue({ id: 'existing' });
    const svc = new ResellerService(prisma);
    await expect(svc.create('u1', { companyName: 'Nile Hosting' })).rejects.toThrow(/already taken/);
  });

  it('blocks updates from non-owners', async () => {
    const prisma = prismaMock();
    prisma.resellerBrand.findUnique.mockResolvedValue({ id: 'b1', ownerId: 'owner' });
    const svc = new ResellerService(prisma);
    await expect(svc.update('intruder', 'b1', { companyName: 'Hijack' })).rejects.toThrow(
      /Not your brand/,
    );
  });

  it('resolves an active brand by domain and exposes no secrets', async () => {
    const prisma = prismaMock();
    prisma.resellerBrand.findFirst.mockResolvedValue({
      id: 'b1',
      ownerId: 'owner',
      slug: 'nile',
      companyName: 'Nile Hosting',
      domain: 'nile.example',
      logoUrl: null,
      primaryColor: '#123456',
      supportEmail: 'help@nile.example',
      markupPercent: 25,
    });
    const svc = new ResellerService(prisma);
    const brand: any = await svc.resolve('nile.example');
    expect(brand.companyName).toBe('Nile Hosting');
    expect(brand.markupPercent).toBeUndefined();
    expect(brand.ownerId).toBeUndefined();
  });

  it('prices a plan through an active brand', async () => {
    const prisma = prismaMock();
    prisma.resellerBrand.findUnique.mockResolvedValue({ slug: 'nile', active: true, markupPercent: 25 });
    const svc = new ResellerService(prisma);
    await expect(svc.priceFor('nile', 40)).resolves.toEqual({
      listPrice: 40,
      markupPercent: 25,
      resellerPrice: 50,
    });
  });
});

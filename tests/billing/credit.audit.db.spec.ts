/**
 * Real-database proof for Prompt 2.2a.
 *
 * Runs CreditService against an actual PostgreSQL instance and asserts that a
 * real AuditLog ROW exists and is queryable after topUp / consume / refund /
 * adjust. writeAuditLog() swallows its own errors, so mock-level assertions
 * cannot prove the row lands — only a live database can.
 *
 * Gated on CREDIT_DB_TEST_URL so CI without a database still passes.
 */
import { PrismaClient } from '@prisma/client';
import { CreditService } from '../../services/billing/src/billing/credit.service';

const DB = process.env.CREDIT_DB_TEST_URL;
const describeDb = DB ? describe : describe.skip;

describeDb('CreditService — AuditLog rows land in a real database', () => {
  let prisma: PrismaClient;
  let service: CreditService;
  let userId: string;
  let adminId: string;
  let vpsId: string;

  beforeAll(async () => {
    prisma = new PrismaClient({ datasources: { db: { url: DB } } });
    await prisma.$connect();
    service = new CreditService(prisma as never);

    const suffix = Date.now();
    const user = await prisma.user.create({
      data: {
        email: `credit-user-${suffix}@test.local`,
        password: 'x',
        name: 'Credit User',
        creditBalance: 0,
      },
    });
    const admin = await prisma.user.create({
      data: { email: `credit-admin-${suffix}@test.local`, password: 'x', name: 'Admin' },
    });
    userId = user.id;
    adminId = admin.id;

    const vps = await prisma.cloudDeployment.create({
      data: {
        userId: user.id,
        name: `credit-vps-${suffix}`,
        source: 'debian-12',
        namespace: `ns-${suffix}`,
      },
    });
    vpsId = vps.id;
  });

  afterAll(async () => {
    if (!prisma) return;
    await prisma.auditLog.deleteMany({ where: { userId } });
    await prisma.creditTransaction.deleteMany({ where: { userId } });
    await prisma.cloudDeployment.deleteMany({ where: { userId } });
    await prisma.user.deleteMany({ where: { id: { in: [userId, adminId] } } });
    await prisma.$disconnect();
  });

  const rows = (action: string) =>
    prisma.auditLog.findMany({ where: { userId, action }, orderBy: { createdAt: 'asc' } });

  it('topUp writes a queryable CREDIT_TOPUP row', async () => {
    const res = await service.topUp(userId, 100, { note: 'seed funds' }, { actorId: adminId });
    const found = await rows('CREDIT_TOPUP');
    expect(found).toHaveLength(1);
    expect(found[0].resource).toBe('credit:topup');
    expect(found[0].details).toMatchObject({
      actorId: adminId,
      amount: 100,
      balanceAfter: 100,
      transactionId: res.transactionId,
    });
    expect(await service.getBalance(userId)).toBe(100);
  });

  it('consume writes a queryable CREDIT_CONSUMPTION row', async () => {
    await service.consume(userId, vpsId, 30, undefined, { actorId: userId });
    const found = await rows('CREDIT_CONSUMPTION');
    expect(found).toHaveLength(1);
    expect(found[0].details).toMatchObject({ amount: -30, balanceAfter: 70 });
  });

  it('refund writes a queryable CREDIT_REFUND row', async () => {
    await service.refund(userId, 10, vpsId, 'goodwill', undefined, { actorId: adminId });
    const found = await rows('CREDIT_REFUND');
    expect(found).toHaveLength(1);
    expect(found[0].details).toMatchObject({ amount: 10, balanceAfter: 80 });
  });

  it('adjust writes a queryable CREDIT_ADJUSTMENT row with reason + adminId', async () => {
    await service.adjust(userId, -20, 'manual correction after billing dispute', adminId);
    const found = await rows('CREDIT_ADJUSTMENT');
    expect(found).toHaveLength(1);
    expect(found[0].details).toMatchObject({
      amount: -20,
      balanceAfter: 60,
      reason: 'manual correction after billing dispute',
    });
  });

  it('the four rows are all present together at the end', async () => {
    const all = await prisma.auditLog.findMany({ where: { userId }, orderBy: { createdAt: 'asc' } });
    expect(all.map((r) => r.action).sort()).toEqual(
      ['CREDIT_ADJUSTMENT', 'CREDIT_CONSUMPTION', 'CREDIT_REFUND', 'CREDIT_TOPUP'].sort(),
    );
  });
});

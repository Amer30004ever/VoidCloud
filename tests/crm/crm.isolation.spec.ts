/**
 * Prompt 3.2 — CRM IDOR regression.
 *
 * Every CRM endpoint that accepts a bare resource id (getCustomer,
 * updateCustomer, convertLead, updateDealStage, completeTask) must re-check
 * tenant ownership through the findOwned* pattern before touching the row.
 *
 * Tenant B drives each of them against Tenant A's rows. Every attempt must be
 * refused with a 404 (no existence oracle) AND must not mutate anything.
 */
import { NotFoundException } from '@nestjs/common';
import { CrmService } from '../../services/crm/src/crm/crm.service';

const A = 'user-A';
const B = 'user-B';

const CONTACT_A = { id: 'contact-A', userId: A, name: 'A Corp', email: 'a@a.test', phone: null };
const CONTACT_B = { id: 'contact-B', userId: B, name: 'B Corp', email: 'b@b.test', phone: null };
const LEAD_A = { id: 'lead-A', userId: A, name: 'A Lead', email: 'lead@a.test', phone: null, status: 'new' };
const DEAL_A = { id: 'deal-A', userId: A, stage: 'qualification' };
const TASK_A = { id: 'task-A', userId: A, status: 'open' };

function build() {
  const contacts = [CONTACT_A, CONTACT_B];
  const leads = [LEAD_A];
  const deals = [DEAL_A];
  const tasks = [TASK_A];

  const table = (rows: any[]) => ({
    findUnique: jest.fn(async ({ where }: any) => rows.find((r) => r.id === where.id) ?? null),
    findMany: jest.fn(async ({ where }: any) =>
      rows.filter((r) => !where || where.userId === undefined || r.userId === where.userId),
    ),
    create: jest.fn(async ({ data }: any) => ({ id: 'new', ...data })),
    update: jest.fn(async ({ where, data }: any) => ({ ...rows.find((r) => r.id === where.id), ...data })),
  });

  const prisma: any = {
    crmContact: table(contacts),
    crmLead: table(leads),
    crmDeal: table(deals),
    crmTask: table(tasks),
  };

  return { service: new CrmService(prisma), prisma };
}

const tenantB = { id: B, role: 'USER' as any };
const tenantA = { id: A, role: 'USER' as any };
const superAdmin = { id: 'root', role: 'SUPER_ADMIN' as any };

function assertNoMutation(prisma: any) {
  for (const key of ['crmContact', 'crmLead', 'crmDeal', 'crmTask']) {
    expect(prisma[key].update).not.toHaveBeenCalled();
    expect(prisma[key].create).not.toHaveBeenCalled();
  }
}

describe('CrmService — cross-tenant IDOR (Prompt 3.2)', () => {
  it('list endpoints are scoped to the caller', async () => {
    const { service } = build();
    const rows = await service.listCustomers(tenantB);
    expect(rows.map((r: any) => r.id)).toEqual(['contact-B']);
  });

  it('Tenant B cannot read Tenant A customer by id', async () => {
    const { service, prisma } = build();
    await expect(service.getCustomer('contact-A', tenantB)).rejects.toBeInstanceOf(NotFoundException);
    assertNoMutation(prisma);
  });

  it('Tenant B cannot update Tenant A customer', async () => {
    const { service, prisma } = build();
    await expect(
      service.updateCustomer('contact-A', { name: 'pwned' }, tenantB),
    ).rejects.toBeInstanceOf(NotFoundException);
    assertNoMutation(prisma);
  });

  it('Tenant B cannot convert Tenant A lead', async () => {
    const { service, prisma } = build();
    await expect(service.convertLead('lead-A', tenantB)).rejects.toBeInstanceOf(NotFoundException);
    assertNoMutation(prisma);
  });

  it('Tenant B cannot move Tenant A deal stage', async () => {
    const { service, prisma } = build();
    await expect(service.updateDealStage('deal-A', 'won', tenantB)).rejects.toBeInstanceOf(NotFoundException);
    assertNoMutation(prisma);
  });

  it('Tenant B cannot complete Tenant A task', async () => {
    const { service, prisma } = build();
    await expect(service.completeTask('task-A', tenantB)).rejects.toBeInstanceOf(NotFoundException);
    assertNoMutation(prisma);
  });

  it('refusals do not leak existence (same error for missing and foreign ids)', async () => {
    const { service } = build();
    const foreign = await service.getCustomer('contact-A', tenantB).catch((e) => e.message);
    const missing = await service.getCustomer('contact-ZZZ', tenantB).catch((e) => e.message);
    expect(foreign).toBe(missing);
  });

  it('the legitimate owner still succeeds', async () => {
    const { service, prisma } = build();
    await expect(service.getCustomer('contact-A', tenantA)).resolves.toMatchObject({ id: 'contact-A' });
    await service.updateCustomer('contact-A', { name: 'A Corp Ltd' }, tenantA);
    expect(prisma.crmContact.update).toHaveBeenCalled();
  });

  it('SUPER_ADMIN retains cross-tenant read for support duty', async () => {
    const { service } = build();
    await expect(service.getCustomer('contact-A', superAdmin)).resolves.toMatchObject({ id: 'contact-A' });
  });
});

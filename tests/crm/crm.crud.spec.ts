/**
 * CRM CRUD coverage for the seven tables added by
 * 20260818190000_crm_whatsapp_tables_and_name_alignment:
 *
 *   CrmLead, CrmContact, CrmCompany, CrmDeal, CrmActivity, CrmTask,
 *   WhatsappMessage
 *
 * Three properties are asserted for every entity:
 *   1. CRUD actually reaches the right Prisma model with the right shape.
 *   2. Reads and writes are tenant-scoped; a foreign id is a 404, not a 403,
 *      so the API is not an existence oracle.
 *   3. `userId` can never be driven from the request body (no tenant
 *      reassignment via mass assignment).
 */
import { NotFoundException } from '@nestjs/common';
import { CrmService } from '../../services/crm/src/crm/crm.service';

const A = 'user-A';
const B = 'user-B';

const tenantA = { id: A, role: 'ADMIN' as any };
const tenantB = { id: B, role: 'ADMIN' as any };
const superAdmin = { id: 'root', role: 'SUPER_ADMIN' as any };

function build() {
  const rows: Record<string, any[]> = {
    crmContact: [
      { id: 'contact-A', userId: A, name: 'A Corp' },
      { id: 'contact-B', userId: B, name: 'B Corp' },
    ],
    crmLead: [
      { id: 'lead-A', userId: A, name: 'A Lead', email: 'l@a.test', phone: null, status: 'new' },
      { id: 'lead-B', userId: B, name: 'B Lead', email: null, phone: null, status: 'new' },
    ],
    crmCompany: [
      { id: 'company-A', userId: A, name: 'Acme A' },
      { id: 'company-B', userId: B, name: 'Acme B' },
    ],
    crmDeal: [
      { id: 'deal-A', userId: A, title: 'A Deal', value: 100, stage: 'qualification' },
      { id: 'deal-B', userId: B, title: 'B Deal', value: 50, stage: 'proposal' },
    ],
    crmTask: [
      { id: 'task-A', userId: A, title: 'A Task', status: 'todo' },
      { id: 'task-B', userId: B, title: 'B Task', status: 'todo' },
    ],
    crmActivity: [
      { id: 'activity-A', userId: A, type: 'call', description: 'called A' },
      { id: 'activity-B', userId: B, type: 'note', description: 'noted B' },
    ],
    whatsappContact: [
      { id: 'wa-contact-A', userId: A, waId: '2010', name: 'WA A' },
      { id: 'wa-contact-B', userId: B, waId: '2020', name: 'WA B' },
    ],
    whatsappMessage: [
      { id: 'msg-A', contactId: 'wa-contact-A', direction: 'inbound', content: 'hi A' },
      { id: 'msg-B', contactId: 'wa-contact-B', direction: 'inbound', content: 'hi B' },
    ],
  };

  const matches = (row: any, where: any): boolean => {
    if (!where) return true;
    return Object.entries(where).every(([k, v]) => {
      if (v && typeof v === 'object' && !Array.isArray(v)) {
        // relation filter, e.g. { contact: { userId } }
        const related = resolveRelation(row, k);
        return related ? matches(related, v) : false;
      }
      return row[k] === v;
    });
  };

  const resolveRelation = (row: any, key: string) => {
    if (key === 'contact') return rows['whatsappContact'].find((c) => c.id === row.contactId);
    return row[key];
  };

  const table = (name: string) => ({
    findUnique: jest.fn(async ({ where, include }: any) => {
      const row = rows[name].find((r) => r.id === where.id) ?? null;
      if (row && include?.contact) {
        return { ...row, contact: resolveRelation(row, 'contact') ?? null };
      }
      return row;
    }),
    findMany: jest.fn(async ({ where, take, skip }: any) => {
      const found = rows[name].filter((r) => matches(r, where));
      return found.slice(skip ?? 0, (skip ?? 0) + (take ?? found.length));
    }),
    create: jest.fn(async ({ data }: any) => {
      const created = { id: `${name}-new`, ...data };
      rows[name].push(created);
      return created;
    }),
    update: jest.fn(async ({ where, data }: any) => {
      const row = rows[name].find((r) => r.id === where.id);
      Object.assign(row, data);
      return row;
    }),
    delete: jest.fn(async ({ where }: any) => {
      const i = rows[name].findIndex((r) => r.id === where.id);
      return rows[name].splice(i, 1)[0];
    }),
  });

  const prisma: any = {};
  for (const name of Object.keys(rows)) prisma[name] = table(name);
  return { service: new CrmService(prisma), prisma, rows };
}

/** (label, prisma model, list, create, get, update, delete, valid create body) */
const ENTITIES: Array<{
  label: string;
  model: string;
  ownIdA: string;
  ownIdB: string;
  list: (s: CrmService, u: any) => Promise<any>;
  create: (s: CrmService, u: any, body: any) => Promise<any>;
  get: (s: CrmService, id: string, u: any) => Promise<any>;
  update: (s: CrmService, id: string, body: any, u: any) => Promise<any>;
  remove: (s: CrmService, id: string, u: any) => Promise<any>;
  body: Record<string, unknown>;
  patch: Record<string, unknown>;
}> = [
  {
    label: 'CrmContact',
    model: 'crmContact',
    ownIdA: 'contact-A',
    ownIdB: 'contact-B',
    list: (s, u) => s.listCustomers(u),
    create: (s, u, b) => s.createCustomer(u, b),
    get: (s, id, u) => s.getCustomer(id, u),
    update: (s, id, b, u) => s.updateCustomer(id, b, u),
    remove: (s, id, u) => s.deleteCustomer(id, u),
    body: { name: 'New Contact', email: 'new@a.test' },
    patch: { name: 'Renamed Contact' },
  },
  {
    label: 'CrmLead',
    model: 'crmLead',
    ownIdA: 'lead-A',
    ownIdB: 'lead-B',
    list: (s, u) => s.listLeads(u),
    create: (s, u, b) => s.createLead(u, b),
    get: (s, id, u) => s.getLead(id, u),
    update: (s, id, b, u) => s.updateLead(id, b, u),
    remove: (s, id, u) => s.deleteLead(id, u),
    body: { name: 'New Lead', source: 'whatsapp' },
    patch: { status: 'qualified' },
  },
  {
    label: 'CrmCompany',
    model: 'crmCompany',
    ownIdA: 'company-A',
    ownIdB: 'company-B',
    list: (s, u) => s.listCompanies(u),
    create: (s, u, b) => s.createCompany(u, b),
    get: (s, id, u) => s.getCompany(id, u),
    update: (s, id, b, u) => s.updateCompany(id, b, u),
    remove: (s, id, u) => s.deleteCompany(id, u),
    body: { name: 'New Co', industry: 'hosting' },
    patch: { industry: 'cloud' },
  },
  {
    label: 'CrmDeal',
    model: 'crmDeal',
    ownIdA: 'deal-A',
    ownIdB: 'deal-B',
    list: (s, u) => s.listDeals(u),
    create: (s, u, b) => s.createDeal(u, b),
    get: (s, id, u) => s.getDeal(id, u),
    update: (s, id, b, u) => s.updateDeal(id, b, u),
    remove: (s, id, u) => s.deleteDeal(id, u),
    body: { title: 'New Deal', value: 500 },
    patch: { stage: 'negotiation' },
  },
  {
    label: 'CrmTask',
    model: 'crmTask',
    ownIdA: 'task-A',
    ownIdB: 'task-B',
    list: (s, u) => s.listTasks(u),
    create: (s, u, b) => s.createTask(u, b),
    get: (s, id, u) => s.getTask(id, u),
    update: (s, id, b, u) => s.updateTask(id, b, u),
    remove: (s, id, u) => s.deleteTask(id, u),
    body: { title: 'New Task', priority: 'high' },
    patch: { status: 'in_progress' },
  },
  {
    label: 'CrmActivity',
    model: 'crmActivity',
    ownIdA: 'activity-A',
    ownIdB: 'activity-B',
    list: (s, u) => s.listActivities(u),
    create: (s, u, b) => s.createActivity(u, b),
    get: (s, id, u) => s.getActivity(id, u),
    update: (s, id, b, u) => s.updateActivity(id, b, u),
    remove: (s, id, u) => s.deleteActivity(id, u),
    body: { type: 'call', description: 'dialled' },
    patch: { subject: 'Follow up' },
  },
];

describe.each(ENTITIES)('$label CRUD', (e) => {
  it('lists only the caller rows, and everything for SUPER_ADMIN', async () => {
    const { service } = build();
    const mine = await e.list(service, tenantA);
    expect(mine.map((r: any) => r.id)).toEqual([e.ownIdA]);

    const all = await e.list(service, superAdmin);
    expect(all.map((r: any) => r.id)).toEqual(expect.arrayContaining([e.ownIdA, e.ownIdB]));
  });

  it('creates against the correct model and stamps the caller userId', async () => {
    const { service, prisma } = build();
    const created = await e.create(service, tenantA, { ...e.body });
    expect(prisma[e.model].create).toHaveBeenCalledTimes(1);
    expect(created.userId).toBe(A);
    for (const [k, v] of Object.entries(e.body)) expect(created[k]).toEqual(v);
  });

  it('refuses a body that tries to set userId (no tenant reassignment)', async () => {
    const { service } = build();
    const { prisma } = build();
    const created = await e.create(service, tenantA, { ...e.body, userId: B, id: 'forced-id' });
    // The stamped userId wins and the caller-supplied id is dropped entirely.
    expect(created.userId).toBe(A);
    expect(created.id).not.toBe('forced-id');
    void prisma;
  });

  it('reads a row it owns', async () => {
    const { service } = build();
    await expect(e.get(service, e.ownIdA, tenantA)).resolves.toMatchObject({ id: e.ownIdA });
  });

  it('updates a row it owns', async () => {
    const { service, prisma } = build();
    const updated = await e.update(service, e.ownIdA, { ...e.patch }, tenantA);
    expect(prisma[e.model].update).toHaveBeenCalled();
    for (const [k, v] of Object.entries(e.patch)) expect(updated[k]).toEqual(v);
  });

  it('cannot move a row to another tenant through update', async () => {
    const { service, prisma } = build();
    await e.update(service, e.ownIdA, { ...e.patch, userId: B }, tenantA);
    const [{ data }] = prisma[e.model].update.mock.calls.map((c: any[]) => c[0]);
    expect(data).not.toHaveProperty('userId');
  });

  it('deletes a row it owns', async () => {
    const { service, prisma } = build();
    await expect(e.remove(service, e.ownIdA, tenantA)).resolves.toEqual({
      id: e.ownIdA,
      deleted: true,
    });
    expect(prisma[e.model].delete).toHaveBeenCalledWith({ where: { id: e.ownIdA } });
  });

  it('404s on read/update/delete of another tenant row, and does not mutate', async () => {
    const { service, prisma } = build();
    await expect(e.get(service, e.ownIdB, tenantA)).rejects.toBeInstanceOf(NotFoundException);
    await expect(e.update(service, e.ownIdB, e.patch, tenantA)).rejects.toBeInstanceOf(
      NotFoundException,
    );
    await expect(e.remove(service, e.ownIdB, tenantA)).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma[e.model].update).not.toHaveBeenCalled();
    expect(prisma[e.model].delete).not.toHaveBeenCalled();
  });

  it('404s on an id that does not exist at all (same shape as a foreign id)', async () => {
    const { service } = build();
    await expect(e.get(service, 'no-such-id', tenantA)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('SUPER_ADMIN may read across tenants', async () => {
    const { service } = build();
    await expect(e.get(service, e.ownIdB, superAdmin)).resolves.toMatchObject({ id: e.ownIdB });
  });
});

describe('CrmActivity — lead linkage is ownership checked', () => {
  it('rejects attaching an activity to another tenant lead', async () => {
    const { service, prisma } = build();
    await expect(
      service.createActivity(tenantA, {
        type: 'note',
        description: 'sneaky',
        leadId: 'lead-B',
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.crmActivity.create).not.toHaveBeenCalled();
  });

  it('allows attaching to the caller own lead', async () => {
    const { service } = build();
    const created = await service.createActivity(tenantA, {
      type: 'note',
      description: 'ok',
      leadId: 'lead-A',
    });
    expect(created).toMatchObject({ leadId: 'lead-A', userId: A });
  });
});

describe('WhatsappMessage CRUD — ownership is transitive through the contact', () => {
  it('lists only messages whose contact belongs to the caller', async () => {
    const { service, prisma } = build();
    const mine = await service.listMessages(tenantA);
    expect(mine.map((m: any) => m.id)).toEqual(['msg-A']);
    expect(prisma.whatsappMessage.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { contact: { userId: A } } }),
    );
  });

  it('SUPER_ADMIN sees messages across tenants', async () => {
    const { service } = build();
    const all = await service.listMessages(superAdmin);
    expect(all.map((m: any) => m.id)).toEqual(expect.arrayContaining(['msg-A', 'msg-B']));
  });

  it('creates a message on an owned contact and defaults the timestamp', async () => {
    const { service } = build();
    const created = await service.createMessage(tenantA, {
      contactId: 'wa-contact-A',
      waMessageId: 'wamid.1',
      direction: 'outbound',
      content: 'hello',
    });
    expect(created).toMatchObject({ contactId: 'wa-contact-A', direction: 'outbound' });
    expect(created.timestamp).toBeInstanceOf(Date);
  });

  it('refuses to create a message on another tenant contact', async () => {
    const { service, prisma } = build();
    await expect(
      service.createMessage(tenantA, {
        contactId: 'wa-contact-B',
        waMessageId: 'wamid.2',
        direction: 'outbound',
        content: 'leak',
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.whatsappMessage.create).not.toHaveBeenCalled();
  });

  it('reads, updates and deletes an owned message', async () => {
    const { service, prisma } = build();
    await expect(service.getMessage('msg-A', tenantA)).resolves.toMatchObject({ id: 'msg-A' });
    await service.updateMessage('msg-A', { status: 'read' }, tenantA);
    expect(prisma.whatsappMessage.update).toHaveBeenCalledWith({
      where: { id: 'msg-A' },
      data: { status: 'read' },
    });
    await expect(service.deleteMessage('msg-A', tenantA)).resolves.toEqual({
      id: 'msg-A',
      deleted: true,
    });
  });

  it('never lets update rewrite contactId or waMessageId (re-parenting)', async () => {
    const { service, prisma } = build();
    await service.updateMessage(
      'msg-A',
      { status: 'read', contactId: 'wa-contact-B', waMessageId: 'spoof' },
      tenantA,
    );
    const [{ data }] = prisma.whatsappMessage.update.mock.calls.map((c: any[]) => c[0]);
    expect(data).not.toHaveProperty('contactId');
    expect(data).not.toHaveProperty('waMessageId');
  });

  it('404s on another tenant message for read/update/delete', async () => {
    const { service, prisma } = build();
    await expect(service.getMessage('msg-B', tenantA)).rejects.toBeInstanceOf(NotFoundException);
    await expect(service.updateMessage('msg-B', { status: 'read' }, tenantA)).rejects.toBeInstanceOf(
      NotFoundException,
    );
    await expect(service.deleteMessage('msg-B', tenantA)).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.whatsappMessage.update).not.toHaveBeenCalled();
    expect(prisma.whatsappMessage.delete).not.toHaveBeenCalled();
  });

  it('scopes the per-contact thread by contact ownership', async () => {
    const { service } = build();
    await expect(
      service.listMessagesForContact('wa-contact-A', tenantA),
    ).resolves.toHaveLength(1);
    await expect(
      service.listMessagesForContact('wa-contact-B', tenantA),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});

describe('Pagination', () => {
  it('applies take/skip and defaults to 50', async () => {
    const { service, prisma } = build();
    await service.listLeads(superAdmin, { take: 1, skip: 1 });
    expect(prisma.crmLead.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 1, skip: 1 }),
    );

    await service.listLeads(superAdmin);
    expect(prisma.crmLead.findMany).toHaveBeenLastCalledWith(
      expect.objectContaining({ take: 50, skip: 0 }),
    );
  });
});

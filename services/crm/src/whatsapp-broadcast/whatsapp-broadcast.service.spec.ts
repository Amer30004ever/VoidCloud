import { WhatsappBroadcastService } from './whatsapp-broadcast.service';
import { ClientProxyFactory } from '@nestjs/microservices';

jest.mock('@nestjs/microservices', () => {
  const original = jest.requireActual('@nestjs/microservices');
  return {
    ...original,
    ClientProxyFactory: {
      create: jest.fn(() => ({
        connect: jest.fn().mockResolvedValue(undefined),
        emit: jest.fn().mockResolvedValue(undefined),
        close: jest.fn().mockResolvedValue(undefined),
      })),
    },
  };
});

beforeEach(() => {
  jest.clearAllMocks();
});

function makePrisma(overrides: any = {}) {
  const templates: any[] = [];
  const broadcasts: any[] = [];
  const recipients: any[] = [];
  const users: any[] = [
    { id: 'u1', email: 'a@test.com', name: 'Alice', cloudPlanId: 'p1', lastLoginAt: new Date(), createdAt: new Date(), whatsappContacts: [{ phone: '+201111111111' }] },
    { id: 'u2', email: 'b@test.com', name: 'Bob', cloudPlanId: 'p2', lastLoginAt: new Date(Date.now() - 2 * 86400000), createdAt: new Date(), whatsappContacts: [{ phone: '+202222222222' }] },
    { id: 'u3', email: 'c@test.com', name: 'Charlie', cloudPlanId: 'p1', lastLoginAt: new Date(Date.now() - 40 * 86400000), createdAt: new Date(Date.now() - 40 * 86400000), whatsappContacts: [{ phone: '+203333333333' }] },
  ];
  const byId = new Map<string, any>();
  const templatesById = new Map<string, any>();
  const broadcastsById = new Map<string, any>();
  const recipientsByBroadcast = new Map<string, any[]>();

  const base = {
    whatsappTemplate: {
      create: async (a: any) => {
        const row = { id: `tpl_${templates.length + 1}`, ...a.data };
        templates.push(row);
        templatesById.set(row.id, row);
        return row;
      },
      findFirst: async (q: any) => {
        if (q.where.id) return templatesById.get(q.where.id) ?? null;
        return templates.find((x) => x.createdBy === q.where.createdBy) ?? null;
      },
      findMany: async (q: any) => {
        let result = templates;
        if (q.where.OR) {
          result = templates.filter((t) => q.where.OR.some((c: any) => (c.createdBy && t.createdBy === c.createdBy) || (c.tenantId && t.tenantId === c.tenantId)));
        }
        return result;
      },
      update: async (a: any) => {
        const t = templatesById.get(a.where.id);
        Object.assign(t, a.data);
        return t;
      },
      delete: async (a: any) => {
        const idx = templates.findIndex((x) => x.id === a.where.id);
        templates.splice(idx, 1);
        return templatesById.get(a.where.id);
      },
    },
    whatsappBroadcast: {
      create: async (a: any) => {
        const row = { id: `bc_${broadcasts.length + 1}`, ...a.data, sentCount: 0, deliveredCount: 0, failedCount: 0 };
        broadcasts.push(row);
        broadcastsById.set(row.id, row);
        return row;
      },
      findFirst: async (q: any) => broadcastsById.get(q.where.id) ?? null,
      findUnique: async (q: any) => broadcastsById.get(q.where.id) ?? null,
      findMany: async (q: any) => {
        let result = broadcasts;
        if (q.where.createdBy) result = result.filter((b) => b.createdBy === q.where.createdBy);
        if (q.orderBy?.createdAt === 'desc') result = [...result].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        if (q.take) result = result.slice(0, q.take);
        return result;
      },
      update: async (a: any) => {
        const b = broadcastsById.get(a.where.id);
        Object.assign(b, a.data);
        return b;
      },
    },
    whatsappBroadcastRecipient: {
      createMany: async (a: any) => {
        for (const r of a.data) {
          const row = { id: `rec_${recipients.length + 1}`, ...r };
          recipients.push(row);
          const list = recipientsByBroadcast.get(r.broadcastId) || [];
          list.push(row);
          recipientsByBroadcast.set(r.broadcastId, list);
        }
        return { count: a.data.length };
      },
      findMany: async (q: any) => {
        const list = recipientsByBroadcast.get(q.where.broadcastId) || [];
        if (q.orderBy?.createdAt === 'desc') return [...list].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        return list;
      },
      update: async (a: any) => {
        const r = recipients.find((x) => x.id === a.where.id);
        Object.assign(r, a.data);
        return r;
      },
    },
    user: {
      findMany: async (q: any) => {
        let result = users;
        if (q.where.cloudPlanId) result = result.filter((u) => u.cloudPlanId === q.where.cloudPlanId);
        if (q.where.lastLoginAt?.gte) result = result.filter((u) => new Date(u.lastLoginAt) >= new Date(q.where.lastLoginAt.gte));
        if (q.where.createdAt?.gte) result = result.filter((u) => new Date(u.createdAt) >= new Date(q.where.createdAt.gte));
        if (q.where.createdAt?.lte) result = result.filter((u) => new Date(u.createdAt) <= new Date(q.where.createdAt.lte));
        if (q.include?.whatsappContacts) {
          return result.map((u) => ({ ...u, whatsappContacts: u.whatsappContacts || [] }));
        }
        return result;
      },
    },
  };

  const merged = { ...base, ...overrides };
  (merged as any).__state = { templates, broadcasts, recipients, users, templatesById, broadcastsById, recipientsByBroadcast };
  return merged;
}

describe('WhatsappBroadcastService — Prompt 2.5', () => {
  describe('templates', () => {
    it('creates a template', async () => {
      const prisma = makePrisma();
      const svc = new WhatsappBroadcastService(prisma as any);
      const tpl = await svc.createTemplate('admin1', { name: 'welcome', body: 'Hi {{firstName}}' });
      expect(tpl.name).toBe('welcome');
      expect(tpl.body).toBe('Hi {{firstName}}');
    });

    it('lists templates for the creator', async () => {
      const prisma = makePrisma();
      const svc = new WhatsappBroadcastService(prisma as any);
      await svc.createTemplate('admin1', { name: 't1', body: 'b1' });
      const list = await svc.listTemplates('admin1');
      expect(list.length).toBe(1);
    });
  });

  describe('segment resolution', () => {
    it('resolves recipients by plan type', async () => {
      const prisma = makePrisma();
      const svc = new WhatsappBroadcastService(prisma as any);
      await svc.createTemplate('admin1', { name: 'plan-blast', body: 'Hello' });
      const bc = await svc.sendBroadcast('admin1', undefined, { templateId: 'tpl_1', planId: 'p1', segment: 'by_plan' });
      const recs = await prisma.whatsappBroadcastRecipient.findMany({ where: { broadcastId: bc.id } });
      const phones = recs.map((r: any) => r.phone);
      expect(phones).toContain('+201111111111');
      expect(phones).toContain('+203333333333');
      expect(phones).not.toContain('+202222222222');
    });

    it('resolves recipients by activity level', async () => {
      const prisma = makePrisma();
      const svc = new WhatsappBroadcastService(prisma as any);
      await svc.createTemplate('admin1', { name: 'active-blast', body: 'Hey' });
      const bc = await svc.sendBroadcast('admin1', undefined, { templateId: 'tpl_1', activeWithinDays: 30, segment: 'by_activity' });
      const recs = await prisma.whatsappBroadcastRecipient.findMany({ where: { broadcastId: bc.id } });
      const phones = recs.map((r: any) => r.phone);
      expect(phones).toContain('+201111111111');
      expect(phones).toContain('+202222222222');
      expect(phones).not.toContain('+203333333333');
    });

    it('resolves recipients by signup date range', async () => {
      const prisma = makePrisma();
      const svc = new WhatsappBroadcastService(prisma as any);
      await svc.createTemplate('admin1', { name: 'new-users', body: 'Yo' });
      const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0];
      const future = new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0];
      const bc = await svc.sendBroadcast('admin1', undefined, { templateId: 'tpl_1', signupAfter: thirtyDaysAgo, signupBefore: future, segment: 'by_signup' });
      const recs = await prisma.whatsappBroadcastRecipient.findMany({ where: { broadcastId: bc.id } });
      const phones = recs.map((r: any) => r.phone);
      expect(phones).toContain('+201111111111');
      expect(phones).toContain('+202222222222');
      expect(phones).not.toContain('+203333333333');
    });

    it('falls back to manual phones when no segment filters are provided', async () => {
      const prisma = makePrisma();
      const svc = new WhatsappBroadcastService(prisma as any);
      await svc.createTemplate('admin1', { name: 'manual', body: 'Hi' });
      const bc = await svc.sendBroadcast('admin1', undefined, { templateId: 'tpl_1', recipientPhones: ['+209999999999'], segment: 'all' });
      expect(bc.metadata.recipientPhones).toEqual(['+209999999999']);
    });
  });

  describe('broadcast listing and details', () => {
    it('lists broadcasts for a user', async () => {
      const prisma = makePrisma();
      const svc = new WhatsappBroadcastService(prisma as any);
      await svc.createTemplate('admin1', { name: 'list-test', body: 'Hi' });
      await svc.sendBroadcast('admin1', undefined, { templateId: 'tpl_1', recipientPhones: ['+209999999999'] });
      const list = await svc.listBroadcasts('admin1');
      expect(list.length).toBe(1);
    });

    it('returns 404 for broadcast owned by another user', async () => {
      const prisma = makePrisma();
      const svc = new WhatsappBroadcastService(prisma as any);
      await expect(svc.getBroadcast('bc_1', 'other')).rejects.toThrow('Broadcast not found');
    });
  });
});

import { WhatsappBroadcastConsumer } from './whatsapp-broadcast.consumer';

function makePrisma(overrides: any = {}) {
  const broadcasts: any[] = [];
  const recipients: any[] = [];
  const byId = new Map<string, any>();
  const recsByBroadcast = new Map<string, any[]>();

  const base = {
    whatsappBroadcast: {
      update: async (a: any) => {
        const b = byId.get(a.where.id);
        if (!b) throw new Error('broadcast not found');
        const data = { ...a.data };
        if (typeof data.sentCount === 'object' && data.sentCount?.increment) {
          data.sentCount = (b.sentCount || 0) + data.sentCount.increment;
        }
        if (typeof data.failedCount === 'object' && data.failedCount?.increment) {
          data.failedCount = (b.failedCount || 0) + data.failedCount.increment;
        }
        Object.assign(b, data);
        return b;
      },
      findUnique: async (a: any) => byId.get(a.where.id) ?? null,
    },
    whatsappBroadcastRecipient: {
      update: async (a: any) => {
        const r = recipients.find((x) => x.id === a.where.id);
        Object.assign(r, a.data);
        return r;
      },
    },
  };

  function initBroadcast(id: string, recipientCount: number) {
    const b = { id, status: 'PENDING', sentCount: 0, deliveredCount: 0, failedCount: 0 };
    broadcasts.push(b);
    byId.set(id, b);
    const list: any[] = [];
    for (let i = 0; i < recipientCount; i++) {
      const r = { id: `rec_${i + 1}`, phone: `+20100000000${i}`, name: i === 0 ? 'Alice Smith' : i === 1 ? 'Bob' : undefined, status: 'PENDING', error: null, sentAt: null, deliveredAt: null };
      recipients.push(r);
      list.push(r);
    }
    recsByBroadcast.set(id, list);
    return b;
  }

  function getRecipients(broadcastId: string) {
    return recsByBroadcast.get(broadcastId) || [];
  }

  const merged = { ...base, ...overrides };
  (merged as any).__state = { broadcasts, recipients, byId, recsByBroadcast, initBroadcast, getRecipients };
  return merged;
}

describe('WhatsappBroadcastConsumer — Prompt 2.5', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('rate-limit enforcement', () => {
    it('does not send faster than the configured interval', async () => {
      const prisma = makePrisma();
      const consumer = new WhatsappBroadcastConsumer(prisma as any);
      const state = (prisma as any).__state;
      state.initBroadcast('bc_1', 3);

      const sendTimes: number[] = [];
      (consumer as any).sendWhatsApp = async () => {
        sendTimes.push(Date.now());
        return Promise.resolve();
      };

      const promise = consumer.onBroadcast({
        broadcastId: 'bc_1',
        templateBody: 'Hello',
        recipients: state.getRecipients('bc_1'),
      });

      await jest.advanceTimersByTimeAsync(6000);
      await promise;

      expect(sendTimes.length).toBe(3);
      expect(sendTimes[1] - sendTimes[0]).toBeGreaterThanOrEqual(1900);
      expect(sendTimes[2] - sendTimes[1]).toBeGreaterThanOrEqual(1900);
    });
  });

  describe('per-recipient status transitions', () => {
    it('records SENT on successful delivery', async () => {
      const prisma = makePrisma();
      const consumer = new WhatsappBroadcastConsumer(prisma as any);
      const state = (prisma as any).__state;
      state.initBroadcast('bc_success', 1);
      (consumer as any).sendWhatsApp = async () => Promise.resolve();

      const promise = consumer.onBroadcast({
        broadcastId: 'bc_success',
        templateBody: 'Hi',
        recipients: state.getRecipients('bc_success'),
      });
      await jest.advanceTimersByTimeAsync(3000);
      await promise;

      const rec = state.getRecipients('bc_success')[0];
      expect(rec.status).toBe('SENT');
      expect(rec.sentAt).toBeInstanceOf(Date);
    });

    it('records FAILED on OpenWA error', async () => {
      const prisma = makePrisma();
      const consumer = new WhatsappBroadcastConsumer(prisma as any);
      const state = (prisma as any).__state;
      state.initBroadcast('bc_fail', 1);
      (consumer as any).sendWhatsApp = async () => Promise.reject(new Error('OpenWA down'));

      const promise = consumer.onBroadcast({
        broadcastId: 'bc_fail',
        templateBody: 'Hi',
        recipients: state.getRecipients('bc_fail'),
      });
      await jest.advanceTimersByTimeAsync(3000);
      await promise;

      const rec = state.getRecipients('bc_fail')[0];
      expect(rec.status).toBe('FAILED');
      expect(rec.error).toBe('OpenWA down');
    });
  });

  describe('broadcast counter rollup', () => {
    it('reconciles sent/failed counts against recipient records', async () => {
      const prisma = makePrisma();
      const consumer = new WhatsappBroadcastConsumer(prisma as any);
      const state = (prisma as any).__state;
      state.initBroadcast('bc_rollup', 3);
      let call = 0;
      (consumer as any).sendWhatsApp = async () => {
        call++;
        if (call === 2) return Promise.reject(new Error('fail'));
        return Promise.resolve();
      };

      const promise = consumer.onBroadcast({
        broadcastId: 'bc_rollup',
        templateBody: 'Hi',
        recipients: state.getRecipients('bc_rollup'),
      });
      await jest.advanceTimersByTimeAsync(8000);
      await promise;

      const bc = state.byId.get('bc_rollup');
      expect(bc.sentCount).toBe(2);
      expect(bc.failedCount).toBe(1);
      const statuses = state.getRecipients('bc_rollup').map((r: any) => r.status);
      expect(statuses).toEqual(['SENT', 'FAILED', 'SENT']);
    });
  });

  describe('template variable substitution', () => {
    it('renders each recipient with their own name', async () => {
      const prisma = makePrisma();
      const consumer = new WhatsappBroadcastConsumer(prisma as any);
      const state = (prisma as any).__state;
      state.initBroadcast('bc_vars', 2);
      const sentMessages: string[] = [];
      (consumer as any).sendWhatsApp = async (_phone: string, message: string) => {
        sentMessages.push(message);
        return Promise.resolve();
      };

      const promise = consumer.onBroadcast({
        broadcastId: 'bc_vars',
        templateBody: 'Hello {{firstName}}, welcome {{name}}!',
        recipients: state.getRecipients('bc_vars'),
      });
      await jest.advanceTimersByTimeAsync(5000);
      await promise;

      expect(sentMessages[0]).toBe('Hello Alice, welcome Alice Smith!');
      expect(sentMessages[1]).toBe('Hello Bob, welcome Bob!');
    });

    it('leaves empty strings for recipients with no name', async () => {
      const prisma = makePrisma();
      const consumer = new WhatsappBroadcastConsumer(prisma as any);
      const state = (prisma as any).__state;
      state.initBroadcast('bc_noname', 1);
      const recs = state.getRecipients('bc_noname');
      recs[0].name = undefined;
      const sentMessages: string[] = [];
      (consumer as any).sendWhatsApp = async (_phone: string, message: string) => {
        sentMessages.push(message);
        return Promise.resolve();
      };

      const promise = consumer.onBroadcast({
        broadcastId: 'bc_noname',
        templateBody: 'Hey {{firstName}} {{name}}',
        recipients: recs,
      });
      await jest.advanceTimersByTimeAsync(3000);
      await promise;

      expect(sentMessages[0]).toBe('Hey  ');
    });
  });
}

import { WebhooksService, WebhookDeliveryResult } from './webhooks.service';
import { SsrfValidationError, type DnsLookup } from '../common/ssrf/url-validator';

type MockPrisma = {
  webhookEndpoint: {
    findMany: jest.Mock;
    create: jest.Mock;
    findUnique: jest.Mock;
    update: jest.Mock;
    delete: jest.Mock;
  };
  webhookDelivery: { create: jest.Mock };
};

function makePrisma(over: Partial<MockPrisma['webhookEndpoint']> = {}): MockPrisma {
  return {
    webhookEndpoint: {
      findMany: jest.fn().mockResolvedValue([]),
      create: jest.fn().mockResolvedValue({ id: 'wh_1', url: 'https://hooks.example.com/hook' }),
      findUnique: jest.fn(),
      update: jest.fn().mockResolvedValue({ id: 'wh_1' }),
      delete: jest.fn().mockResolvedValue({ id: 'wh_1' }),
      ...over,
    },
    webhookDelivery: { create: jest.fn().mockResolvedValue({ id: 'dl_1' }) },
  } as unknown as MockPrisma;
}

const publicLookup: DnsLookup = async () => [{ address: '93.184.216.34', family: 4 }];
const privateLookup: DnsLookup = async () => [{ address: '10.0.0.5', family: 4 }];

function fakeHttp(pinnedTo: string, status = 200) {
  const request = jest.fn((_opts: any, cb: any) => {
    expect(_opts.host).toBe(pinnedTo);
    const res = { statusCode: status, on: (e: string, h: any) => (e === 'end' ? h() : undefined) };
    const req = {
      on: jest.fn(),
      write: jest.fn(),
      end: jest.fn(() => cb(res)),
      destroy: jest.fn(),
    };
    return req;
  });
  return { request };
}

jest.mock('node:https', () => ({ request: (...a: any[]) => (globalThis as any).__https.request(...a) }));
jest.mock('node:http', () => ({ request: (...a: any[]) => (globalThis as any).__http.request(...a) }));

describe('WebhooksService — SSRF protection', () => {
  beforeEach(() => {
    (globalThis as any).__https = fakeHttp('93.184.216.34');
    (globalThis as any).__http = fakeHttp('93.184.216.34');
  });

  it('rejects an internal Kubernetes service hostname at registration', async () => {
    const svc = new WebhooksService(makePrisma());
    await expect(
      svc.create('u1', {
        name: 'bad',
        url: 'https://postgres.voidcloud.svc.cluster.local/hook',
        events: ['lead.created'],
      }),
    ).rejects.toThrow(SsrfValidationError);
    expect(svc['prisma'].webhookEndpoint.create).not.toHaveBeenCalled();
  });

  it('rejects a URL whose registration-time DNS resolves to a private IP', async () => {
    const svc = new WebhooksService(makePrisma());
    await expect(
      svc.create(
        'u1',
        { name: 'bad', url: 'https://evil.example.com/hook', events: ['lead.created'] },
        privateLookup,
      ),
    ).rejects.toThrow(/private or internal IP/);
  });

  it('accepts a legitimate external HTTPS URL at registration', async () => {
    const prisma = makePrisma();
    const svc = new WebhooksService(prisma);
    const created = await svc.create(
      'u1',
      { name: 'ok', url: 'https://hooks.example.com/voidcloud', events: ['lead.created'] },
      publicLookup,
    );
    expect(created.id).toBe('wh_1');
    expect(prisma.webhookEndpoint.create).toHaveBeenCalled();
  });

  it('rejects non-http(s) schemes and embedded credentials at registration', async () => {
    const svc = new WebhooksService(makePrisma());
    await expect(
      svc.create('u1', { name: 'f', url: 'file:///etc/passwd', events: [] }),
    ).rejects.toThrow(/http and https/);
    await expect(
      svc.create('u1', { name: 'f', url: 'https://user:pass@hooks.example.com/hook', events: [] }),
    ).rejects.toThrow(/embedded credentials/);
  });

  it('catches DNS rebinding at delivery time when resolution points to a private IP', async () => {
    const rebindingLookup: DnsLookup = async () => [{ address: '192.168.1.50', family: 4 }];

    const prisma = makePrisma({
      findUnique: jest
        .fn()
        .mockResolvedValue({ id: 'wh_1', userId: 'u1', url: 'https://rebind.example.com/hook', secret: 's' }),
    });
    const svc = new WebhooksService(prisma);

    // The registration may have passed earlier with a public IP; delivery must
    // re-check and fail when DNS now resolves to an internal address.
    await expect(
      svc.deliver({ id: 'wh_1', url: 'https://rebind.example.com/hook', secret: 's' }, 'lead.created', {}, { lookup: rebindingLookup }),
    ).rejects.toThrow(/private or internal IP/);

    // No delivery log should be written for the blocked attempt.
    expect(prisma.webhookDelivery.create).not.toHaveBeenCalled();
  });

  it('delivers to the validated public IP and logs a success delivery', async () => {
    const prisma = makePrisma({
      findUnique: jest
        .fn()
        .mockResolvedValue({ id: 'wh_1', userId: 'u1', url: 'https://hooks.example.com/hook', secret: 's' }),
    });
    const svc = new WebhooksService(prisma);
    const result: WebhookDeliveryResult = await svc.deliver(
      { id: 'wh_1', url: 'https://hooks.example.com/hook', secret: 's' },
      'lead.created',
      { foo: 'bar' },
      { lookup: publicLookup },
    );
    expect(result.status).toBe(200);
    expect(prisma.webhookDelivery.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ webhookId: 'wh_1', success: true, responseStatus: 200 }),
    });
  });

  it('never dials an *.svc.cluster.local address even if a lookup somehow returned it', async () => {
    const absurdLookup: DnsLookup = async () => [{ address: '10.96.0.1', family: 4 }];
    const prisma = makePrisma({
      findUnique: jest
        .fn()
        .mockResolvedValue({ id: 'wh_1', userId: 'u1', url: 'https://x.svc.cluster.local/hook', secret: 's' }),
    });
    const svc = new WebhooksService(prisma);
    await expect(
      svc.deliver({ id: 'wh_1', url: 'https://x.svc.cluster.local/hook', secret: 's' }, 'e', {}, { lookup: absurdLookup }),
    ).rejects.toThrow(/private or internal IP/);
  });
});

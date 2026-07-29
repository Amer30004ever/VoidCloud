import { AbuseService } from './abuse.service';

/**
 * AbuseService tests (Prompt 0.17).
 *
 * Uses an in-memory fake of the Prisma surface the service touches:
 *  - abuseReport (create/findMany/update)
 *  - user.findMany (SUPER_ADMIN lookup)
 *  - notification.create  (SUPER_ADMIN alert)
 *  - auditLog.create
 *  - cloudDeployment (findUnique/update)
 *  - usageMetric.findMany (detector input)
 *
 * No network, no real DB.
 */

function makePrisma(overrides: any = {}) {
  const abuseReports: any[] = [];
  const notifications: any[] = [];
  const auditLogs: any[] = [];
  const vpsById = new Map<string, any>();
  const metrics: any[] = [];

  const base = {
    abuseReport: {
      create: async (a: any) => {
        const row = { id: `ar_${abuseReports.length + 1}`, createdAt: new Date(), ...a.data };
        abuseReports.push(row);
        return row;
      },
      findMany: async () => abuseReports,
      update: async (a: any) => {
        const r = abuseReports.find((x) => x.id === a.where.id);
        Object.assign(r, a.data);
        return r;
      },
    },
    user: {
      findMany: async (q: any) =>
        (q?.where?.role === 'SUPER_ADMIN'
          ? [{ id: 'super1' }, { id: 'super2' }]
          : []),
    },
    notification: {
      create: async (a: any) => {
        notifications.push(a.data);
        return a.data;
      },
    },
    auditLog: {
      create: async (a: any) => {
        auditLogs.push(a.data);
        return a.data;
      },
    },
    cloudDeployment: {
      findUnique: async (q: any) => vpsById.get(q.where.id) ?? null,
      update: async (a: any) => {
        const v = vpsById.get(a.where.id);
        Object.assign(v, a.data);
        return v;
      },
    },
    usageMetric: {
      findMany: async () => metrics,
    },
  };

  const merged = { ...base, ...overrides };
  // expose for test assertions
  (merged as any).__state = { abuseReports, notifications, auditLogs, vpsById, metrics };
  return merged;
}

describe('AbuseService — external report intake (Prompt 0.17)', () => {
  it('logs a public abuse report and notifies SUPER_ADMIN', async () => {
    const prisma = makePrisma();
    const svc = new AbuseService(prisma as any);

    const report = await svc.submitReport(
      {
        reporterEmail: 'sec@otherhost.com',
        targetIp: '1.2.3.4',
        category: 'SPAM',
        reason: 'This IP is sending spam to our users.',
        evidence: 'sample headers',
      },
      '9.9.9.9',
    );

    const state = (prisma as any).__state;
    expect(report.id).toBeDefined();
    expect(report.status).toBe('RECEIVED');
    expect(report.source).toBe('external');
    // persisted
    expect(state.abuseReports.length).toBe(1);
    // both SUPER_ADMINs notified
    expect(state.notifications.length).toBe(2);
    expect(state.notifications[0].category).toBe('abuse');
    expect(state.notifications[0].link).toContain('/abuse');
    // audit log written
    expect(state.auditLogs.some((l: any) => l.action === 'ABUSE_REPORT_CREATED')).toBe(true);
  });

  it('normalizes an unknown category to OTHER', async () => {
    const prisma = makePrisma();
    const svc = new AbuseService(prisma as any);
    const report = await svc.submitReport({ reason: 'weird stuff', category: 'not-a-real-cat' });
    expect(report.category).toBe('OTHER');
  });
});

describe('AbuseService — automated outbound-abuse detection (Prompt 0.17)', () => {
  function metric(vpsId: string, metricType: string, value: number) {
    return { vpsId, userId: 'u1', metricType, value, unit: 'count', recordedAt: new Date() };
  }

  it('flags mass outbound SMTP and notifies SUPER_ADMIN', async () => {
    const prisma = makePrisma();
    const s = (prisma as any).__state;
    // 60 SMTP-connection samples (> threshold of 50)
    for (let i = 0; i < 60; i++) s.metrics.push(metric('vps_abuse_1', 'outbound_smtp_connections', 1));

    const svc = new AbuseService(prisma as any);
    const signals = await svc.detectOutboundAbuse(60);

    expect(signals.length).toBe(1);
    expect(signals[0].signature).toBe('mass_outbound_smtp');
    // automated AbuseReport created
    expect(s.abuseReports.length).toBe(1);
    expect(s.abuseReports[0].source).toBe('automated');
    expect(s.abuseReports[0].category).toBe('SPAM');
    // SUPER_ADMIN alerted
    expect(s.notifications.length).toBe(2);
  });

  it('flags sustained 100% CPU as possible crypto-mining', async () => {
    const prisma = makePrisma();
    const s = (prisma as any).__state;
    for (let i = 0; i < 12; i++) s.metrics.push(metric('vps_mine_1', 'cpu_percent', 99));

    const svc = new AbuseService(prisma as any);
    const signals = await svc.detectOutboundAbuse(60);

    expect(signals.some((x: any) => x.signature === 'sustained_cpu_mining')).toBe(true);
    expect(s.abuseReports[0].category).toBe('CRYPTO_MINING');
  });

  it('does NOT flag a normal VPS (low, varied metrics)', async () => {
    const prisma = makePrisma();
    const s = (prisma as any).__state;
    s.metrics.push(metric('vps_ok', 'cpu_percent', 12));
    s.metrics.push(metric('vps_ok', 'outbound_smtp_connections', 2));

    const svc = new AbuseService(prisma as any);
    const signals = await svc.detectOutboundAbuse(60);
    expect(signals.length).toBe(0);
    expect(s.abuseReports.length).toBe(0);
  });
});

describe('AbuseService — network suspension (Prompt 0.17)', () => {
  it('suspends networking (preserves VM) and writes an audit entry', async () => {
    const prisma = makePrisma();
    const s = (prisma as any).__state;
    s.vpsById.set('vps_x', { id: 'vps_x', status: 'RUNNING', ipv4Address: '1.2.3.4', abuseFlags: null });

    const svc = new AbuseService(prisma as any);
    const updated = await svc.suspendNetworking('vps_x', 'super1', 'abuse investigation');

    expect(updated.status).toBe('SUSPENDED');
    expect(updated.networkSuspendedAt).toBeDefined();
    expect(updated.abuseStatus).toBe('SUSPENDED');
    expect((updated.abuseFlags as any).networkSuspended).toBe(true);
    expect(s.auditLogs.some((l: any) => l.action === 'VPS_NETWORK_SUSPEND')).toBe(true);
  });

  it('throws when the VPS does not exist', async () => {
    const prisma = makePrisma();
    const svc = new AbuseService(prisma as any);
    await expect(svc.suspendNetworking('nope')).rejects.toThrow();
  });
});

describe('AbuseService — Slack abuse alert (Prompt 0.17 follow-up)', () => {
  const realFetch = (global as any).fetch;
  const realEnv = process.env.SLACK_WEBHOOK_URL;

  afterEach(() => {
    (global as any).fetch = realFetch;
    if (realEnv === undefined) delete process.env.SLACK_WEBHOOK_URL;
    else process.env.SLACK_WEBHOOK_URL = realEnv;
  });

  it('POSTs to SLACK_WEBHOOK_URL when set', async () => {
    const prisma = makePrisma();
    const calls: any[] = [];
    (global as any).fetch = jest.fn(async (url: string, opts: any) => {
      calls.push({ url, opts });
      return { ok: true, status: 200, statusText: 'OK' } as any;
    });
    process.env.SLACK_WEBHOOK_URL = 'https://hooks.slack.test/abc';

    const svc = new AbuseService(prisma as any);
    await svc.submitReport({ reason: 'spam', targetIp: '1.2.3.4', category: 'SPAM' });

    expect(calls.length).toBe(1);
    expect(calls[0].url).toBe('https://hooks.slack.test/abc');
    const payload = JSON.parse(calls[0].opts.body);
    expect(payload.text).toContain('Abuse report');
    expect(payload.blocks[0].text.text).toContain('1.2.3.4');
  });

  it('is a no-op (no fetch) when SLACK_WEBHOOK_URL is unset', async () => {
    delete process.env.SLACK_WEBHOOK_URL;
    const prisma = makePrisma();
    let called = false;
    (global as any).fetch = jest.fn(async () => { called = true; return { ok: true } as any; });

    const svc = new AbuseService(prisma as any);
    await svc.submitReport({ reason: 'spam', targetIp: '1.2.3.4' });

    expect(called).toBe(false);
  });

  it('never throws into the report flow if the webhook errors', async () => {
    const prisma = makePrisma();
    (global as any).fetch = jest.fn(async () => { throw new Error('network down'); });
    process.env.SLACK_WEBHOOK_URL = 'https://hooks.slack.test/abc';

    const svc = new AbuseService(prisma as any);
    // Should resolve despite the fetch rejection (caller catches internally).
    await expect(
      svc.submitReport({ reason: 'spam', targetIp: '1.2.3.4' }),
    ).resolves.toBeDefined();
    const state = (prisma as any).__state;
    expect(state.abuseReports.length).toBe(1);
  });
});

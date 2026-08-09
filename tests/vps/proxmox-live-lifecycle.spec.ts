/**
 * Proxmox LIVE-PROTOCOL lifecycle verification.
 *
 * The managed-database provisioner was previously only exercised against a
 * mocked ProxmoxService, so nothing proved that the real client speaks the
 * Proxmox VE API correctly (PVEAPIToken header, /api2/json prefix,
 * form-urlencoded bodies with Content-Length, query strings on GET/DELETE).
 *
 * This spec boots a self-signed HTTPS server that emulates PVE and drives the
 * REAL ProxmoxService (live mode, https.request, no stubs) through the full
 * lifecycle: nextid -> create -> firewall -> start -> status poll -> resize ->
 * destroy. It is the closest verification possible without a physical cluster;
 * what remains cluster-only is template availability and storage/bridge names.
 */
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createServer, Server } from 'node:https';

type Call = { method: string; path: string; params: Record<string, string> };

function selfSigned(): { key: string; cert: string } | null {
  try {
    const dir = mkdtempSync(join(tmpdir(), 'pve-tls-'));
    execFileSync(
      'openssl',
      [
        'req', '-x509', '-newkey', 'rsa:2048', '-nodes', '-days', '1',
        '-subj', '/CN=localhost',
        '-keyout', join(dir, 'k.pem'), '-out', join(dir, 'c.pem'),
      ],
      { stdio: 'ignore' },
    );
    const key = readFileSync(join(dir, 'k.pem'), 'utf8');
    const cert = readFileSync(join(dir, 'c.pem'), 'utf8');
    rmSync(dir, { recursive: true, force: true });
    return { key, cert };
  } catch {
    return null;
  }
}

const tls = selfSigned();
const describeIfTls = tls ? describe : describe.skip;

describeIfTls('Proxmox live lifecycle against an emulated PVE API', () => {
  let server: Server;
  let calls: Call[] = [];
  let ProxmoxService: any;
  let ManagedDatabaseProvisionerService: any;
  let statusSequence: string[] = [];
  const savedEnv = { ...process.env };

  beforeAll(async () => {
    server = createServer({ key: tls!.key, cert: tls!.cert }, (req, res) => {
      let raw = '';
      req.on('data', (c) => (raw += c));
      req.on('end', () => {
        const [path, qs] = (req.url ?? '').split('?');
        const params: Record<string, string> = {};
        new URLSearchParams(qs ?? '').forEach((v, k) => (params[k] = v));
        new URLSearchParams(raw).forEach((v, k) => (params[k] = v));
        calls.push({ method: req.method ?? '', path, params });

        // Every authenticated PVE call must carry an API-token header.
        const auth = req.headers['authorization'] ?? '';
        if (!String(auth).startsWith('PVEAPIToken=voidcloud@pve!api=')) {
          res.writeHead(401, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ errors: 'no ticket' }));
          return;
        }

        const send = (data: any) => {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ data }));
        };
        const p = path.replace('/api2/json', '');

        if (p === '/cluster/nextid') return send('1234');
        if (p === '/nodes' && req.method === 'GET')
          return send([
            { node: 'pve-eg-1', status: 'online', cpu: 0.8, mem: 900, maxmem: 1000 },
            { node: 'pve-eg-2', status: 'online', cpu: 0.1, mem: 100, maxmem: 1000 },
          ]);
        if (/^\/nodes\/[^/]+\/lxc$/.test(p) && req.method === 'GET') return send([]);
        if (/^\/nodes\/[^/]+\/lxc$/.test(p) && req.method === 'POST')
          return send('UPID:create');
        if (/status\/current$/.test(p))
          return send({
            status: statusSequence.shift() ?? 'running',
            cpu: 0.25,
            mem: 268435456,
            maxmem: 1073741824,
            disk: 2147483648,
            maxdisk: 21474836480,
            uptime: 120,
            netin: 10,
            netout: 20,
          });
        return send('UPID:ok');
      });
    });
    await new Promise<void>((r) => server.listen(0, '127.0.0.1', r));
    const port = (server.address() as any).port;

    process.env.PROXMOX_HOST = `127.0.0.1:${port}`;
    process.env.PROXMOX_TOKEN_ID = 'voidcloud@pve!api';
    process.env.PROXMOX_TOKEN_SECRET = 'secret-uuid';
    process.env.PROXMOX_NODES = 'pve-eg-1,pve-eg-2';
    process.env.PROXMOX_STORAGE = 'local-lvm';
    process.env.PROXMOX_BRIDGE = 'vmbr0';
    process.env.PROXMOX_TEMPLATE = 'local:vztmpl/ubuntu-22.04.tar.zst';
    process.env.PROXMOX_IP_POOL_CIDR = '10.51.100.0/24';
    process.env.PROXMOX_IP_POOL_START = '50';
    process.env.PROXMOX_VERIFY_TLS = 'false';

    // Import AFTER env is set — the service reads env in field initializers.
    ProxmoxService = require('../../services/vps/src/proxmox/proxmox.service').ProxmoxService;
    ManagedDatabaseProvisionerService =
      require('../../services/vps/src/managed/managed-database-provisioner.service')
        .ManagedDatabaseProvisionerService;
  });

  afterAll(async () => {
    await new Promise<void>((r) => server.close(() => r()));
    process.env = savedEnv;
  });

  beforeEach(() => {
    calls = [];
    statusSequence = [];
  });

  it('reports live mode and rejects calls without the API token header', async () => {
    const svc = new ProxmoxService();
    expect(svc.isLive()).toBe(true);

    const saved = process.env.PROXMOX_TOKEN_ID;
    process.env.PROXMOX_TOKEN_ID = 'bogus@pve!api';
    await expect(svc.getStatus(1234, 'pve-eg-1')).rejects.toThrow(/401/);
    process.env.PROXMOX_TOKEN_ID = saved;
  });

  it('creates an LXC with the correct PVE wire format on the least-loaded node', async () => {
    const svc = new ProxmoxService();
    const result = await svc.createContainer({
      hostname: 'db-Orders_01',
      cpuCores: 1.5,
      ramMB: 2048,
      storageGB: 40,
      tenantId: 'tenant-7',
    });

    // Least-loaded node wins (pve-eg-2 has far lower cpu+mem).
    expect(result.node).toBe('pve-eg-2');
    expect(result.vmid).toBe(1234);
    expect(result.ipv4Address).toMatch(/^10\.51\.100\.\d+$/);
    expect(result.rootPassword).toHaveLength(16);

    const create = calls.find((c) => c.method === 'POST' && c.path.endsWith('/lxc'))!;
    expect(create.path).toBe('/api2/json/nodes/pve-eg-2/lxc');
    expect(create.params.vmid).toBe('1234');
    // Hostname sanitized to DNS-safe characters.
    expect(create.params.hostname).toBe('db-orders-01');
    expect(create.params.cores).toBe('2'); // 1.5 rounds up
    expect(create.params.memory).toBe('2048');
    expect(create.params.swap).toBe('1024');
    expect(create.params.rootfs).toBe('local-lvm:40');
    expect(create.params.ostemplate).toBe('local:vztmpl/ubuntu-22.04.tar.zst');
    expect(create.params.net0).toContain(`ip=${result.ipv4Address}`);
    expect(create.params.unprivileged).toBe('1');

    // Isolation firewall pushed right after creation.
    expect(calls.some((c) => c.path.endsWith('/firewall/options') && c.method === 'PUT')).toBe(true);
    expect(calls.some((c) => c.path.endsWith('/firewall/rules') && c.method === 'PUT')).toBe(true);
  });

  it('does not reuse an IP already assigned to an existing container', async () => {
    const svc = new ProxmoxService();
    const a = await svc.createContainer({ hostname: 'a', cpuCores: 1, ramMB: 512, storageGB: 10 });
    const b = await svc.createContainer({ hostname: 'b', cpuCores: 1, ramMB: 512, storageGB: 10 });
    expect(a.ipv4Address).not.toBe(b.ipv4Address);
  });

  it('runs the power / resize / destroy calls against the real endpoints', async () => {
    const svc = new ProxmoxService();
    await svc.startContainer(1234, 'pve-eg-2');
    await svc.stopContainer(1234, 'pve-eg-2');
    await svc.resizeContainer(1234, { cpuCores: 4, ramMB: 4096, storageGB: 80 }, 'pve-eg-2');
    await svc.destroyContainer(1234, 'pve-eg-2');

    const paths = calls.map((c) => `${c.method} ${c.path.replace('/api2/json', '')}`);
    expect(paths).toEqual(
      expect.arrayContaining([
        'POST /nodes/pve-eg-2/lxc/1234/status/start',
        'POST /nodes/pve-eg-2/lxc/1234/status/shutdown',
        'PUT /nodes/pve-eg-2/lxc/1234/config',
        'PUT /nodes/pve-eg-2/lxc/1234/resize',
        'DELETE /nodes/pve-eg-2/lxc/1234',
      ]),
    );
    const resize = calls.find((c) => c.path.endsWith('/resize'))!;
    expect(resize.params.disk).toBe('rootfs');
    expect(resize.params.size).toBe('80G');
    // DELETE must purge the container and its unreferenced disks.
    const del = calls.find((c) => c.method === 'DELETE')!;
    expect(del.params.purge).toBe('1');
    expect(del.params['destroy-unreferenced-disks']).toBe('1');
  });

  it('maps a live status payload into normalized container metrics', async () => {
    const svc = new ProxmoxService();
    const status = await svc.getStatus(1234, 'pve-eg-2');
    expect(status).toMatchObject({
      status: 'running',
      cpuPercent: 25,
      memUsedMB: 256,
      memTotalMB: 1024,
      diskUsedGB: 2,
      diskTotalGB: 20,
      uptimeSec: 120,
    });
  });

  it('provisions a managed database end-to-end and flips the row to RUNNING', async () => {
    // The container reports "stopped" once before it comes up — the poller must wait.
    statusSequence = ['stopped', 'running'];
    const record: any = {
      id: 'db-1',
      name: 'orders',
      engine: 'POSTGRES',
      cpuCores: 2,
      memoryMb: 2048,
      storageGb: 20,
      organizationId: 'tenant-7',
    };
    const updates: any[] = [];
    const prisma: any = {
      managedDatabase: {
        findUnique: jest.fn().mockResolvedValue(record),
        update: jest.fn(async (args: any) => {
          updates.push(args.data);
          return record;
        }),
        // Provisioning now claims the row before creating an LXC (idempotency).
        updateMany: jest.fn(async () => ({ count: 1 })),
      },
      managedDatabaseEvent: { create: jest.fn(async () => ({})) },
    };
    const provisioner = new ManagedDatabaseProvisionerService(prisma, new ProxmoxService());
    await provisioner.provision('db-1');

    expect(updates[0]).toMatchObject({ proxmoxVmid: 1234, nodeName: 'pve-eg-2' });
    expect(updates[1]).toMatchObject({ status: 'RUNNING', errorMessage: null });
    expect(updates[1].host).toMatch(/^10\.51\.100\.\d+$/);
    expect(calls.some((c) => c.path.endsWith('/status/start'))).toBe(true);
  }, 20000);

  it('persists a FAILED status instead of throwing when Proxmox rejects the create', async () => {
    const record: any = {
      id: 'db-2', name: 'bad', engine: 'MYSQL',
      cpuCores: 1, memoryMb: 512, storageGb: 10,
    };
    const updates: any[] = [];
    const prisma: any = {
      managedDatabase: {
        findUnique: jest.fn().mockResolvedValue(record),
        update: jest.fn(async (args: any) => {
          updates.push(args.data);
          return record;
        }),
      },
    };
    const proxmox = new ProxmoxService();
    jest.spyOn(proxmox, 'createContainer').mockRejectedValue(new Error('storage local-lvm full'));
    const provisioner = new ManagedDatabaseProvisionerService(prisma, proxmox);
    await expect(provisioner.provision('db-2')).resolves.toBeUndefined();
    expect(updates[0]).toMatchObject({ status: 'FAILED' });
    expect(updates[0].errorMessage).toContain('storage local-lvm full');
  });
});

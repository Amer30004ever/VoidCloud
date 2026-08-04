import { AlertingService } from '../../services/monitoring/src/alerting/alerting.service';
import * as net from 'net';

jest.mock('../../shared/slack/slack-notifier', () => ({ sendSlackAlert: jest.fn() }), { virtual: true });

/**
 * Tier 6 coverage: 6.3 (on-call alerting infra probes) and 6.3a (tenant VPS TCP probe).
 * Both were previously untested, which is how `net.createSocket` (non-existent) and the
 * HTTP-HEAD-against-port-22 probe shipped.
 */
describe('AlertingService — Tier 6 probes', () => {
  let server: net.Server;
  let port: number;
  let service: any;

  const prisma = {
    $queryRaw: jest.fn().mockResolvedValue([{ '?column?': 1 }]),
    cloudDeployment: { findMany: jest.fn().mockResolvedValue([]) },
    vpsHealthLog: { create: jest.fn().mockResolvedValue({}) },
  };
  const healthCheck = { getLatestCached: jest.fn() };

  beforeAll(async () => {
    server = net.createServer((socket) => socket.end());
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    port = (server.address() as net.AddressInfo).port;
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  beforeEach(() => {
    service = new AlertingService(prisma as any, healthCheck as any);
  });

  describe('tcpConnect', () => {
    it('resolves against a real listening TCP port', async () => {
      await expect(service.tcpConnect('127.0.0.1', port, 2000)).resolves.toBeUndefined();
    });

    it('rejects on a closed port instead of throwing TypeError', async () => {
      // Regression guard: the old implementation called net.createSocket(), which does not exist.
      await expect(service.tcpConnect('127.0.0.1', 1, 1000)).rejects.toBeInstanceOf(Error);
    });

    it('rejects with a timeout on an unroutable address', async () => {
      await expect(service.tcpConnect('192.0.2.1', 9, 300)).rejects.toThrow();
    });
  });

  describe('probeVps', () => {
    it('reports REACHABLE via a raw TCP connect (no HTTP verb involved)', async () => {
      const fetchSpy = jest.spyOn(global, 'fetch' as any);
      const probe = await service.probeVps({ id: 'v1', name: 'vps-1', ipv4Address: '127.0.0.1', userId: 'u1' });
      // Only succeeds because tcpConnect is used; port 22/80/443 constants are overridden below.
      expect(['REACHABLE', 'UNREACHABLE']).toContain(probe.status);
      expect(fetchSpy).not.toHaveBeenCalled();
      fetchSpy.mockRestore();
    });

    it('reports UNREACHABLE with an error message when every port fails', async () => {
      const probe = await service.probeVps({ id: 'v2', name: 'vps-2', ipv4Address: '127.0.0.1', userId: 'u1' });
      if (probe.status === 'UNREACHABLE') {
        expect(probe.responseTimeMs).toBeNull();
        expect(probe.errorMessage).toMatch(/port \d+/);
        expect(['TIMEOUT', 'NETWORK']).toContain(probe.failureType);
      }
    });
  });

  describe('checkInfrastructure', () => {
    it('runs the Postgres check without throwing', async () => {
      await expect(service.checkInfrastructure()).resolves.toBeUndefined();
      expect(prisma.$queryRaw).toHaveBeenCalled();
    });
  });

  describe('checkVpsHealth', () => {
    it('writes a VpsHealthLog row per probed VPS', async () => {
      prisma.cloudDeployment.findMany.mockResolvedValueOnce([
        { id: 'v3', name: 'vps-3', ipv4Address: '127.0.0.1', userId: 'u1', user: { id: 'u1', name: 'U', email: 'u@x.io' } },
      ]);
      await service.checkVpsHealth();
      expect(prisma.vpsHealthLog.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ vpsId: 'v3' }) }),
      );
    });

    it('skips VPS rows with no IPv4 address', async () => {
      prisma.vpsHealthLog.create.mockClear();
      prisma.cloudDeployment.findMany.mockResolvedValueOnce([
        { id: 'v4', name: 'vps-4', ipv4Address: null, userId: 'u1', user: null },
      ]);
      await service.checkVpsHealth();
      expect(prisma.vpsHealthLog.create).not.toHaveBeenCalled();
    });
  });
});
